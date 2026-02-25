import { NextRequest, NextResponse } from "next/server"
import { runAgent, runCoordinator } from "@/lib/ai-engine"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, agentId, sessionId } = body as {
      message: string
      agentId: string
      sessionId?: string
    }

    const validAgents = [
      "coordinator",
      "triage",
      "scheduling",
      "billing",
      "rx",
      "prior-auth",
      "onboarding",
      "wellness",
      "screening",
      "second-opinion",
      "trials",
      "devops",
    ]

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

    // Use coordinator routing for the coordinator agent
    const result = agentId === "coordinator"
      ? await runCoordinator(message, sessionId)
      : await runAgent({ agentId, message, sessionId })

    return NextResponse.json({
      sessionId: sessionId || `session-${Date.now()}`,
      response: result.response,
      agentId: result.agentId,
      handoff: result.handoff || null,
      live: !!process.env.OPENAI_API_KEY,
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    )
  }
}
