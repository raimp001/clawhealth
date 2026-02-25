import { NextRequest, NextResponse } from "next/server"
import { searchNpiCareDirectory } from "@/lib/npi-care-search"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = (searchParams.get("q") || "").trim()
    const limitRaw = Number.parseInt(searchParams.get("limit") || "20", 10)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20

    if (!query) {
      return NextResponse.json(
        { error: "Enter a natural-language query to search care options." },
        { status: 400 }
      )
    }

    if (query.length > 220) {
      return NextResponse.json(
        { error: "Search query is too long. Keep it under 220 characters." },
        { status: 400 }
      )
    }

    const result = await searchNpiCareDirectory(query, { limit })

    if (!result.ready) {
      return NextResponse.json({
        ready: false,
        parsed: result.parsed,
        clarificationQuestion: result.clarificationQuestion,
        prompt: result.prompt,
        matches: [],
      })
    }

    return NextResponse.json({
      ready: true,
      parsed: result.parsed,
      prompt: result.prompt,
      count: result.matches.length,
      matches: result.matches,
    })
  } catch (error) {
    console.error("Care search error:", error)
    return NextResponse.json(
      { error: "Failed to search NPI care directory." },
      { status: 500 }
    )
  }
}
