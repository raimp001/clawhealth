/**
 * Demo patient scenarios API
 * GET /api/hermes/demo              — list all demo patients
 * GET /api/hermes/demo?id=demo-mitchell — get specific patient + script
 */

import { NextRequest, NextResponse } from "next/server"
import { DEMO_PATIENTS, getDemoPatient, getDemoScriptText } from "@/lib/hermes/demo-patients"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const format = searchParams.get("format") // "script" for plain text

  if (id) {
    const patient = getDemoPatient(id)
    if (!patient) return NextResponse.json({ error: "Demo patient not found" }, { status: 404 })

    if (format === "script") {
      return new Response(getDemoScriptText(patient), {
        headers: { "Content-Type": "text/plain" },
      })
    }

    return NextResponse.json(patient)
  }

  return NextResponse.json({
    patients: DEMO_PATIENTS.map((p) => ({
      id: p.id,
      name: p.name,
      age: p.age,
      diagnosis: p.diagnosis,
      drug: p.drug,
      payer: p.payer,
      scenario: p.scenario,
      steps: p.paFlow.length,
      wowMoment: p.wowMoment,
    })),
    total: DEMO_PATIENTS.length,
  })
}
