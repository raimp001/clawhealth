import { NextRequest, NextResponse } from "next/server"
import { matchClinicalTrials, type TrialMatchInput } from "@/lib/basehealth"

function toPayload(request: NextRequest): TrialMatchInput {
  const { searchParams } = new URL(request.url)
  return {
    patientId: searchParams.get("patientId") || undefined,
    condition: searchParams.get("condition") || undefined,
    location: searchParams.get("location") || undefined,
  }
}

export async function GET(request: NextRequest) {
  const payload = toPayload(request)
  const matches = matchClinicalTrials(payload)
  return NextResponse.json({
    matches,
    total: matches.length,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TrialMatchInput
    const matches = matchClinicalTrials(body)
    return NextResponse.json({
      matches,
      total: matches.length,
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to match clinical trials." },
      { status: 400 }
    )
  }
}
