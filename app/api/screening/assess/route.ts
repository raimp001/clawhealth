import { NextRequest, NextResponse } from "next/server"
import {
  assessHealthScreening,
  type ScreeningAssessment,
  type ScreeningInput,
  type ScreeningRecommendation,
} from "@/lib/basehealth"
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
}

const CARE_MATCH_LIMIT = 10
const MAX_CONNECTIONS = 3

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
  input: ScreeningInput & { walletAddress?: string }
): Promise<ScreeningAssessmentPayload> {
  const snapshot = await loadSnapshotForRequest({
    walletAddress: input.walletAddress,
    patientId: input.patientId,
  })

  const livePatient = snapshot.patient
  const assessment = assessHealthScreening({
    ...input,
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

  const patientAddress = livePatient?.address || process.env.OPENRX_DEFAULT_PATIENT_LOCATION || ""
  const localCareConnections = await buildLocalCareConnections(assessment, patientAddress)
  return {
    ...assessment,
    localCareConnections,
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get("patientId") || undefined
  const walletAddress = searchParams.get("walletAddress") || undefined

  const assessment = await buildAssessmentPayload({ patientId, walletAddress })
  return NextResponse.json(assessment)
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScreeningInput & { walletAddress?: string }
    const assessment = await buildAssessmentPayload(body)
    return NextResponse.json(assessment)
  } catch {
    return NextResponse.json(
      { error: "Failed to compute screening assessment." },
      { status: 400 }
    )
  }
}
