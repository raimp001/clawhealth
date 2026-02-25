import { NextRequest, NextResponse } from "next/server"
import { OPENCLAW_CONFIG } from "@/lib/openclaw/config"

// GET: Get orchestrator state and agent collaboration info
export async function GET() {
  const agents = OPENCLAW_CONFIG.agents.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    description: a.description,
    canMessage: a.canMessage,
    status: "active",
  }))

  const collaborationMap = OPENCLAW_CONFIG.agents.map((agent) => ({
    agentId: agent.id,
    name: agent.name,
    canMessageTo: agent.canMessage,
    canReceiveFrom: OPENCLAW_CONFIG.agents
      .filter((other) => {
        const cm = other.canMessage as readonly string[]
        return cm.includes("*") || cm.includes(agent.id)
      })
      .map((other) => other.id),
  }))

  return NextResponse.json({
    agents,
    collaborationMap,
    totalAgents: agents.length,
    cronJobs: OPENCLAW_CONFIG.cronJobs.length,
    channels: Object.entries(OPENCLAW_CONFIG.channels)
      .filter(([, v]) => v.enabled)
      .map(([k]) => k),
  })
}

// POST: Trigger a multi-agent workflow
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, walletAddress } = body as {
      message: string
      walletAddress?: string
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      )
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: "message must be under 5000 characters" },
        { status: 400 }
      )
    }

    // Simple keyword-based routing (mirrors client-side orchestrator)
    const lower = message.toLowerCase()
    let primaryAgent = "coordinator"
    let collaborators: string[] = []
    let reasoning = "General query — coordinator will assess."

    if (lower.includes("appointment") || lower.includes("schedule") || lower.includes("book")) {
      primaryAgent = "scheduling"
      collaborators = ["billing"]
      reasoning = "Scheduling request with billing for copay estimates."
    } else if (lower.includes("bill") || lower.includes("claim") || lower.includes("charge")) {
      primaryAgent = "billing"
      collaborators = ["prior-auth"]
      reasoning = "Billing inquiry with PA agent on standby."
    } else if (lower.includes("prescription") || lower.includes("refill") || lower.includes("medication")) {
      primaryAgent = "rx"
      collaborators = ["scheduling"]
      reasoning = "Medication request with scheduler for lab follow-ups."
    } else if (lower.includes("prior auth") || lower.includes("authorization")) {
      primaryAgent = "prior-auth"
      collaborators = ["billing", "coordinator"]
      reasoning = "PA-related query."
    } else if (lower.includes("pain") || lower.includes("fever") || lower.includes("symptom") || lower.includes("sick")) {
      primaryAgent = "triage"
      collaborators = ["scheduling", "rx"]
      reasoning = "Symptom report with scheduling and Rx support."
    } else if (lower.includes("new patient") || lower.includes("onboard") || lower.includes("register")) {
      primaryAgent = "onboarding"
      collaborators = ["rx", "scheduling", "wellness"]
      reasoning = "New patient flow with full team."
    } else if (
      lower.includes("screening") ||
      lower.includes("risk score") ||
      lower.includes("risk assessment")
    ) {
      primaryAgent = "screening"
      collaborators = ["wellness", "scheduling"]
      reasoning = "Preventive screening flow."
    } else if (
      lower.includes("second opinion") ||
      lower.includes("another opinion") ||
      lower.includes("review my diagnosis")
    ) {
      primaryAgent = "second-opinion"
      collaborators = ["triage", "coordinator"]
      reasoning = "Second-opinion clinical review."
    } else if (
      lower.includes("clinical trial") ||
      lower.includes("clinical trials") ||
      lower.includes("trial match") ||
      lower.includes("research study")
    ) {
      primaryAgent = "trials"
      collaborators = ["screening", "billing"]
      reasoning = "Clinical trial matching with fit and logistics support."
    } else if (lower.includes("wellness") || lower.includes("preventive")) {
      primaryAgent = "wellness"
      collaborators = ["screening", "scheduling"]
      reasoning = "Wellness inquiry with screening and scheduler."
    }

    return NextResponse.json({
      route: {
        primaryAgent,
        collaborators,
        reasoning,
      },
      walletLinked: !!walletAddress,
      agentCount: OPENCLAW_CONFIG.agents.length,
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to process orchestration request" },
      { status: 500 }
    )
  }
}
