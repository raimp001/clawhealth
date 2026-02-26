import { NextRequest, NextResponse } from "next/server"
import {
  assessHealthScreening,
  type ScreeningAssessment,
  type ScreeningInput,
  type ScreeningRecommendation,
} from "@/lib/basehealth"
import {
  buildScreeningEvidence,
  buildUspstfGuidelineCitations,
  type ScreeningEvidenceCitation,
} from "@/lib/screening-evidence"
import {
  CARE_SEARCH_PROMPT_ID,
  CARE_SEARCH_PROMPT_IMAGE_PATH,
  CARE_SEARCH_PROMPT_TEXT,
  buildPatientLocalCareQuery,
  searchNpiCareDirectory,
  type CareDirectoryMatch,
  type CareSearchType,
} from "@/lib/npi-care-search"
import { getLiveSnapshotByWallet } from "@/lib/live-data.server"
import { prisma } from "@/lib/db"
import { verifyScreeningAccess } from "@/lib/screening-access"

type ScreeningAnalysisLevel = "preview" | "deep"

interface ScreeningLocalCareConnection {
  recommendationId: string
  recommendationName: string
  reason: string
  services: CareSearchType[]
  query: string
  riskContext: string
  ready: boolean
  clarificationQuestion?: string
  prompt: {
    id: typeof CARE_SEARCH_PROMPT_ID
    image: typeof CARE_SEARCH_PROMPT_IMAGE_PATH
    text: string
  }
  matches: CareDirectoryMatch[]
}

type ScreeningAssessmentPayload = ScreeningAssessment & {
  localCareConnections: ScreeningLocalCareConnection[]
  evidenceCitations: ScreeningEvidenceCitation[]
  accessLevel: ScreeningAnalysisLevel
  isPreview: boolean
  upgradeMessage?: string
}

const CARE_MATCH_LIMIT = 10
const MAX_CONNECTIONS = 3
const GENETIC_MARKERS = [
  "brca1",
  "brca2",
  "palb2",
  "atm",
  "chek2",
  "lynch",
  "mlh1",
  "msh2",
  "msh6",
  "pms2",
]

function resolveAnalysisLevel(value?: string | null): ScreeningAnalysisLevel {
  return value === "deep" ? "deep" : "preview"
}

function normalizeTerms(input?: string[]): string[] {
  return Array.isArray(input) ? input.map((item) => item.toLowerCase().trim()).filter(Boolean) : []
}

function hasGeneticSignal(term: string): boolean {
  if (!term) return false
  return (
    GENETIC_MARKERS.some((marker) => term.includes(marker)) ||
    term.includes("mutation") ||
    term.includes("carrier") ||
    term.includes("genetic") ||
    term.includes("gene")
  )
}

function sanitizePreviewInput(input: ScreeningInput): ScreeningInput {
  return {
    ...input,
    conditions: (input.conditions || []).filter((condition) => !hasGeneticSignal(condition.toLowerCase())),
    familyHistory: (input.familyHistory || []).filter((entry) => !hasGeneticSignal(entry.toLowerCase())),
  }
}

function withRecommendation(
  recommendations: ScreeningRecommendation[],
  candidate: ScreeningRecommendation
): ScreeningRecommendation[] {
  if (recommendations.some((entry) => entry.id === candidate.id)) return recommendations
  return [...recommendations, candidate]
}

function withAction(actions: string[], candidate: string): string[] {
  if (actions.includes(candidate)) return actions
  return [...actions, candidate]
}

function applyGeneticsDeepDive(
  assessment: ScreeningAssessment,
  input: ScreeningInput
): ScreeningAssessment {
  const terms = [...normalizeTerms(input.conditions), ...normalizeTerms(input.familyHistory)]
  const geneticsTerms = terms.filter((term) => hasGeneticSignal(term))
  if (geneticsTerms.length === 0) return assessment

  let recommendations = assessment.recommendedScreenings
  let nextActions = assessment.nextActions
  const mention = GENETIC_MARKERS.filter((marker) => geneticsTerms.some((term) => term.includes(marker)))

  recommendations = withRecommendation(recommendations, {
    id: "genetics-counseling-cascade",
    name: "Hereditary-risk counseling and cascade testing",
    priority: "high",
    ownerAgent: "screening",
    reason:
      "Reported genetic risk signals warrant counseling plus family cascade testing and personalized preventive intervals.",
  })

  if (mention.some((marker) => ["brca1", "brca2", "palb2", "atm", "chek2"].includes(marker))) {
    recommendations = withRecommendation(recommendations, {
      id: "hereditary-breast-prostate-pathway",
      name: "Mutation-informed breast/prostate surveillance planning",
      priority: "high",
      ownerAgent: "screening",
      reason:
        "BRCA-pathway and related mutation signals can justify earlier or intensified surveillance planning.",
    })
    nextActions = withAction(
      nextActions,
      "Discuss mutation-informed screening start ages and interval cadence with a genetics-enabled clinician."
    )
  }

  if (mention.some((marker) => ["lynch", "mlh1", "msh2", "msh6", "pms2"].includes(marker))) {
    recommendations = withRecommendation(recommendations, {
      id: "lynch-colorectal-surveillance",
      name: "Enhanced colorectal surveillance pathway",
      priority: "high",
      ownerAgent: "screening",
      reason:
        "Lynch-spectrum mutation signals support a personalized colorectal surveillance strategy.",
    })
  }

  nextActions = withAction(
    nextActions,
    "Share prior genetic test reports with your care team to lock in precise screening timing."
  )

  return {
    ...assessment,
    recommendedScreenings: recommendations,
    nextActions,
  }
}

