import OpenAI from "openai"
import { OPENCLAW_CONFIG } from "./openclaw/config"
import { currentUser, getMyAppointments, getMyClaims, getMyPrescriptions, getMyMessages } from "./current-user"
import { physicians, priorAuths } from "./seed-data"

// ── OpenAI Client ────────────────────────────────────────
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

// ── Agent Action Log (in-memory, production would use DB) ─
export interface AgentAction {
  id: string
  agentId: string
  agentName: string
  action: string
  detail: string
  timestamp: string
  channel: string
}

const actionLog: AgentAction[] = []

export function logAction(agentId: string, action: string, detail: string, channel = "system") {
  const agent = OPENCLAW_CONFIG.agents.find((a) => a.id === agentId)
  const entry: AgentAction = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    agentId,
    agentName: agent?.name || agentId,
    action,
    detail,
    timestamp: new Date().toISOString(),
    channel,
  }
  actionLog.unshift(entry)
  if (actionLog.length > 50) actionLog.pop()
  return entry
}

export function getRecentActions(limit = 10): AgentAction[] {
  return actionLog.slice(0, limit)
}

// ── Conversation Memory (per-agent sessions) ─────────────
interface ConversationMessage {
  role: "system" | "user" | "assistant"
  content: string
}

const conversations = new Map<string, ConversationMessage[]>()

function getConversation(sessionKey: string): ConversationMessage[] {
  if (!conversations.has(sessionKey)) {
    conversations.set(sessionKey, [])
  }
  return conversations.get(sessionKey)!
}

function addToConversation(sessionKey: string, role: "user" | "assistant", content: string) {
  const conv = getConversation(sessionKey)
  conv.push({ role, content })
  // Keep last 20 messages to avoid token overflow
  if (conv.length > 20) {
    conversations.set(sessionKey, conv.slice(-20))
  }
}

