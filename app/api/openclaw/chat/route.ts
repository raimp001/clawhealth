import { NextRequest, NextResponse } from "next/server"
import { openclawClient } from "@/lib/openclaw/client"
import type { AgentId } from "@/lib/openclaw/config"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, agentId, sessionId, patientId, channel } = body as {
      message: string
      agentId: AgentId
      sessionId?: string
      patientId?: string
      channel?: string
    }

    const validAgents = ["coordinator", "triage", "scheduling", "billing", "rx", "prior-auth", "onboarding", "wellness", "devops"]

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "message is required and must be a non-empty string" },
        { status: 400 }
      )
    }

    if (!agentId || !validAgents.includes(agentId)) {
      return NextResponse.json(
        { error: `agentId must be one of: ${validAgents.join(", ")}` },
        { status: 400 }
      )
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: "message must be under 5000 characters" },
        { status: 400 }
      )
    }

    // Check gateway connectivity
    const connected = await openclawClient.isConnected()
    if (!connected) {
      // In demo mode, return simulated agent responses
      return NextResponse.json({
        sessionId: sessionId || `demo-${Date.now()}`,
        response: getDemoResponse(agentId, message),
        demo: true,
      })
    }

    // Send to OpenClaw Gateway
    const result = await openclawClient.sendMessage({
      agentId,
      message,
      sessionId,
      patientId,
      channel,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("OpenClaw chat error:", error)
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    )
  }
}

// Demo responses when gateway is not connected
function getDemoResponse(agentId: AgentId, message: string): string {
  const lowerMsg = message.toLowerCase()

  switch (agentId) {
    case "coordinator":
      if (lowerMsg.includes("appointment") || lowerMsg.includes("schedule") || lowerMsg.includes("book"))
        return "I'll route this to our Scheduling Agent. Let me check physician availability and your insurance network...\n\nBased on your Blue Cross PPO plan, I found 3 in-network physicians with openings this week. Would you prefer morning or afternoon?"
      if (lowerMsg.includes("bill") || lowerMsg.includes("claim") || lowerMsg.includes("charge") || lowerMsg.includes("payment"))
        return "I'm connecting you with our Billing Agent to review your account...\n\nI found your recent claims. Let me analyze them for any errors or opportunities to reduce your costs."
      if (lowerMsg.includes("prescription") || lowerMsg.includes("refill") || lowerMsg.includes("medication") || lowerMsg.includes("medicine"))
        return "Routing to our Prescription Manager...\n\nI can see your active prescriptions. Would you like to request a refill, check interactions, or discuss adherence tips?"
      if (lowerMsg.includes("prior auth") || lowerMsg.includes("authorization"))
        return "Connecting you with our Prior Authorization Agent...\n\nI'll check if your procedure requires PA and start the submission process automatically."
      if (lowerMsg.includes("pain") || lowerMsg.includes("fever") || lowerMsg.includes("symptom") || lowerMsg.includes("sick") || lowerMsg.includes("hurt"))
        return "I'm routing this to our Triage Agent for clinical assessment...\n\nPlease describe your symptoms, including when they started and their severity on a 1-10 scale."
      return "I'm the OpenRx AI Coordinator. I can help with:\n\n• 📅 Scheduling appointments\n• 💳 Billing & claims questions\n• 💊 Prescription management\n• 🛡️ Prior authorizations\n• 🏥 Symptom triage\n\nWhat can I help you with today?"

    case "scheduling":
      return "I've checked your insurance network and physician availability.\n\nAvailable slots this week:\n• Dr. Rai — Thu 9:30 AM (est. copay $40)\n• Dr. Chen — Fri 2:00 PM (est. copay $35)\n• Dr. Rivera — Mon 10:00 AM (est. copay $40)\n\nWould you like to book one of these? I'll send pre-visit forms and set a reminder automatically."

    case "billing":
      return "I've analyzed your recent claims and found potential issues:\n\n✅ Claim BCB-2026-44201: Paid correctly ($285)\n⚠️ Claim MCR-2026-28744: Denied — missing prior auth for CPT 94060\n   → I can file a retroactive PA and appeal. Potential recovery: $1,200\n🔴 Claim BCB-2026-41882: Billed for no-show in error\n   → I'll flag this for correction\n\nShall I proceed with the appeal and correction?"

    case "rx":
      return "Here's your medication status:\n\n💊 Metformin 1000mg — 92% adherence ✅ Next refill in 5 days\n💊 Lisinopril 20mg — 88% adherence ✅\n⚠️ Atorvastatin 40mg — 78% adherence — Refill overdue!\n   Last filled 45 days ago. I've sent a refill request to Walgreens on 39th.\n\nTip: Taking Atorvastatin at bedtime with a glass of water can reduce stomach upset. Shall I set a daily reminder at 9 PM?"

    case "prior-auth":
      return "PA Analysis for your request:\n\n✅ Clinical criteria: All requirements met\n✅ Supporting documentation: Labs and notes attached\n✅ Insurance policy: Matches Aetna ePA requirements\n\nForm auto-filled with:\n• ICD-10: C50.911, Z12.31\n• CPT: 77066\n• Clinical justification: attached\n\nReady to submit electronically. Estimated turnaround: 2-4 hours for ePA. Shall I proceed?"

    case "triage":
      return "Hey, I'm Nova. I understand you're not feeling well — let me help.\n\nHere's what I need from you:\n1. When did this start?\n2. Severity on 1-10?\n3. Any new medications or changes?\n4. Fever, chest pain, or difficulty breathing?\n\nThis helps me classify urgency and get you the right care fast.\n\n⚠️ If you're having chest pain, can't breathe, or show stroke signs — call 911 now. I'm not messing around with those."

    case "onboarding":
      return "Hey there! I'm Sage, your onboarding guide. 👋\n\nI'm going to get you completely set up — PCP, dentist, pharmacy, medications, screenings, the works. No forms, just a conversation.\n\nLet's start with the basics. What's your full name?"

    case "wellness":
      return "Hi! I'm Ivy, your wellness coach. 🌿\n\nBased on your profile, I'd love to set up your preventive care plan. This includes:\n\n• Age-appropriate screenings (USPSTF guidelines)\n• Vaccination updates\n• Health goals and tracking\n• Device integration for real-time monitoring\n\nWant me to run your screening recommendations?"

    case "devops":
      return "Bolt here. Systems status:\n\n✅ All 20 routes: healthy\n✅ API latency: <200ms average\n✅ Last deploy: today 02:00 UTC\n✅ Dependencies: up to date\n✅ Zero errors in last 24h\n\nNext scheduled deploy: tomorrow 02:00 UTC. No pending changes from other agents.\n\nAnything you need me to check?"

    default:
      return "I'm processing your request. How can I help you today?"
  }
}
