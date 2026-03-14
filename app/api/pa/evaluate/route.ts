/**
 * PA Criteria Evaluation API
 * POST /api/pa/evaluate
 *
 * Real-time criteria check before PA submission.
 * Returns approval likelihood score, missing criteria, step therapy gaps,
 * NCCN guidelines, and specific recommendations.
 */

import { NextRequest, NextResponse } from "next/server"
import { evaluatePACriteria, getPayerOverride, isOnFormulary, DRUG_RULES } from "@/lib/payer-rules/engine"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      drugName,
      hcpcsCode,
      icd10Codes = [],
      priorTherapies = [],
      ecogScore,
      clinicalNotes = "",
      payer = "",
    } = body as {
      drugName?: string
      hcpcsCode?: string
      icd10Codes?: string[]
      priorTherapies?: string[]
      ecogScore?: number
      clinicalNotes?: string
      payer?: string
    }

    if (!drugName && !hcpcsCode) {
      return NextResponse.json(
        { error: "Provide drugName or hcpcsCode" },
        { status: 400 }
      )
    }

    const evaluation = evaluatePACriteria({
      drugName: drugName ?? "",
      hcpcsCode,
      icd10Codes,
      priorTherapies,
      ecogScore,
      clinicalNotes,
    })

    if (!evaluation) {
      return NextResponse.json({
        found: false,
        message: `No PA rules found for "${drugName ?? hcpcsCode}". PA may still be required — verify with payer.`,
        formulary: isOnFormulary({ drugName: drugName ?? "", payer, hcpcsCode }),
      })
    }

    // Apply payer-specific overrides
    const override = getPayerOverride(payer, evaluation.drugClass)

    return NextResponse.json({
      found: true,
      drug: evaluation.drug,
      drugClass: evaluation.drugClass,
      score: evaluation.score,
      passed: evaluation.passed,
      approvalLikelihood: evaluation.score >= 85 ? "HIGH" : evaluation.score >= 60 ? "MODERATE" : "LOW",
      criteria: {
        met: evaluation.met.map((c) => ({
          id: c.id,
          label: c.label,
          required: c.required,
          evidenceLevel: c.evidenceLevel,
        })),
        missing: evaluation.missing.map((c) => ({
          id: c.id,
          label: c.label,
          description: c.description,
          required: c.required,
          evidenceLevel: c.evidenceLevel,
          source: c.source,
        })),
      },
      stepTherapy: {
        met: evaluation.stepTherapyMet,
        gaps: evaluation.stepTherapyGaps,
      },
      rems: {
        required: evaluation.remsRequired,
        program: evaluation.remsRequired
          ? DRUG_RULES.find((r) => r.brandNames[0] === evaluation.drug)?.remsProgram
          : null,
      },
      formulary: isOnFormulary({ drugName: drugName ?? "", payer, hcpcsCode }),
      payerOverride: override ? {
        payer: override.payer,
        additionalCriteria: override.additionalCriteria,
        stepTherapyAdditions: override.stepTherapyAdditions,
        preferredBiosimilar: override.preferredBiosimilar,
        authDaysOverride: override.authDaysOverride,
      } : null,
      warnings: evaluation.warnings,
      recommendations: evaluation.recommendations,
      guidelines: {
        nccnCategory: evaluation.nccnCategory,
        references: evaluation.guidelineReferences,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Evaluation failed", details: String(err) },
      { status: 500 }
    )
  }
}

// GET — lookup available drug rules
export async function GET() {
  return NextResponse.json({
    availableDrugs: DRUG_RULES.map((r) => ({
      brandNames: r.brandNames,
      genericNames: r.genericNames,
      drugClass: r.drugClass,
      hcpcsCodes: r.hcpcsCodes,
      requiresPA: r.requiresPA,
      nccnCategory: r.nccnCategory,
    })),
    totalRules: DRUG_RULES.length,
  })
}
