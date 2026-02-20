import { NextRequest, NextResponse } from "next/server"
import { getRecentActions } from "@/lib/ai-engine"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50)

  const actions = getRecentActions(limit)

  return NextResponse.json({ actions })
}
