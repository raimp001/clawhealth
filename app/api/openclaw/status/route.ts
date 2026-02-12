import { NextResponse } from "next/server"
import { openclawClient } from "@/lib/openclaw/client"
import { OPENCLAW_CONFIG } from "@/lib/openclaw/config"

export async function GET() {
  const connected = await openclawClient.isConnected()

  return NextResponse.json({
    connected,
    gateway: {
      url: OPENCLAW_CONFIG.gateway.url,
      status: connected ? "online" : "demo-mode",
    },
    agents: OPENCLAW_CONFIG.agents.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
    })),
    channels: Object.entries(OPENCLAW_CONFIG.channels)
      .filter(([, v]) => v.enabled)
      .map(([k]) => k),
    cronJobs: OPENCLAW_CONFIG.cronJobs.map((j) => ({
      id: j.id,
      schedule: j.schedule,
      description: j.description,
      agentId: j.agentId,
    })),
  })
}
