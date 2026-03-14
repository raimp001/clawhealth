import OpenAI from "openai"
import { OPENCLAW_CONFIG } from "./openclaw/config"
import { getLiveSnapshotByWallet } from "./live-data.server"
import { PAYER_RULES, PA_FORM_FIELDS, buildAppealLetter } from "./mcp/pa-tools"

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
const MAX_CONVERSATION_SESSIONS = 300

function getConversation(sessionKey: string): ConversationMessage[] {
  if (!conversations.has(sessionKey)) {
    if (conversations.size >= MAX_CONVERSATION_SESSIONS) {
      const oldestKey = conversations.keys().next().value
      if (oldestKey) conversations.delete(oldestKey)
    }
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function createCompletionWithRetry(params: {
  model: string
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
  max_tokens: number
  temperature: number
}) {
  let lastError: unknown = null

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await openai.chat.completions.create(params, { timeout: 20000 })
    } catch (error) {
      lastError = error
      const status = typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status?: unknown }).status)
        : undefined
      const retryable = status === 408 || status === 429 || (typeof status === "number" && status >= 500)
      if (!retryable || attempt === 1) break
      await delay(350 * (attempt + 1))
    }
  }

  throw lastError
}

// ── Patient Context Builder ──────────────────────────────
async function getPatientContext(walletAddress?: string): Promise<string> {
  const snapshot = await getLiveSnapshotByWallet(walletAddress)
  if (!snapshot.patient) {
    return "CURRENT PATIENT DATA: No live patient profile found. Ask the user to connect a wallet and complete onboarding."
  }

  const patient = snapshot.patient
  const activeMedications = snapshot.prescriptions.filter((prescription) => prescription.status === "active")
  const upcomingAppointments = snapshot.appointments
    .filter((appointment) => new Date(appointment.scheduled_at).getTime() > Date.now())
    .slice(0, 5)
  const unreadCount = snapshot.messages.filter((message) => !message.read).length
  const pcp = snapshot.physicians.find((physician) => physician.id === patient.primary_physician_id)

  return `
CURRENT PATIENT DATA (use this to give specific, personalized answers):

Patient: ${patient.full_name}
DOB: ${patient.date_of_birth} | Gender: ${patient.gender}
Insurance: ${patient.insurance_provider} ${patient.insurance_plan} (${patient.insurance_id})
PCP: ${pcp?.full_name || "Not assigned"} (${pcp?.specialty || ""})
Allergies: ${patient.allergies.join(", ") || "None"}
Medical History: ${patient.medical_history.map((item) => `${item.condition} (${item.status})`).join(", ")}

Active Medications (${activeMedications.length}):
${activeMedications.map((medication) => `- ${medication.medication_name} ${medication.dosage}, ${medication.frequency}`).join("\n")}

Upcoming Appointments (${upcomingAppointments.length}):
${upcomingAppointments.map((appointment) => {
  const physician = snapshot.physicians.find((item) => item.id === appointment.physician_id)
  return `- ${new Date(appointment.scheduled_at).toLocaleDateString()} ${new Date(appointment.scheduled_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} — ${physician?.full_name || "Clinician"} — ${appointment.reason}`
}).join("\n")}

Recent Claims (${snapshot.claims.length}):
${snapshot.claims.slice(0, 5).map((claim) => `- ${claim.claim_number}: $${claim.total_amount} — ${claim.status}${claim.denial_reason ? ` (denied: ${claim.denial_reason})` : ""}`).join("\n")}

Prior Authorizations (${snapshot.priorAuths.length}):
${snapshot.priorAuths.map((auth) => `- ${auth.procedure_name}: ${auth.status}${auth.denial_reason ? ` (denied: ${auth.denial_reason})` : ""}`).join("\n")}

Unread Messages: ${unreadCount}
`.trim()
}

// ── PA MCP Tool Definitions (for function calling) ───────

const PA_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "check_pa_required",
      description: "Check if prior authorization is required for a CPT code and payer",
      parameters: {
        type: "object",
        properties: {
          cpt_code: { type: "string", description: "CPT or HCPCS code" },
          payer: { type: "string", description: "Insurance payer name" },
        },
        required: ["cpt_code", "payer"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_payer_criteria",
      description: "Get full PA criteria for a payer: step therapy, diagnosis codes, contacts",
      parameters: {
        type: "object",
        properties: {
          payer: { type: "string", description: "Insurance payer name" },
          cpt_code: { type: "string", description: "Optional CPT code filter" },
        },
        required: ["payer"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pa_form_fields",
      description: "Get required and optional fields for a PA form submission",
      parameters: {
        type: "object",
        properties: {
          required_only: { type: "boolean", description: "Return only required fields" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "submit_prior_auth",
      description: "Create and validate a PA submission with reference number",
      parameters: {
        type: "object",
        properties: {
          patient_name: { type: "string" },
          patient_member_id: { type: "string" },
          payer: { type: "string" },
          procedure_code: { type: "string" },
          procedure_name: { type: "string" },
          diagnosis_codes: { type: "array", items: { type: "string" } },
          ordering_provider_npi: { type: "string" },
          ordering_provider_name: { type: "string" },
          clinical_rationale: { type: "string" },
          prior_treatments: { type: "string" },
          urgency: { type: "string", enum: ["routine", "urgent", "emergent"] },
          service_start_date: { type: "string" },
        },
        required: [
          "patient_name", "patient_member_id", "payer", "procedure_code",
          "procedure_name", "diagnosis_codes", "ordering_provider_npi",
          "ordering_provider_name", "clinical_rationale",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_pa_status",
      description: "Check PA status by reference number or patient name",
      parameters: {
        type: "object",
        properties: {
          reference_number: { type: "string" },
          patient_name: { type: "string" },
          procedure_code: { type: "string" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_appeal",
      description: "Draft a formal PA denial appeal letter",
      parameters: {
        type: "object",
        properties: {
          patient_name: { type: "string" },
          payer: { type: "string" },
          reference_number: { type: "string" },
          procedure_name: { type: "string" },
          procedure_code: { type: "string" },
          denial_reason: { type: "string" },
          diagnosis_codes: { type: "array", items: { type: "string" } },
          physician_name: { type: "string" },
          clinical_evidence: { type: "string" },
        },
        required: [
          "patient_name", "payer", "reference_number", "procedure_name",
          "procedure_code", "denial_reason", "diagnosis_codes",
          "physician_name", "clinical_evidence",
        ],
      },
    },
  },
]

// Execute a PA tool call locally (same logic as MCP server)
function executePaTool(name: string, args: Record<string, unknown>): string {
  try {
    if (name === "check_pa_required") {
      const { cpt_code, payer } = args as { cpt_code: string; payer: string }
      const normalized = payer.toLowerCase()
      const rule = PAYER_RULES.find(
        (r) => r.payer.toLowerCase().includes(normalized) || normalized.includes(r.payer.toLowerCase())
      )
      if (!rule) return JSON.stringify({ requires_pa: true, message: `No rule for "${payer}". Assume PA required.` })
      const matched = rule.cptCodes.includes(cpt_code)
      return JSON.stringify({
        payer: rule.payer, cpt_code, requires_pa: matched ? rule.requires_pa : false,
        turnaround_days: rule.turnaround_days,
        expedited_turnaround_hours: rule.expedited_turnaround_hours,
        portal_url: rule.portal_url, phone: rule.phone,
      })
    }

    if (name === "lookup_payer_criteria") {
      const { payer, cpt_code } = args as { payer: string; cpt_code?: string }
      const rule = PAYER_RULES.find((r) => r.payer.toLowerCase().includes(payer.toLowerCase()))
      if (!rule) return JSON.stringify({ error: `No criteria for "${payer}"`, available_payers: PAYER_RULES.map((r) => r.payer) })
      return JSON.stringify({
        payer: rule.payer,
        covered_codes: cpt_code ? rule.cptCodes.filter((c) => c === cpt_code) : rule.cptCodes,
        criteria_summary: rule.criteria_summary,
        step_therapy: rule.step_therapy ?? [],
        diagnosis_required: rule.diagnosis_required ?? [],
        quantity_limit: rule.quantity_limit ?? null,
        turnaround: { standard_days: rule.turnaround_days, expedited_hours: rule.expedited_turnaround_hours },
        contacts: { portal_url: rule.portal_url, phone: rule.phone, fax: rule.fax },
      })
    }

    if (name === "get_pa_form_fields") {
      const { required_only } = args as { required_only?: boolean }
      const fields = required_only ? PA_FORM_FIELDS.filter((f) => f.required) : PA_FORM_FIELDS
      return JSON.stringify({ total_fields: fields.length, fields })
    }

    if (name === "submit_prior_auth") {
      const a = args as {
        patient_name: string; patient_member_id: string; payer: string
        procedure_code: string; procedure_name: string; diagnosis_codes: string[]
        ordering_provider_npi: string; ordering_provider_name: string
        clinical_rationale: string; prior_treatments?: string
        urgency?: string; service_start_date?: string
      }
      const rule = PAYER_RULES.find((r) => r.payer.toLowerCase().includes(a.payer.toLowerCase()))
      const warnings: string[] = []
      if (rule?.step_therapy?.length && !a.prior_treatments)
        warnings.push(`${rule.payer} requires step therapy documentation.`)
      const refNumber = `PA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
      return JSON.stringify({
        reference_number: refNumber, status: "submitted",
        submitted_at: new Date().toISOString(),
        payer: a.payer, patient_name: a.patient_name,
        procedure_code: a.procedure_code, procedure_name: a.procedure_name,
        urgency: a.urgency ?? "routine",
        estimated_turnaround: rule ? (a.urgency === "urgent" ? `${rule.expedited_turnaround_hours}h` : `${rule.turnaround_days} days`) : "3-5 days",
        portal_url: rule?.portal_url, warnings,
      })
    }

    if (name === "check_pa_status") {
      const { reference_number, patient_name } = args as { reference_number?: string; patient_name?: string }
      return JSON.stringify({
        query: { reference_number, patient_name },
        status: "submitted",
        submitted_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        estimated_decision: new Date(Date.now() + 86400000).toISOString(),
        notes: "Under review. No action needed.",
      })
    }

    if (name === "generate_appeal") {
      const a = args as Parameters<typeof buildAppealLetter>[0]
      const letter = buildAppealLetter(a)
      const rule = PAYER_RULES.find((r) => r.payer.toLowerCase().includes(a.payer.toLowerCase()))
      return JSON.stringify({
        appeal_letter: letter,
        fax: rule?.fax, portal: rule?.portal_url, phone: rule?.phone,
      })
    }

    return JSON.stringify({ error: `Unknown tool: ${name}` })
  } catch (e) {
    return JSON.stringify({ error: String(e) })
  }
}

// ── Core Agent Engine ────────────────────────────────────
export async function runAgent(params: {
  agentId: string
  message: string
  sessionId?: string
  walletAddress?: string
}): Promise<{ response: string; agentId: string; handoff?: string }> {
  const { agentId, message, sessionId, walletAddress } = params
  const agent = OPENCLAW_CONFIG.agents.find((a) => a.id === agentId)

  if (!agent) {
    return { response: "Unknown agent.", agentId }
  }

  // Fail closed when no live model key is configured.
  if (!process.env.OPENAI_API_KEY) {
    return { response: "AI service is unavailable because OPENAI_API_KEY is not configured.", agentId }
  }

  const sessionKey = sessionId || `${agentId}-default`
  const patientContext = await getPatientContext(walletAddress)

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

  const isPaAgent = agentId === "prior-auth"

  try {
    const messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; name?: string }> = [
      { role: "system", content: systemPrompt },
      ...conv,
      { role: "user", content: message },
    ]

    // PA agent gets function calling via MCP tools
    const completionParams = isPaAgent
      ? {
          model: "gpt-4o-mini" as const,
          messages: messages as Parameters<typeof openai.chat.completions.create>[0]["messages"],
          max_tokens: 800,
          temperature: 0.5,
          tools: PA_TOOLS,
          tool_choice: "auto" as const,
        }
      : {
          model: "gpt-4o-mini" as const,
          messages: messages as Parameters<typeof openai.chat.completions.create>[0]["messages"],
          max_tokens: 500,
          temperature: 0.7,
        }

    const completionResponse = await openai.chat.completions.create(completionParams as Parameters<typeof openai.chat.completions.create>[0], { timeout: 20000 })
    let completion = completionResponse as Awaited<ReturnType<typeof openai.chat.completions.create>> & { choices: OpenAI.Chat.ChatCompletion["choices"] }
    let assistantMessage = completion.choices[0]?.message

    // Handle PA tool calls
    if (isPaAgent && assistantMessage?.tool_calls?.length) {
      const toolMessages: Array<{ role: "tool"; content: string; tool_call_id: string }> = []

      for (const toolCall of assistantMessage.tool_calls) {
        const tc = toolCall as OpenAI.Chat.ChatCompletionMessageToolCall & { function?: { name: string; arguments: string } }
        const fnName = tc.function?.name ?? ""
        const fnArgs = JSON.parse(tc.function?.arguments ?? "{}")
        const toolResult = executePaTool(fnName, fnArgs)
        logAction(agentId, `tool:${fnName}`, (tc.function?.arguments ?? "").slice(0, 80), "mcp")
        toolMessages.push({ role: "tool", content: toolResult, tool_call_id: toolCall.id })
      }

      // Re-run with tool results
      const followUp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          ...messages,
          assistantMessage,
          ...toolMessages,
        ] as Parameters<typeof openai.chat.completions.create>[0]["messages"],
        max_tokens: 800,
        temperature: 0.5,
      }, { timeout: 20000 })

      assistantMessage = followUp.choices[0]?.message
    }

    let response = assistantMessage?.content || "I couldn't process that. Could you try again?"

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const status = typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : undefined
    console.error(`Agent ${agentId} error:`, message || error)

    if (status === 401) {
      return { response: "AI service authentication failed. Verify OPENAI_API_KEY.", agentId }
    }

    return { response: "AI service is temporarily unavailable. Please retry shortly.", agentId }
  }
}

// ── Coordinator with Real Routing ────────────────────────
export async function runCoordinator(
  message: string,
  sessionId?: string,
  walletAddress?: string
): Promise<{
  response: string
  agentId: string
  handoff?: string
}> {
  const result = await runAgent({
    agentId: "coordinator",
    message,
    sessionId,
    walletAddress,
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
        walletAddress,
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