// ── Patient Context Builder ──────────────────────────────
function getPatientContext(): string {
  const myApts = getMyAppointments()
  const myClaims = getMyClaims()
  const myRx = getMyPrescriptions()
  const myMsgs = getMyMessages()
  const myPA = priorAuths.filter((p) => p.patient_id === currentUser.id)
  const myPhysician = physicians.find((p) => p.id === currentUser.primary_physician_id)

  return `
CURRENT PATIENT DATA (use this to give specific, personalized answers):

Patient: ${currentUser.full_name}
DOB: ${currentUser.date_of_birth} | Gender: ${currentUser.gender}
Insurance: ${currentUser.insurance_provider} ${currentUser.insurance_plan} (${currentUser.insurance_id})
PCP: ${myPhysician?.full_name || "Not assigned"} (${myPhysician?.specialty || ""})
Allergies: ${currentUser.allergies.join(", ") || "None"}
Medical History: ${currentUser.medical_history.map((h) => `${h.condition} (${h.status})`).join(", ")}

Active Medications (${myRx.filter((r) => r.status === "active").length}):
${myRx.filter((r) => r.status === "active").map((r) => `- ${r.medication_name} ${r.dosage}, ${r.frequency} (adherence: ${r.adherence_pct}%, refills: ${r.refills_remaining}, pharmacy: ${r.pharmacy})`).join("\n")}

Upcoming Appointments (${myApts.filter((a) => new Date(a.scheduled_at) > new Date()).length}):
${myApts.filter((a) => new Date(a.scheduled_at) > new Date()).slice(0, 5).map((a) => {
  const doc = physicians.find((p) => p.id === a.physician_id)
  return `- ${new Date(a.scheduled_at).toLocaleDateString()} ${new Date(a.scheduled_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} — ${doc?.full_name} — ${a.reason} (copay: $${a.copay})`
}).join("\n")}

Recent Claims (${myClaims.length}):
${myClaims.slice(0, 5).map((c) => `- ${c.claim_number}: $${c.total_amount} — ${c.status}${c.denial_reason ? ` (denied: ${c.denial_reason})` : ""}`).join("\n")}

Prior Authorizations (${myPA.length}):
${myPA.map((p) => `- ${p.procedure_name}: ${p.status}${p.denial_reason ? ` (denied: ${p.denial_reason})` : ""}`).join("\n")}

Unread Messages: ${myMsgs.filter((m) => !m.read).length}
`.trim()
}

// ── Core Agent Engine ────────────────────────────────────
export async function runAgent(params: {
  agentId: string
  message: string
  sessionId?: string
}): Promise<{ response: string; agentId: string; handoff?: string }> {
  const { agentId, message, sessionId } = params
  const agent = OPENCLAW_CONFIG.agents.find((a) => a.id === agentId)

  if (!agent) {
    return { response: "Unknown agent.", agentId }
  }

  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    return { response: getFallbackResponse(agentId, message), agentId }
  }

  const sessionKey = sessionId || `${agentId}-default`
  const patientContext = getPatientContext()

  // Build system prompt with patient context
  const systemPrompt = `${agent.systemPrompt}

${patientContext}

IMPORTANT RULES:
- You ARE ${agent.name}. Stay in character.
- Use the patient data above to give SPECIFIC answers (reference their actual meds, appointments, claims by name).
- Be concise — most responses should be 2-4 sentences unless the user asks for detail.
- If you need to hand off to another agent, end your message with [HANDOFF:agentId] (e.g., [HANDOFF:scheduling]).
- Available agents to hand off to: ${(agent.canMessage as readonly string[]).join(", ")}
- Never make up data that isn't in the patient context above.`

  const conv = getConversation(sessionKey)

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...conv,
        { role: "user", content: message },
      ],
      max_tokens: 500,
      temperature: 0.7,
    })

    let response = completion.choices[0]?.message?.content || "I couldn't process that. Could you try again?"

    // Check for handoff
    let handoff: string | undefined
    const handoffMatch = response.match(/\[HANDOFF:(\w[\w-]*)\]/)
    if (handoffMatch) {
      handoff = handoffMatch[1]
      response = response.replace(/\[HANDOFF:\w[\w-]*\]/, "").trim()
    }

    // Save to memory
    addToConversation(sessionKey, "user", message)
    addToConversation(sessionKey, "assistant", response)

    // Log the action
    logAction(agentId, "responded", `${message.slice(0, 60)}...`, "portal")

    return { response, agentId, handoff }
  } catch (error: any) {
    console.error(`Agent ${agentId} error:`, error?.message || error)

    if (error?.status === 401) {
      return { response: "API key is invalid. Please check your OpenAI API key in the environment variables.", agentId }
    }

    return { response: getFallbackResponse(agentId, message), agentId }
  }
}

// ── Coordinator with Real Routing ────────────────────────
export async function runCoordinator(message: string, sessionId?: string): Promise<{
  response: string
  agentId: string
  handoff?: string
}> {
  const result = await runAgent({
    agentId: "coordinator",
    message,
    sessionId,
  })

  // If coordinator hands off, run the target agent
  if (result.handoff) {
    const targetAgent = OPENCLAW_CONFIG.agents.find((a) => a.id === result.handoff)
    if (targetAgent) {
      logAction("coordinator", "routed", `→ ${targetAgent.name}: ${message.slice(0, 40)}...`)

      const followUp = await runAgent({
        agentId: result.handoff,
        message,
        sessionId: sessionId ? `${sessionId}-${result.handoff}` : undefined,
      })

      // Combine coordinator's intro with specialist's response
      return {
        response: `${result.response}\n\n---\n\n**${targetAgent.name}:** ${followUp.response}`,
        agentId: result.handoff,
        handoff: followUp.handoff,
      }
    }
  }

  return result
}

