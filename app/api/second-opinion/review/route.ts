import { NextRequest, NextResponse } from "next/server"
import { reviewSecondOpinion, type SecondOpinionInput } from "@/lib/basehealth"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SecondOpinionInput

    if (!body.diagnosis || !body.currentPlan) {
      return NextResponse.json(
        { error: "diagnosis and currentPlan are required." },
        { status: 400 }
      )
    }

    const opinion = reviewSecondOpinion(body)
    return NextResponse.json(opinion)
  } catch {
    return NextResponse.json(
      { error: "Failed to generate second-opinion review." },
      { status: 400 }
    )
  }
}
