import { NextRequest, NextResponse } from "next/server"
import { enforceVisualizerRateLimit, improveDiagram } from "@/lib/codebase-visualizer/service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for") || ""
  return forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rate = enforceVisualizerRateLimit({ ip, action: "improve" })
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for improve requests.", retryAfterMs: rate.retryAfterMs },
      { status: 429 }
    )
  }

  try {
    const body = (await request.json()) as {
      mappingId?: string
      diagramId?: string
      instruction?: string
    }

    const mappingId = String(body.mappingId || "").trim()
    const diagramId = String(body.diagramId || "").trim()
    const instruction = String(body.instruction || "").trim()

    if (!mappingId || !diagramId) {
      return NextResponse.json(
        { error: "mappingId and diagramId are required." },
        { status: 400 }
      )
    }

    const diagram = await improveDiagram({ mappingId, diagramId, instruction })
    return NextResponse.json({ diagram })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to improve diagram."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
