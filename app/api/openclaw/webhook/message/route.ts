import { NextRequest, NextResponse } from "next/server"
import { openclawClient } from "@/lib/openclaw/client"

// Webhook endpoint for incoming patient messages from any channel
// OpenClaw Gateway routes WhatsApp/SMS/Telegram messages here
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { channel, sender, message, patientId } = body as {
      channel: string
      sender: string
      message: string
      patientId?: string
    }

    if (!channel || !sender || !message) {
      return NextResponse.json(
        { error: "channel, sender, and message are required" },
        { status: 400 }
      )
    }

    // Log incoming message for audit trail
    console.log(`[webhook/message] ${channel}:${sender} — ${message.slice(0, 100)}`)

    // Route through the coordinator agent to determine intent
    const result = await openclawClient.sendMessage({
      agentId: "coordinator",
      message,
      patientId,
      channel,
    })

    return NextResponse.json({
      status: "processed",
      sessionId: result.sessionId,
    })
  } catch (error) {
    console.error("Webhook message error:", error)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }
}
