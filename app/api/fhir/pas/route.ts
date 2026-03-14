/**
 * Da Vinci PAS — Claim/$submit
 * POST /api/fhir/pas
 *
 * Accepts a FHIR R4 Bundle containing a Claim (preauthorization) + supporting
 * resources. Returns a ClaimResponse with the authorization decision.
 *
 * Implements: HL7 Da Vinci PAS IG v2.0
 * https://hl7.org/fhir/us/davinci-pas/
 *
 * Also accepts our simplified OpenRx JSON format for the demo UI.
 */

import { NextRequest, NextResponse } from "next/server"
import { buildPASClaimBundle } from "@/lib/fhir/builders"
import { evaluatePACriteria, getPayerOverride } from "@/lib/payer-rules/engine"
import type { Bundle, ClaimResponse } from "@/lib/fhir/types"
import type { LivePriorAuth, LivePatient, LivePhysician } from "@/lib/live-data-types"

export const maxDuration = 30

const FHIR_HEADERS = {
  "Content-Type": "application/fhir+json",
  "X-OpenRx-FHIR-Version": "R4",
  "X-Da-Vinci-PAS": "v2.0",
}

// ── Process a PAS request and return a ClaimResponse ─────────────────

function processPASRequest(bundle: Bundle): ClaimResponse {
  const now = new Date().toISOString()

  // Extract Claim from bundle
  const claimEntry = bundle.entry?.find((e) => e.resource?.resourceType === "Claim")
  const claim = (claimEntry?.resource ?? null) as Record<string, unknown> | null

  // Extract Patient from bundle
  const patientEntry = bundle.entry?.find((e) => e.resource?.resourceType === "Patient")
  const patient = patientEntry?.resource as { id?: string; name?: Array<{ text?: string }> } | null

  const claimId = (claim?.id as string | undefined) ?? `claim-${Date.now()}`
  const patientId = patient?.id ?? "unknown"

  // Extract items (procedures being authorized)
  const items = (claim?.item as Array<{ productOrService?: { coding?: Array<{ code?: string }> } }> | undefined) ?? []
  const diagnoses = (claim?.diagnosis as Array<{ diagnosisCodeableConcept?: { coding?: Array<{ code?: string }> } }> | undefined) ?? []

  const procedureCodes = items.flatMap((item) =>
    item.productOrService?.coding?.map((c) => c.code).filter(Boolean) ?? []
  )
  const icd10Codes = diagnoses.flatMap((d) =>
    d.diagnosisCodeableConcept?.coding?.map((c) => c.code).filter(Boolean) ?? []
  )
  const insurer = (claim?.insurer as { display?: string } | undefined)?.display ?? "Unknown Payer"

  // Evaluate criteria against payer rules engine
  const evaluation = procedureCodes.length > 0
    ? evaluatePACriteria({
        drugName: procedureCodes[0] ?? "",
        hcpcsCode: procedureCodes[0],
        icd10Codes: icd10Codes as string[],
      })
    : null

  // Apply payer overrides
  const override = evaluation
    ? getPayerOverride(insurer, evaluation.drugClass)
    : null

  // Determine outcome
  // In the real Da Vinci flow, payers respond with queued/complete/pended
  // For demo: approve high-score PAs, pend medium, deny low
  const score = evaluation?.score ?? 50
  let outcome: ClaimResponse["outcome"] = "queued"
  let disposition = "Authorization request received and queued for review"
  let preAuthRef: string | undefined

  if (score >= 85 && evaluation?.stepTherapyMet) {
    outcome = "complete"
    disposition = "APPROVED — Prior authorization granted based on submitted clinical evidence"
    preAuthRef = `AUTH-${Date.now().toString(36).toUpperCase()}`
  } else if (score >= 60) {
    outcome = "partial"
    disposition = "PENDED — Additional clinical documentation required. See error details."
  } else {
    outcome = "error"
    disposition = evaluation?.stepTherapyGaps.length
      ? `DENIED — Step therapy requirements not met: ${evaluation.stepTherapyGaps[0]}`
      : "DENIED — Clinical criteria not met. Appeal rights apply within 180 days."
  }

  // Build ClaimResponse
  const response: ClaimResponse = {
    resourceType: "ClaimResponse",
    id: `cr-${Date.now().toString(36)}`,
    meta: {
      profile: ["http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-claimresponse"],
      lastUpdated: now,
    },
    identifier: [{
      system: "https://openrx.health/fhir/claim-response",
      value: `CR-${Date.now().toString(36).toUpperCase()}`,
    }],
    status: "active",
    type: {
      coding: [{
        system: "http://terminology.hl7.org/CodeSystem/claim-type",
        code: "professional",
        display: "Professional",
      }],
    },
    use: "preauthorization",
    patient: { reference: `Patient/${patientId}` },
    created: now,
    insurer: { display: insurer },
    outcome,
    disposition,
    preAuthRef,
    preAuthPeriod: preAuthRef ? {
      start: now,
      end: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    } : undefined,
    item: items.map((_, i) => ({
      itemSequence: i + 1,
      noteNumber: evaluation?.missing.length ? [1] : undefined,
      adjudication: [{
        category: {
          coding: [{
            system: "http://terminology.hl7.org/CodeSystem/adjudication",
            code: outcome === "complete" ? "benefit" : "noncovered",
          }],
        },
        reason: outcome !== "complete" ? {
          coding: [{
            system: "http://terminology.hl7.org/CodeSystem/adjudication",
            code: "A001",
            display: disposition,
          }],
        } : undefined,
        amount: { value: 0, currency: "USD" },
        value: outcome === "complete" ? 1 : 0,
      }],
    })),
  }

  // Attach evaluation details as extension (OpenRx proprietary)
  ;(response as unknown as Record<string, unknown>)["_openrx_evaluation"] = evaluation
    ? {
        score: evaluation.score,
        passed: evaluation.passed,
        metCriteria: evaluation.met.map((c) => c.label),
        missingCriteria: evaluation.missing.map((c) => ({ label: c.label, required: c.required })),
        stepTherapyMet: evaluation.stepTherapyMet,
        stepTherapyGaps: evaluation.stepTherapyGaps,
        recommendations: evaluation.recommendations,
        warnings: evaluation.warnings,
        nccnCategory: evaluation.nccnCategory,
        guidelineReferences: evaluation.guidelineReferences,
        payerOverride: override ? {
          additionalCriteria: override.additionalCriteria,
          preferredBiosimilar: override.preferredBiosimilar,
        } : null,
      }
    : null

  return response
}

