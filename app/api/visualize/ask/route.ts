import { NextRequest, NextResponse } from "next/server"
import { askMapper, enforceVisualizerRateLimit } from "@/lib/codebase-visualizer/service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for") || ""
  return forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rate = enforceVisualizerRateLimit({ ip, action: "ask" })
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for ask-mapper requests.", retryAfterMs: rate.retryAfterMs },
      { status: 429 }
    )
  }

  try {
    const body = (await request.json()) as {
      mappingId?: string
      question?: string
    }

    const mappingId = String(body.mappingId || "").trim()
    const question = String(body.question || "").trim()

    if (!mappingId || !question) {
      return NextResponse.json(
        { error: "mappingId and question are required." },
        { status: 400 }
      )
    }

    const result = await askMapper({ mappingId, question })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to answer mapper question."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