function inferServiceTypes(rec: ScreeningRecommendation): CareSearchType[] {
  const text = `${rec.name} ${rec.reason}`.toLowerCase()
  const serviceTypes = new Set<CareSearchType>()

  if (
    text.includes("a1c") ||
    text.includes("panel") ||
    text.includes("microalbumin") ||
    text.includes("blood") ||
    text.includes("urine")
  ) {
    serviceTypes.add("lab")
  }

  if (
    text.includes("ct") ||
    text.includes("radiology") ||
    text.includes("imaging") ||
    text.includes("mammography") ||
    text.includes("x-ray") ||
    text.includes("xray")
  ) {
    serviceTypes.add("radiology")
  }

  if (
    text.includes("retinal") ||
    text.includes("exam") ||
    text.includes("screening") ||
    text.includes("vaccine") ||
    text.includes("clinician")
  ) {
    serviceTypes.add("provider")
  }

  if (serviceTypes.size === 0 || rec.priority !== "low") {
    serviceTypes.add("provider")
  }

  return Array.from(serviceTypes)
}

function inferSpecialtyHint(rec: ScreeningRecommendation): string | undefined {
  const text = `${rec.name} ${rec.reason}`.toLowerCase()
  if (text.includes("diabetes") || text.includes("a1c")) return "Endocrinology"
  if (text.includes("kidney") || text.includes("microalbumin")) return "Nephrology"
  if (text.includes("retinal") || text.includes("eye")) return "Ophthalmology"
  if (text.includes("lung")) return "Pulmonary Disease"
  if (text.includes("colon")) return "Gastroenterology"
  if (text.includes("hypertension") || text.includes("blood pressure")) return "Cardiology"
  if (text.includes("vaccine")) return "Family Medicine"
  return undefined
}

function buildRiskContext(assessment: ScreeningAssessment): string {
  const drivers = assessment.factors
    .filter((factor) => factor.scoreDelta > 0)
    .slice(0, 3)
    .map((factor) => factor.label)
  if (drivers.length === 0) {
    return "Preventive continuity and routine monitoring."
  }
  return `Top risk drivers: ${drivers.join(", ")}.`
}

async function buildLocalCareConnections(
  assessment: ScreeningAssessment,
  patientAddress: string
): Promise<ScreeningLocalCareConnection[]> {
  const primaryRecommendations = assessment.recommendedScreenings
    .filter((rec) => rec.priority !== "low")
    .slice(0, MAX_CONNECTIONS)
  const selectedRecommendations =
    primaryRecommendations.length > 0
      ? primaryRecommendations
      : assessment.recommendedScreenings.slice(0, MAX_CONNECTIONS)
  const riskContext = buildRiskContext(assessment)
  const connections: ScreeningLocalCareConnection[] = []

  for (const recommendation of selectedRecommendations) {
    const services = inferServiceTypes(recommendation)
    const specialtyHint = inferSpecialtyHint(recommendation)
    const query = buildPatientLocalCareQuery({
      requestedServices: services,
      specialtyHint,
      patientAddress,
    })

    try {
      const searchResult = await searchNpiCareDirectory(query, {
        limit: CARE_MATCH_LIMIT,
      })

      connections.push({
        recommendationId: recommendation.id,
        recommendationName: recommendation.name,
        reason: recommendation.reason,
        services,
        query,
        riskContext,
        ready: searchResult.ready,
        clarificationQuestion: searchResult.clarificationQuestion,
        prompt: searchResult.prompt,
        matches: searchResult.matches,
      })
    } catch {
      connections.push({
        recommendationId: recommendation.id,
        recommendationName: recommendation.name,
        reason: recommendation.reason,
        services,
        query,
        riskContext,
        ready: false,
        clarificationQuestion: "Unable to fetch nearby NPI records right now.",
        prompt: {
          id: CARE_SEARCH_PROMPT_ID,
          image: CARE_SEARCH_PROMPT_IMAGE_PATH,
          text: CARE_SEARCH_PROMPT_TEXT,
        },
        matches: [],
      })
    }
  }

  return connections
}