// ── Fallback Responses (when no API key) ─────────────────
function getFallbackResponse(agentId: string, message: string): string {
  const lowerMsg = message.toLowerCase()
  const agent = OPENCLAW_CONFIG.agents.find((a) => a.id === agentId)

  switch (agentId) {
    case "coordinator":
      if (lowerMsg.includes("appointment") || lowerMsg.includes("schedule") || lowerMsg.includes("book"))
        return `I'll route this to Cal (our scheduler). Let me check physician availability for your ${currentUser.insurance_provider} ${currentUser.insurance_plan} plan...`
      if (lowerMsg.includes("bill") || lowerMsg.includes("claim") || lowerMsg.includes("charge"))
        return `Connecting you with Vera (billing). She'll review your recent claims...`
      if (lowerMsg.includes("prescription") || lowerMsg.includes("refill") || lowerMsg.includes("medication"))
        return `Routing to Maya (Rx manager). She can see your active medications...`
      if (lowerMsg.includes("prior auth") || lowerMsg.includes("authorization"))
        return `Rex (PA specialist) is on it. He'll check your authorization status...`
      if (lowerMsg.includes("screening") || lowerMsg.includes("risk score"))
        return `Routing to Quinn (screening specialist). Quinn will prioritize your preventive risks and next steps.`
      if (lowerMsg.includes("second opinion") || lowerMsg.includes("review my diagnosis"))
        return `Connecting you with Orion (second-opinion specialist) for a structured plan review.`
      if (lowerMsg.includes("clinical trial") || lowerMsg.includes("trial match"))
        return `Lyra (clinical trials agent) will search recruiting studies that fit your profile.`
      if (lowerMsg.includes("pain") || lowerMsg.includes("fever") || lowerMsg.includes("symptom") || lowerMsg.includes("sick"))
        return `Routing to Nova (triage). Please describe your symptoms and she'll assess urgency...`
      return `Hey ${currentUser.full_name.split(" ")[0]}, I'm Atlas — your coordinator. I can help with appointments, medications, bills, screening, second opinions, clinical trials, prior auths, or symptoms. What do you need?`

    case "scheduling":
      return `I've checked your insurance (${currentUser.insurance_provider}) and found some openings. Would you like morning or afternoon?`

    case "billing":
      const denied = getMyClaims().filter((c) => c.status === "denied")
      return `I've reviewed your ${getMyClaims().length} claims. ${denied.length > 0 ? `Found ${denied.length} denied — I can draft appeals.` : "Everything looks clean."}`

    case "rx":
      const lowAdh = getMyPrescriptions().filter((r) => r.status === "active" && r.adherence_pct < 80)
      return `Your medication status:\n${getMyPrescriptions().filter((r) => r.status === "active").map((r) => `• ${r.medication_name} ${r.dosage} — ${r.adherence_pct}% adherence`).join("\n")}${lowAdh.length > 0 ? `\n\n⚠️ ${lowAdh.length} medication(s) below 80% adherence.` : ""}`

    case "prior-auth":
      return `Checking your prior auths... ${priorAuths.filter((p) => p.patient_id === currentUser.id).map((p) => `${p.procedure_name}: ${p.status}`).join(", ") || "No pending authorizations."}`

    case "triage":
      return `I'm Nova. Tell me what's going on — when did it start, severity 1-10, and any fever/chest pain/breathing difficulty? This helps me determine if you need immediate care.`

    case "onboarding":
      return `Hey! I'm Sage. Let's get your care team set up. Do you have a primary care physician?`

    case "wellness":
      return `Hi, I'm Ivy! Based on your profile, I'd love to check your preventive screening schedule. Want me to run your USPSTF recommendations?`

    case "screening":
      return `I'm Quinn, your screening specialist. I can run a preventive risk profile from your labs, vitals, and history, then prioritize the top actions.`

    case "second-opinion":
      return `I'm Orion. Share your diagnosis and care plan, and I'll prepare a structured second-opinion summary with key clinician questions.`

    case "trials":
      return `I'm Lyra. I can match you to recruiting clinical trials based on condition, age, and location, and explain likely fit.`

    case "devops":
      return `Bolt here. All systems operational. 20+ routes healthy, API latency nominal.`

    default:
      return `I'm ${agent?.name || "an AI agent"}. How can I help you today?`
  }
}
