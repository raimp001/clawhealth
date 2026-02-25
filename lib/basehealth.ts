import { currentUser } from "./current-user"
import {
  getPatient,
  getPatientLabResults,
  getPatientVaccinations,
  getPatientVitals,
  type Patient,
} from "./seed-data"

export type RiskTier = "low" | "moderate" | "high"
export type RiskImpact = "protective" | "monitor" | "elevated" | "urgent"

export interface ScreeningInput {
  patientId?: string
  age?: number
  bmi?: number
  smoker?: boolean
  familyHistory?: string[]
  symptoms?: string[]
  conditions?: string[]
}

export interface ScreeningFactor {
  label: string
  impact: RiskImpact
  scoreDelta: number
  evidence: string
}

export interface ScreeningRecommendation {
  id: string
  name: string
  priority: "low" | "medium" | "high"
  ownerAgent: "screening" | "wellness" | "scheduling" | "trials"
  reason: string
}

export interface ScreeningAssessment {
  patientId: string
  generatedAt: string
  overallRiskScore: number
  riskTier: RiskTier
  factors: ScreeningFactor[]
  recommendedScreenings: ScreeningRecommendation[]
  nextActions: string[]
}

export interface SecondOpinionInput {
  patientId?: string
  diagnosis: string
  currentPlan: string
  symptoms?: string[]
  medications?: string[]
}

export interface SecondOpinionResult {
  generatedAt: string
  diagnosis: string
  agreement: "supports-current-plan" | "partial-agreement" | "needs-clinician-review"
  confidence: "low" | "moderate" | "high"
  summary: string
  keyQuestions: string[]
  alternativeConsiderations: string[]
  redFlags: string[]
  specialistSuggestions: string[]
}

export interface TrialMatchInput {
  patientId?: string
  condition?: string
  location?: string
}

export interface TrialMatch {
  id: string
  title: string
  phase: string
  status: string
  sponsor: string
  location: string
  remoteEligible: boolean
  condition: string
  matchScore: number
  fit: "strong" | "possible"
  reasons: string[]
  url: string
  summary: string
}

interface TrialListing {
  id: string
  title: string
  condition: string
  phase: string
  status: "recruiting" | "active-not-recruiting"
  sponsor: string
  location: string
  remoteEligible: boolean
  minAge: number
  maxAge: number
  inclusionKeywords: string[]
  exclusionKeywords: string[]
  summary: string
  url: string
}