async function loadSnapshotForRequest(params: {
  walletAddress?: string
  patientId?: string
}) {
  if (params.walletAddress) {
    return getLiveSnapshotByWallet(params.walletAddress)
  }

  if (params.patientId) {
    const patient = await prisma.patientProfile.findUnique({
      where: { id: params.patientId },
      include: { user: { select: { walletAddress: true } } },
    })
    const wallet = patient?.user.walletAddress || undefined
    return getLiveSnapshotByWallet(wallet)
  }

  return getLiveSnapshotByWallet(undefined)
}

async function buildAssessmentPayload(
  input: ScreeningInput & { walletAddress?: string },
  options: { analysisLevel: ScreeningAnalysisLevel }
): Promise<ScreeningAssessmentPayload> {
  const snapshot = await loadSnapshotForRequest({
    walletAddress: input.walletAddress,
    patientId: input.patientId,
  })

  const livePatient = snapshot.patient
  const screeningInput =
    options.analysisLevel === "preview" ? sanitizePreviewInput(input) : input

  const assessment = assessHealthScreening({
    ...screeningInput,
    patient: livePatient
      ? {
          id: livePatient.id,
          date_of_birth: livePatient.date_of_birth,
          medical_history: livePatient.medical_history,
        }
      : undefined,
    vitals: snapshot.vitals.map((vital) => ({
      systolic: vital.systolic,
      diastolic: vital.diastolic,
    })),
    labs: snapshot.labResults.map((lab) => ({
      test_name: lab.test_name,
      results: lab.results.map((result) => ({ value: result.value })),
      status: lab.status,
    })),
    vaccinations: snapshot.vaccinations.map((vaccination) => ({
      vaccine_name: vaccination.vaccine_name,
      status: vaccination.status,
    })),
  })
  const enrichedAssessment =
    options.analysisLevel === "deep" ? applyGeneticsDeepDive(assessment, input) : assessment

  const patientAddress = livePatient?.address || process.env.OPENRX_DEFAULT_PATIENT_LOCATION || ""
  const localCareConnections =
    options.analysisLevel === "deep"
      ? await buildLocalCareConnections(enrichedAssessment, patientAddress)
      : []
  const evidenceCitations =
    options.analysisLevel === "deep"
      ? await buildScreeningEvidence({
          assessment: enrichedAssessment,
          symptoms: input.symptoms,
          familyHistory: input.familyHistory,
        })
      : buildUspstfGuidelineCitations()
  const nextActions =
    options.analysisLevel === "preview"
      ? withAction(
          enrichedAssessment.nextActions,
          "Unlock the deep-dive for genetics-aware intervals, paper-backed evidence, and nearby care routing."
        )
      : enrichedAssessment.nextActions
  return {
    ...enrichedAssessment,
    nextActions,
    localCareConnections,
    evidenceCitations,
    accessLevel: options.analysisLevel,
    isPreview: options.analysisLevel === "preview",
    ...(options.analysisLevel === "preview"
      ? {
          upgradeMessage:
            "Free preview includes USPSTF guidance. Deep dive unlocks mutation-informed personalization and full evidence synthesis.",
        }
      : {}),
  }
}

function paymentRequiredResponse(input: {
  reason?: string
  fee: string
  recipientAddress: string
}) {
  return NextResponse.json(
    {
      error: input.reason || "Personalized screening payment is required.",
      requiresPayment: true,
      fee: input.fee,
      currency: "USDC",
      recipientAddress: input.recipientAddress,
    },
    { status: 402 }
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get("patientId") || undefined
  const walletAddress = searchParams.get("walletAddress") || undefined
  const paymentId = searchParams.get("paymentId") || undefined
  const analysisLevel = resolveAnalysisLevel(searchParams.get("analysisLevel"))

  if (analysisLevel === "deep") {
    const access = verifyScreeningAccess({ walletAddress, paymentId })
    if (!access.ok) {
      return paymentRequiredResponse({
        reason: access.reason,
        fee: access.fee,
        recipientAddress: access.recipientAddress,
      })
    }
  }

  const assessment = await buildAssessmentPayload(
    { patientId, walletAddress },
    { analysisLevel }
  )
  return NextResponse.json(assessment)
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScreeningInput & {
      walletAddress?: string
      paymentId?: string
      analysisLevel?: ScreeningAnalysisLevel
    }
    const analysisLevel = resolveAnalysisLevel(body.analysisLevel)
    if (analysisLevel === "deep") {
      const access = verifyScreeningAccess({
        walletAddress: body.walletAddress,
        paymentId: body.paymentId,
      })
      if (!access.ok) {
        return paymentRequiredResponse({
          reason: access.reason,
          fee: access.fee,
          recipientAddress: access.recipientAddress,
        })
      }
    }
    const assessment = await buildAssessmentPayload(body, { analysisLevel })
    return NextResponse.json(assessment)
  } catch {
    return NextResponse.json(
      { error: "Failed to compute screening assessment." },
      { status: 400 }
    )
  }
}
