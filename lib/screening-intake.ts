export interface ScreeningIntakeResult {
  ready: boolean
  clarificationQuestion?: string
  extracted: {
    age?: number
    gender?: string
    bmi?: number
    smoker?: boolean
    symptoms: string[]
    familyHistory: string[]
    conditions: string[]
    genes: string[]
  }
}

const GENE_MARKERS = ["brca1", "brca2", "atm", "chek2", "lynch", "mlh1", "msh2", "msh6", "pms2"]

const CONDITION_KEYWORDS = [
  "diabetes",
  "hypertension",
  "hyperlipidemia",
  "kidney disease",
  "copd",
  "asthma",
  "heart disease",
  "stroke",
  "cancer",
]

const SYMPTOM_KEYWORDS = [
  "fatigue",
  "chest pain",
  "chest discomfort",
  "dizziness",
  "shortness of breath",
  "fainting",
  "weight loss",
  "palpitations",
  "headache",
  "abdominal pain",
]

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)))
}

export function parseScreeningIntakeNarrative(input: string): ScreeningIntakeResult {
  const narrative = input.trim()
  const lowered = narrative.toLowerCase()

  const ageMatch =
    lowered.match(/\b(\d{1,3})\s*(?:years?\s*old|yo|y\/o)\b/) ||
    lowered.match(/\bi am\s+(\d{1,3})\b/)
  const age = ageMatch ? Number.parseInt(ageMatch[1], 10) : undefined

  let gender: string | undefined
  if (/\bmale\b|\bman\b|\bgentleman\b/.test(lowered)) gender = "male"
  if (/\bfemale\b|\bwoman\b|\blady\b/.test(lowered)) gender = "female"

  const bmiMatch = lowered.match(/\bbmi\s*(?:is|=|:)?\s*(\d{1,2}(?:\.\d+)?)\b/)
  const bmi = bmiMatch ? Number.parseFloat(bmiMatch[1]) : undefined

  const smoker = /\bsmoker\b|\bsmoking\b|\bsmokes\b/.test(lowered)

  const symptoms = unique(
    SYMPTOM_KEYWORDS.filter((keyword) => lowered.includes(keyword))
  )
  const familyHistory = unique(
    ["family history", "mother", "father", "sibling", "brother", "sister", "uncle", "aunt"]
      .filter((keyword) => lowered.includes(keyword))
      .map(() => {
        if (lowered.includes("prostate")) return "prostate cancer"
        if (lowered.includes("breast")) return "breast cancer"
        if (lowered.includes("colon")) return "colon cancer"
        if (lowered.includes("heart")) return "heart disease"
        if (lowered.includes("stroke")) return "stroke"
        return "family history risk"
      })
  )

  const conditions = unique(
    CONDITION_KEYWORDS.filter((keyword) => lowered.includes(keyword))
  )

  const genes = unique(
    GENE_MARKERS.filter((marker) => lowered.includes(marker))
      .map((marker) => marker.toUpperCase())
  )
  if (genes.length > 0) {
    conditions.push(...genes.map((gene) => `${gene} mutation carrier`))
  }

  const extracted = {
    age,
    gender,
    bmi,
    smoker,
    symptoms,
    familyHistory,
    conditions: unique(conditions),
    genes,
  }

  const missing: string[] = []
  if (!age) missing.push("age")
  if (!gender) missing.push("sex")
  if (extracted.conditions.length === 0 && extracted.familyHistory.length === 0) {
    missing.push("risk history")
  }

  if (missing.length === 0) {
    return { ready: true, extracted }
  }

  let clarificationQuestion = ""
  if (missing.length > 1) {
    clarificationQuestion = "Share your age, sex, and key personal/family risk history so I can finalize screening recommendations."
  } else if (missing[0] === "age") {
    clarificationQuestion = "What is your age?"
  } else if (missing[0] === "sex") {
    clarificationQuestion = "What sex were you assigned at birth (male/female)?"
  } else {
    clarificationQuestion = "Do you have major personal or family risk factors (for example BRCA mutation, cancer, stroke, diabetes)?"
  }

  return {
    ready: false,
    clarificationQuestion,
    extracted,
  }
}