export const CLINICAL_TRIAL_CATALOG: TrialListing[] = [
  {
    id: "trial-diabetes-001",
    title: "Cardiometabolic Outcomes in Type 2 Diabetes",
    condition: "type 2 diabetes",
    phase: "Phase III",
    status: "recruiting",
    sponsor: "Northwest Metabolic Institute",
    location: "Portland, OR",
    remoteEligible: true,
    minAge: 40,
    maxAge: 80,
    inclusionKeywords: ["type 2 diabetes", "a1c", "metformin"],
    exclusionKeywords: ["dialysis"],
    summary: "Evaluates cardiometabolic outcomes for adults with type 2 diabetes on standard therapy.",
    url: "https://clinicaltrials.gov/search?term=type+2+diabetes+cardiometabolic",
  },
  {
    id: "trial-renal-002",
    title: "Early Diabetic Kidney Disease Monitoring Program",
    condition: "diabetic nephropathy",
    phase: "Phase II",
    status: "recruiting",
    sponsor: "Cascade Kidney Research Group",
    location: "Portland, OR",
    remoteEligible: false,
    minAge: 35,
    maxAge: 85,
    inclusionKeywords: ["microalbumin", "diabetes", "egfr"],
    exclusionKeywords: ["transplant"],
    summary: "Tracks progression and intervention outcomes in early diabetic nephropathy.",
    url: "https://clinicaltrials.gov/search?term=diabetic+nephropathy+monitoring",
  },
  {
    id: "trial-lipid-003",
    title: "Precision Lipid-Lowering Pathway Study",
    condition: "hyperlipidemia",
    phase: "Phase II",
    status: "recruiting",
    sponsor: "Pacific Heart Labs",
    location: "Seattle, WA",
    remoteEligible: true,
    minAge: 30,
    maxAge: 75,
    inclusionKeywords: ["ldl", "statin", "cholesterol"],
    exclusionKeywords: ["active liver disease"],
    summary: "Personalized lipid-lowering strategies guided by biomarker profile.",
    url: "https://clinicaltrials.gov/search?term=hyperlipidemia+precision",
  },
  {
    id: "trial-hypertension-004",
    title: "Hybrid Blood Pressure Telemonitoring Trial",
    condition: "hypertension",
    phase: "Phase IV",
    status: "recruiting",
    sponsor: "US Preventive Care Collaborative",
    location: "Remote + U.S. Sites",
    remoteEligible: true,
    minAge: 18,
    maxAge: 85,
    inclusionKeywords: ["hypertension", "home monitoring", "telehealth"],
    exclusionKeywords: ["pregnancy"],
    summary: "Compares clinic-only versus hybrid telemonitoring blood pressure control pathways.",
    url: "https://clinicaltrials.gov/search?term=hypertension+telemonitoring",
  },
  {
    id: "trial-prevention-005",
    title: "Multimorbidity Preventive Screening Program",
    condition: "preventive care",
    phase: "Phase III",
    status: "recruiting",
    sponsor: "Preventive Health Equity Network",
    location: "San Francisco, CA",
    remoteEligible: true,
    minAge: 45,
    maxAge: 80,
    inclusionKeywords: ["screening", "preventive", "risk stratification"],
    exclusionKeywords: ["active cancer treatment"],
    summary: "Risk-stratified preventive screening cadence for adults with chronic conditions.",
    url: "https://clinicaltrials.gov/search?term=preventive+screening+risk",
  },
  {
    id: "trial-cardiac-006",
    title: "Atherosclerotic Risk Reduction in Diabetes",
    condition: "cardiovascular risk",
    phase: "Phase III",
    status: "active-not-recruiting",
    sponsor: "West Coast Cardio Alliance",
    location: "Los Angeles, CA",
    remoteEligible: false,
    minAge: 45,
    maxAge: 85,
    inclusionKeywords: ["diabetes", "ldl", "hypertension"],
    exclusionKeywords: ["recent stroke"],
    summary: "Intensive risk reduction for adults with elevated cardiovascular risk and diabetes.",
    url: "https://clinicaltrials.gov/search?term=diabetes+cardiovascular+risk+reduction",
  },
]

function resolvePatient(patientId?: string): Patient {
  if (patientId) {
    const found = getPatient(patientId)
    if (found) return found
  }
  return currentUser
}

function calcAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth)
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const monthDiff = now.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--
  }
  return age
}

function priorityWeight(priority: ScreeningRecommendation["priority"]): number {
  if (priority === "high") return 3
  if (priority === "medium") return 2
  return 1
}

function parseLabValue(value: string): number | null {
  const numeric = Number.parseFloat(value)
  if (Number.isNaN(numeric)) return null
  return numeric
}