// ── Route handlers ───────────────────────────────────────────────────

// POST — Submit a PA as a FHIR Bundle or simplified OpenRx format
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Accept both FHIR Bundle and simplified OpenRx format
    if (body.resourceType === "Bundle") {
      const bundle = body as Bundle
      const response = processPASRequest(bundle)
      return NextResponse.json(response, { headers: FHIR_HEADERS })
    }

    // Simplified format: { pa, patient, physician } from our UI
    if (body.pa && body.patient) {
      const pa = body.pa as LivePriorAuth
      const patient = body.patient as LivePatient
      const physician = body.physician as LivePhysician | undefined

      if (!physician) {
        return NextResponse.json(
          { error: "physician is required for PAS submission" },
          { status: 400, headers: FHIR_HEADERS }
        )
      }

      // Build FHIR bundle then process
      const bundle = buildPASClaimBundle({ pa, patient, physician })
      const response = processPASRequest(bundle)

      // Return both the FHIR response AND the bundle for transparency
      return NextResponse.json({
        fhirResponse: response,
        requestBundle: bundle,
        summary: {
          outcome: response.outcome,
          disposition: response.disposition,
          preAuthRef: response.preAuthRef,
          validUntil: response.preAuthPeriod?.end,
          score: (response as unknown as Record<string, unknown>)["_openrx_evaluation"]
            ? ((response as unknown as Record<string, unknown>)["_openrx_evaluation"] as Record<string, unknown>)["score"]
            : null,
          recommendations: (response as unknown as Record<string, unknown>)["_openrx_evaluation"]
            ? ((response as unknown as Record<string, unknown>)["_openrx_evaluation"] as Record<string, unknown>)["recommendations"]
            : [],
        },
      }, { headers: FHIR_HEADERS })
    }

    // Direct criteria evaluation (for /api/pa/evaluate endpoint-style calls)
    if (body.drugName || body.hcpcsCode) {
      const evaluation = evaluatePACriteria({
        drugName: body.drugName ?? "",
        hcpcsCode: body.hcpcsCode,
        icd10Codes: body.icd10Codes ?? [],
        priorTherapies: body.priorTherapies ?? [],
        ecogScore: body.ecogScore,
        clinicalNotes: body.clinicalNotes ?? "",
      })

      return NextResponse.json({ evaluation }, { headers: FHIR_HEADERS })
    }

    return NextResponse.json(
      { error: "Provide a FHIR Bundle, { pa, patient, physician } object, or { drugName, icd10Codes } for criteria evaluation" },
      { status: 400, headers: FHIR_HEADERS }
    )
  } catch (err) {
    console.error("[FHIR PAS] Error:", err)
    return NextResponse.json(
      { error: "Failed to process PAS request", details: String(err) },
      { status: 500, headers: FHIR_HEADERS }
    )
  }
}

// GET — Check PA status by reference number
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const preAuthRef = searchParams.get("preAuthRef")
  const patientId = searchParams.get("patient")

  if (!preAuthRef && !patientId) {
    return NextResponse.json(
      { error: "Provide preAuthRef or patient query parameter" },
      { status: 400, headers: FHIR_HEADERS }
    )
  }

  // In production: query payer FHIR endpoint with Claim/$inquire
  // For now: return status stub
  return NextResponse.json({
    resourceType: "Bundle",
    type: "searchset",
    total: 1,
    entry: [{
      resource: {
        resourceType: "ClaimResponse",
        id: `cr-${preAuthRef ?? patientId}`,
        status: "active",
        use: "preauthorization",
        outcome: "queued",
        disposition: "Authorization request is under review. Standard turnaround: 3 business days.",
        preAuthRef,
        created: new Date().toISOString(),
        _note: "Use POST /api/fhir/pas with a full FHIR Bundle for real-time evaluation",
      },
    }],
  }, { headers: FHIR_HEADERS })
}