export function assessHealthScreening(input: ScreeningInput = {}): ScreeningAssessment {
  const patient = resolvePatient(input.patientId)
  const age = input.age ?? calcAge(patient.date_of_birth)
  const vitals = getPatientVitals(patient.id)
  const labs = getPatientLabResults(patient.id)
  const vaccines = getPatientVaccinations(patient.id)

  const latestVital = vitals[0]
  const conditionSet = new Set(
    [...patient.medical_history.map((item) => item.condition), ...(input.conditions || [])].map((item) =>
      item.toLowerCase()
    )
  )
  const symptoms = (input.symptoms || []).map((item) => item.toLowerCase())
  const familyHistory = (input.familyHistory || []).map((item) => item.toLowerCase())

  const factors: ScreeningFactor[] = []
  let score = 10

  function addFactor(label: string, scoreDelta: number, impact: RiskImpact, evidence: string) {
    score += scoreDelta
    factors.push({ label, scoreDelta, impact, evidence })
  }

  if (age >= 65) addFactor("Age 65+", 18, "elevated", "Higher baseline chronic disease risk.")
  else if (age >= 50) addFactor("Age 50-64", 11, "monitor", "Preventive screening intensity should increase.")
  else if (age >= 35) addFactor("Age 35-49", 5, "monitor", "Moderate preventive monitoring window.")

  if (Array.from(conditionSet).some((item) => item.includes("diabetes"))) {
    addFactor("Type 2 diabetes history", 22, "elevated", "Existing cardiometabolic risk driver.")
  }
  if (Array.from(conditionSet).some((item) => item.includes("hypertension"))) {
    addFactor("Hypertension history", 13, "elevated", "Blood pressure control affects stroke and kidney risk.")
  }
  if (Array.from(conditionSet).some((item) => item.includes("hyperlipidemia"))) {
    addFactor("Hyperlipidemia history", 10, "monitor", "LDL control remains a long-term target.")
  }

  if (input.smoker) {
    addFactor("Smoking exposure", 12, "elevated", "Smoking increases cardiopulmonary risk.")
  }

  if (latestVital?.systolic && latestVital?.diastolic) {
    if (latestVital.systolic >= 140 || latestVital.diastolic >= 90) {
      addFactor("Recent elevated blood pressure", 12, "elevated", "Latest reading above preferred target.")
    } else if (latestVital.systolic >= 130 || latestVital.diastolic >= 80) {
      addFactor("Borderline blood pressure", 6, "monitor", "Close monitoring recommended.")
    }
  }

  const a1cResult = labs.find((lab) => lab.test_name.toLowerCase().includes("a1c"))
  const a1cValue = a1cResult ? parseLabValue(a1cResult.results[0]?.value || "") : null
  if (a1cValue !== null) {
    if (a1cValue >= 7) addFactor("A1C >= 7.0", 12, "elevated", "Glycemic control is above most targets.")
    else if (a1cValue >= 6.5) addFactor("A1C 6.5-6.9", 8, "monitor", "Risk remains elevated despite improvement.")
    else addFactor("A1C under 6.5", -4, "protective", "Current glycemic control is favorable.")
  }

  if (typeof input.bmi === "number") {
    if (input.bmi >= 35) addFactor("BMI >= 35", 14, "elevated", "Higher metabolic risk burden.")
    else if (input.bmi >= 30) addFactor("BMI 30-34.9", 8, "monitor", "Weight management remains an active lever.")
    else if (input.bmi < 25) addFactor("BMI under 25", -3, "protective", "Healthy weight range lowers baseline risk.")
  }

  const urgentSymptoms = ["chest pain", "shortness of breath", "fainting", "vision loss"]
  if (symptoms.some((symptom) => urgentSymptoms.some((urgent) => symptom.includes(urgent)))) {
    addFactor("Urgent symptom pattern", 22, "urgent", "Immediate triage escalation recommended.")
  }

  if (familyHistory.length > 0) {
    const familyScore = Math.min(12, familyHistory.length * 3)
    addFactor(
      "Family history signals",
      familyScore,
      "monitor",
      `Reported ${familyHistory.length} family history risk factor(s).`
    )
  }

  const overdueVaccines = vaccines.filter((vaccine) => vaccine.status === "overdue")
  if (overdueVaccines.length > 0) {
    addFactor(
      "Overdue vaccinations",
      6,
      "monitor",
      `${overdueVaccines.length} vaccine(s) are overdue and increase avoidable risk.`
    )
  }

  score = Math.max(0, Math.min(100, score))

  const riskTier: RiskTier = score >= 65 ? "high" : score >= 35 ? "moderate" : "low"
  const recommendations: ScreeningRecommendation[] = []

  function addRecommendation(rec: ScreeningRecommendation) {
    recommendations.push(rec)
  }

  if (Array.from(conditionSet).some((item) => item.includes("diabetes"))) {
    addRecommendation({
      id: "a1c-quarterly",
      name: "Quarterly Hemoglobin A1C",
      priority: "high",
      ownerAgent: "screening",
      reason: "A1C trend should be tracked every 3 months for diabetes control.",
    })
    addRecommendation({
      id: "retina-annual",
      name: "Annual retinal exam",
      priority: "high",
      ownerAgent: "wellness",
      reason: "Diabetes increases retinopathy risk; annual screening is recommended.",
    })
    addRecommendation({
      id: "kidney-panel",
      name: "Microalbumin and kidney function panel",
      priority: "high",
      ownerAgent: "screening",
      reason: "Urine protein history indicates closer kidney monitoring is useful.",
    })
  }

  if (age >= 45) {
    addRecommendation({
      id: "colon-screening",
      name: "Colorectal cancer screening",
      priority: "medium",
      ownerAgent: "scheduling",
      reason: "Adults over 45 should stay current on colon cancer screening cadence.",
    })
  }

  if (age >= 50 && (input.smoker || Array.from(conditionSet).some((item) => item.includes("copd")))) {
    addRecommendation({
      id: "lung-screen",
      name: "Low-dose CT lung screening",
      priority: "medium",
      ownerAgent: "screening",
      reason: "Age plus smoking risk profile can warrant annual lung screening.",
    })
  }

  vaccines
    .filter((vaccine) => vaccine.status === "due" || vaccine.status === "overdue")
    .forEach((vaccine, index) => {
      addRecommendation({
        id: `vaccine-${index}`,
        name: `${vaccine.vaccine_name} update`,
        priority: vaccine.status === "overdue" ? "high" : "medium",
        ownerAgent: "scheduling",
        reason: vaccine.status === "overdue" ? "Vaccine is overdue." : "Vaccine is due soon.",
      })
    })

  addRecommendation({
    id: "risk-recheck",
    name: "Repeat AI risk screening in 30 days",
    priority: "low",
    ownerAgent: "screening",
    reason: "Continuous monitoring catches trend changes early.",
  })

  const orderedRecommendations = recommendations.sort(
    (a, b) => priorityWeight(b.priority) - priorityWeight(a.priority)
  )

  const nextActions = [
    riskTier === "high"
      ? "Book a clinician review within 7 days to confirm risk priorities."
      : riskTier === "moderate"
      ? "Review this plan with your primary care team during your next visit."
      : "Continue preventive cadence and re-screen monthly.",
    "Share any new symptoms immediately with the triage or screening agent.",
    "Track adherence and blood pressure readings to improve trend confidence.",
  ]

  return {
    patientId: patient.id,
    generatedAt: new Date().toISOString(),
    overallRiskScore: score,
    riskTier,
    factors: factors.sort((a, b) => b.scoreDelta - a.scoreDelta),
    recommendedScreenings: orderedRecommendations,
    nextActions,
  }
}

export function reviewSecondOpinion(input: SecondOpinionInput): SecondOpinionResult {
  const patient = resolvePatient(input.patientId)
  const diagnosis = input.diagnosis.trim()
  const plan = input.currentPlan.trim()
  const diagnosisLower = diagnosis.toLowerCase()
  const planLower = plan.toLowerCase()

  const redFlags: string[] = []
  const symptomText = (input.symptoms || []).join(" ").toLowerCase()
  if (symptomText.includes("chest pain") || symptomText.includes("shortness of breath")) {
    redFlags.push("Potential emergency symptom language detected; urgent triage should be considered.")
  }
  if (symptomText.includes("confusion") || symptomText.includes("fainting")) {
    redFlags.push("Neurologic warning symptoms reported; same-day clinician follow-up is advised.")
  }

  let agreement: SecondOpinionResult["agreement"] = "partial-agreement"
  let confidence: SecondOpinionResult["confidence"] = "moderate"

  const matchesDiabetesPath =
    diagnosisLower.includes("diabetes") &&
    planLower.includes("metformin") &&
    (planLower.includes("a1c") || planLower.includes("lifestyle"))
  if (matchesDiabetesPath) {
    agreement = "supports-current-plan"
    confidence = "high"
  } else if (plan.length < 40 || diagnosis.length < 10) {
    agreement = "needs-clinician-review"
    confidence = "low"
  }

  const keyQuestions = [
    "What objective markers would confirm that this treatment is working in 90 days?",
    "What would trigger a treatment escalation or specialist referral?",
    "Are there lower-cost alternatives with similar outcomes for this plan?",
  ]

  if (diagnosisLower.includes("diabetes")) {
    keyQuestions.push("Should kidney protection or cardiometabolic therapy be adjusted now or after the next A1C?")
  }
  if (diagnosisLower.includes("hypertension")) {
    keyQuestions.push("Would home blood pressure averaging change medication targets?")
  }

  const alternativeConsiderations = [
    "Medication adherence barriers should be reviewed before assuming treatment failure.",
    "Coordinating nutrition and activity goals can improve outcomes without adding medications.",
    "Shared decision-making on side effects versus benefits may improve long-term plan adherence.",
  ]

  if (patient.medical_history.some((item) => item.condition.toLowerCase().includes("kidney"))) {
    alternativeConsiderations.push("Kidney function trends should be monitored when adjusting cardiometabolic medications.")
  }

  const specialistSuggestions: string[] = []
  if (diagnosisLower.includes("diabetes")) specialistSuggestions.push("Endocrinology")
  if (diagnosisLower.includes("kidney") || diagnosisLower.includes("nephro")) specialistSuggestions.push("Nephrology")
  if (diagnosisLower.includes("cardio") || diagnosisLower.includes("hypertension")) specialistSuggestions.push("Cardiology")
  if (specialistSuggestions.length === 0) specialistSuggestions.push("Primary Care Follow-up")

  const summary =
    agreement === "supports-current-plan"
      ? "The current plan aligns with guideline-consistent chronic care management, but should still be reviewed by your clinician."
      : agreement === "partial-agreement"
      ? "The plan appears directionally appropriate, but there are unresolved details worth clarifying with your clinician."
      : "The available details are too limited for confidence; a direct clinician review is strongly recommended."

  return {
    generatedAt: new Date().toISOString(),
    diagnosis,
    agreement,
    confidence,
    summary,
    keyQuestions,
    alternativeConsiderations,
    redFlags,
    specialistSuggestions,
  }
}

export function matchClinicalTrials(input: TrialMatchInput = {}): TrialMatch[] {
  const patient = resolvePatient(input.patientId)
  const age = calcAge(patient.date_of_birth)
  const locationQuery = (input.location || "").toLowerCase()
  const conditionQuery = (input.condition || "").toLowerCase()
  const conditionText = patient.medical_history.map((item) => item.condition.toLowerCase()).join(" ")

  const matches: TrialMatch[] = []

  for (const trial of CLINICAL_TRIAL_CATALOG) {
    if (trial.status !== "recruiting") continue
    if (age < trial.minAge || age > trial.maxAge) continue

    let score = 20
    const reasons: string[] = []

    if (conditionQuery) {
      if (trial.condition.includes(conditionQuery) || conditionQuery.includes(trial.condition)) {
        score += 35
        reasons.push(`Condition focus matches "${input.condition}".`)
      } else if (trial.summary.toLowerCase().includes(conditionQuery)) {
        score += 18
        reasons.push("Condition partially matches trial focus.")
      }
    } else if (conditionText.includes(trial.condition) || trial.condition.includes("preventive care")) {
      score += 25
      reasons.push("Matched using your known medical history.")
    }

    if (locationQuery) {
      if (trial.location.toLowerCase().includes(locationQuery)) {
        score += 18
        reasons.push("Trial location matches your preferred area.")
      } else if (trial.remoteEligible) {
        score += 10
        reasons.push("Remote participation available.")
      }
    } else if (trial.remoteEligible || trial.location.toLowerCase().includes("portland")) {
      score += 8
      reasons.push("Accessible by remote visit or nearby region.")
    }

    const inclusionHits = trial.inclusionKeywords.filter((keyword) => {
      const lowerKeyword = keyword.toLowerCase()
      return conditionText.includes(lowerKeyword) || conditionQuery.includes(lowerKeyword)
    })
    if (inclusionHits.length > 0) {
      score += Math.min(20, inclusionHits.length * 6)
      reasons.push(`Inclusion criteria overlap: ${inclusionHits.join(", ")}.`)
    }

    const exclusionHit = trial.exclusionKeywords.find((keyword) =>
      conditionText.includes(keyword.toLowerCase())
    )
    if (exclusionHit) {
      score -= 18
      reasons.push(`Potential exclusion risk: ${exclusionHit}.`)
    }

    if (score < 35) continue

    matches.push({
      id: trial.id,
      title: trial.title,
      phase: trial.phase,
      status: trial.status,
      sponsor: trial.sponsor,
      location: trial.location,
      remoteEligible: trial.remoteEligible,
      condition: trial.condition,
      matchScore: Math.min(100, score),
      fit: score >= 65 ? "strong" : "possible",
      reasons,
      url: trial.url,
      summary: trial.summary,
    })
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10)
}
