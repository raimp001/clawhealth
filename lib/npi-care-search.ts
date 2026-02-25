import { currentUser } from "./current-user"

export const CARE_SEARCH_PROMPT_ID = "openrx.npi-care-search.v1" as const
export const CARE_SEARCH_PROMPT_IMAGE_PATH = "/prompts/npi-care-search-prompt.svg" as const

export const CARE_SEARCH_PROMPT_TEXT = `You are OpenRx Care Search.
Goal: Find providers, caregivers, laboratories, and radiology centers in NPI Registry using natural language.
Rules:
1) Extract intent (provider, caregiver, lab, radiology), specialty/role, and location (zip OR city+state).
2) Do not run NPI search until enough info is present.
3) If info is missing, return one concise clarification question.
4) Prefer closest match for specialty and location, then active status.
5) Return structured results with NPI, type, specialty/taxonomy, phone, and full address.
6) Keep outputs patient-friendly and explain what was understood from the query.`

const NPPES_BASE = "https://npiregistry.cms.hhs.gov/api/?version=2.1"

const STATE_MAP: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY", "district of columbia": "DC",
}

const STATE_ABBREVS = new Set(Object.values(STATE_MAP))

const SPECIALTY_MAP: Record<string, string> = {
  cardiologist: "Cardiology",
  cardiology: "Cardiology",
  dermatologist: "Dermatology",
  dermatology: "Dermatology",
  dentist: "Dentist",
  dental: "Dentist",
  endocrinologist: "Endocrinology",
  endocrinology: "Endocrinology",
  diabetes: "Endocrinology",
  "family medicine": "Family Medicine",
  "family doctor": "Family Medicine",
  "internal medicine": "Internal Medicine",
  "primary care": "Internal Medicine",
  pediatrician: "Pediatrics",
  pediatrics: "Pediatrics",
  therapist: "Therapist",
  psychiatrist: "Psychiatry",
  psychiatry: "Psychiatry",
  radiology: "Radiology",
  radiologist: "Radiology",
  neurology: "Neurology",
  neurologist: "Neurology",
  nephrology: "Nephrology",
  nephrologist: "Nephrology",
  oncology: "Oncology",
  oncologist: "Oncology",
  pulmonology: "Pulmonary Disease",
  pulmonologist: "Pulmonary Disease",
  ophthalmology: "Ophthalmology",
  ophthalmologist: "Ophthalmology",
  retina: "Ophthalmology",
  gastroenterology: "Gastroenterology",
  gastroenterologist: "Gastroenterology",
  colonoscopy: "Gastroenterology",
}

const CAREGIVER_ROLE_MAP: Record<string, string> = {
  caregiver: "Home Health",
  "home health": "Home Health",
  "home health aide": "Home Health Aide",
  "personal care": "Personal Care Attendant",
  "personal care attendant": "Personal Care Attendant",
  nurse: "Registered Nurse",
  "registered nurse": "Registered Nurse",
  "nurse practitioner": "Nurse Practitioner",
  "social worker": "Clinical Social Worker",
  "occupational therapist": "Occupational Therapist",
  "physical therapist": "Physical Therapist",
  "speech therapist": "Speech-Language Pathologist",
  "behavior technician": "Behavior Technician",
}

const LAB_KEYWORDS = ["lab", "laboratory", "clinical laboratory", "pathology", "diagnostic lab"]
const RADIOLOGY_KEYWORDS = ["radiology", "imaging", "mri", "ct", "xray", "ultrasound", "mammography"]

export type CareSearchType = "provider" | "caregiver" | "lab" | "radiology"

export interface ParsedCareQuery {
  query: string
  serviceTypes: CareSearchType[]
  specialty?: string
  caregiverRole?: string
  city?: string
  state?: string
  zip?: string
  normalizedQuery: string
  ready: boolean
  missingInfo: string[]
  clarificationQuestion?: string
}

export interface CareDirectoryMatch {
  kind: CareSearchType
  npi: string
  name: string
  status: string
  specialty: string
  taxonomyCode: string
  phone: string
  fullAddress: string
  confidence: "high" | "medium"
}

interface NppesAddress {
  address_purpose?: string
  address_1?: string
  address_2?: string
  city?: string
  state?: string
  postal_code?: string
  telephone_number?: string
  fax_number?: string
}

interface NppesTaxonomy {
  code?: string
  desc?: string
  primary?: boolean
}

interface NppesBasic {
  first_name?: string
  last_name?: string
  organization_name?: string
  credential?: string
  gender?: string
  status?: string
  last_updated?: string
}

interface NppesResult {
  number?: string
  basic?: NppesBasic
  addresses?: NppesAddress[]
  taxonomies?: NppesTaxonomy[]
}

interface NppesResponse {
  result_count?: number
  results?: NppesResult[]
}

function includesAny(source: string, values: string[]): boolean {
  return values.some((value) => source.includes(value))
}

function parseLocation(working: string): {
  city?: string
  state?: string
  zip?: string
  cleaned: string
} {
  let text = working
  let zip: string | undefined
  let city: string | undefined
  let state: string | undefined

  const zipMatch = text.match(/\b(\d{5})(?:-\d{4})?\b/)
  if (zipMatch) {
    zip = zipMatch[1]
    text = text.replace(zipMatch[0], " ")
  }

  const lowered = text.toLowerCase()
  for (const [stateName, abbreviation] of Object.entries(STATE_MAP)) {
    if (lowered.includes(stateName)) {
      state = abbreviation
      text = text.replace(new RegExp(stateName, "i"), " ")
      break
    }
  }

  if (!state) {
    const stateAbbrevMatch = text.match(/\b([A-Z]{2})\b/)
    if (stateAbbrevMatch && STATE_ABBREVS.has(stateAbbrevMatch[1])) {
      state = stateAbbrevMatch[1]
      text = text.replace(stateAbbrevMatch[0], " ")
    }
  }

  if (!state) {
    const trailingLowerMatch = text.match(/\b([a-z]{2})\b\s*$/)
    if (trailingLowerMatch) {
      const candidate = trailingLowerMatch[1].toUpperCase()
      if (STATE_ABBREVS.has(candidate)) {
        state = candidate
        text = text.replace(new RegExp(`${trailingLowerMatch[1]}\\s*$`), " ")
      }
    }
  }

  text = text.replace(/[,.]+/g, " ").replace(/\s+/g, " ").trim()

  const normalizedForCity = text
    .replace(/\b(find|search|look|need|want|please|for|near|in|around|nearby|closest|me)\b/gi, " ")
    .replace(
      /\b(provider|providers|doctor|doctors|caregiver|caregivers|lab|labs|laboratory|radiology|center|centers|clinic|imaging)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim()

  if (normalizedForCity) {
    const words = normalizedForCity.split(" ")
    if (words.length <= 3) {
      city = normalizedForCity
    } else if (state && !zip) {
      city = words[words.length - 1]
    }
  }

  return { city, state, zip, cleaned: text }
}

function extractMappedValue(input: string, map: Record<string, string>): string | undefined {
  const lowered = input.toLowerCase()
  let mapped: string | undefined
  for (const key of Object.keys(map)) {
    if (lowered.includes(key)) {
      mapped = map[key]
      break
    }
  }
  return mapped
}

function buildClarification(missingInfo: string[], parsed: ParsedCareQuery): string {
  if (missingInfo.length === 0) return ""
  if (missingInfo.length === 2) {
    return "Tell me both what you need and where. Example: 'Find a caregiver and radiology center near Portland OR 97209'."
  }
  if (missingInfo[0] === "service") {
    return "What should I search for: provider, caregiver, lab, or radiology center?"
  }
  if (parsed.city && !parsed.state && !parsed.zip) {
    return `I found "${parsed.city}". Add a state or ZIP so I can start NPI search.`
  }
  if (parsed.state && !parsed.city && !parsed.zip) {
    return `I found state "${parsed.state}". Add a city or ZIP so I can start NPI search.`
  }
  if (!parsed.city && !parsed.zip) {
    return "What city/state or ZIP should I search near?"
  }
  return "Please add the missing detail so I can run NPI search."
}

export function parseCareSearchQuery(query: string): ParsedCareQuery {
  const original = query.trim()
  let working = original
    .replace(/\b(find|search|look|need|want|please|for|near|in|around|nearby|closest|me)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()

  const lowered = working.toLowerCase()
  const serviceTypes: CareSearchType[] = []

  if (includesAny(lowered, LAB_KEYWORDS)) serviceTypes.push("lab")
  if (includesAny(lowered, RADIOLOGY_KEYWORDS)) serviceTypes.push("radiology")
  if (extractMappedValue(lowered, CAREGIVER_ROLE_MAP)) serviceTypes.push("caregiver")
  if (extractMappedValue(lowered, SPECIALTY_MAP) || lowered.includes("provider") || lowered.includes("doctor")) {
    serviceTypes.push("provider")
  }

  const uniqueTypes = Array.from(new Set(serviceTypes))
  const specialty = extractMappedValue(lowered, SPECIALTY_MAP)
  const caregiverRole = extractMappedValue(lowered, CAREGIVER_ROLE_MAP)

  const location = parseLocation(original)
  working = location.cleaned

  const missingInfo: string[] = []
  if (uniqueTypes.length === 0) missingInfo.push("service")
  if (!location.zip && !(location.city && location.state)) missingInfo.push("location")

  const ready = missingInfo.length === 0
  const parsed: ParsedCareQuery = {
    query: original,
    serviceTypes: uniqueTypes,
    specialty,
    caregiverRole,
    city: location.city,
    state: location.state,
    zip: location.zip,
    normalizedQuery: working,
    ready,
    missingInfo,
  }

  if (!ready) {
    parsed.clarificationQuestion = buildClarification(missingInfo, parsed)
  }

  return parsed
}

function applyLocation(params: URLSearchParams, parsed: ParsedCareQuery): void {
  if (parsed.city) params.set("city", parsed.city)
  if (parsed.state) params.set("state", parsed.state)
  if (parsed.zip) params.set("postal_code", parsed.zip)
}

interface SearchPlan {
  serviceType: CareSearchType
  params: URLSearchParams
}

function buildSearchPlan(parsed: ParsedCareQuery, limit: number): SearchPlan[] {
  const plans: SearchPlan[] = []
  const targetTypes = parsed.serviceTypes

  targetTypes.forEach((serviceType) => {
    const params = new URLSearchParams()
    params.set("version", "2.1")
    params.set("limit", String(limit))
    params.set("skip", "0")
    applyLocation(params, parsed)

    if (serviceType === "provider") {
      params.set("enumeration_type", "NPI-1")
      if (parsed.specialty) params.set("taxonomy_description", parsed.specialty)
    }

    if (serviceType === "caregiver") {
      params.set("enumeration_type", "NPI-1")
      params.set("taxonomy_description", parsed.caregiverRole || "home health")
    }

    if (serviceType === "lab") {
      params.set("enumeration_type", "NPI-2")
      params.set("taxonomy_description", "laboratory")
    }

    if (serviceType === "radiology") {
      params.set("enumeration_type", "NPI-2")
      params.set("taxonomy_description", "radiology")
    }

    plans.push({ serviceType, params })
  })

  return plans
}

function classifyKind(desc: string, requested: CareSearchType): CareSearchType {
  const lowered = desc.toLowerCase()
  if (includesAny(lowered, RADIOLOGY_KEYWORDS)) return "radiology"
  if (includesAny(lowered, LAB_KEYWORDS)) return "lab"
  if (extractMappedValue(lowered, CAREGIVER_ROLE_MAP)) return "caregiver"
  if (requested) return requested
  return "provider"
}

function mapResult(result: NppesResult, requested: CareSearchType, parsed: ParsedCareQuery): CareDirectoryMatch | null {
  if (!result.number) return null
  const basic = result.basic || {}
  const addresses = result.addresses || []
  const taxonomies = result.taxonomies || []
  const locationAddress =
    addresses.find((address) => address.address_purpose === "LOCATION") ||
    addresses[0] ||
    {}
  const taxonomy =
    taxonomies.find((entry) => entry.primary) ||
    taxonomies[0] ||
    {}
  const taxonomyDesc = taxonomy.desc || ""
  const kind = classifyKind(taxonomyDesc, requested)
  const isHighConfidence =
    (!!parsed.specialty && taxonomyDesc.toLowerCase().includes(parsed.specialty.toLowerCase())) ||
    (!!parsed.caregiverRole && taxonomyDesc.toLowerCase().includes(parsed.caregiverRole.toLowerCase())) ||
    kind === requested

  const fullAddress = [
    locationAddress.address_1,
    locationAddress.address_2,
    `${locationAddress.city || ""}, ${locationAddress.state || ""} ${(locationAddress.postal_code || "").slice(0, 5)}`,
  ]
    .filter(Boolean)
    .join(", ")

  const fullName = basic.organization_name
    ? basic.organization_name
    : `${basic.first_name || ""} ${basic.last_name || ""}`.trim()

  return {
    kind,
    npi: result.number,
    name: fullName || "Unknown",
    status: basic.status === "A" ? "Active" : basic.status || "Active",
    specialty: taxonomyDesc,
    taxonomyCode: taxonomy.code || "",
    phone: locationAddress.telephone_number || "",
    fullAddress,
    confidence: isHighConfidence ? "high" : "medium",
  }
}

export async function searchNpiCareDirectory(
  query: string,
  options?: { limit?: number }
): Promise<{
  ready: boolean
  parsed: ParsedCareQuery
  clarificationQuestion?: string
  prompt: {
    id: typeof CARE_SEARCH_PROMPT_ID
    image: typeof CARE_SEARCH_PROMPT_IMAGE_PATH
    text: string
  }
  matches: CareDirectoryMatch[]
}> {
  const parsed = parseCareSearchQuery(query)
  const limit = Math.min(Math.max(1, options?.limit || 20), 50)
  if (!parsed.ready) {
    return {
      ready: false,
      parsed,
      clarificationQuestion: parsed.clarificationQuestion,
      prompt: {
        id: CARE_SEARCH_PROMPT_ID,
        image: CARE_SEARCH_PROMPT_IMAGE_PATH,
        text: CARE_SEARCH_PROMPT_TEXT,
      },
      matches: [],
    }
  }

  const plan = buildSearchPlan(parsed, limit)
  const results: CareDirectoryMatch[] = []
  const dedupe = new Set<string>()

  for (const searchStep of plan) {
    const response = await fetch(`${NPPES_BASE}&${searchStep.params.toString()}`, {
      next: { revalidate: 300 },
    })
    if (!response.ok) continue
    const payload = (await response.json()) as NppesResponse
    const list = payload.results || []
    list.forEach((entry) => {
      const mapped = mapResult(entry, searchStep.serviceType, parsed)
      if (!mapped) return
      const key = `${mapped.kind}:${mapped.npi}`
      if (dedupe.has(key)) return
      dedupe.add(key)
      results.push(mapped)
    })
  }

  const sorted = results.sort((a, b) => {
    if (a.confidence !== b.confidence) return a.confidence === "high" ? -1 : 1
    if (a.status !== b.status) return a.status === "Active" ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return {
    ready: true,
    parsed,
    prompt: {
      id: CARE_SEARCH_PROMPT_ID,
      image: CARE_SEARCH_PROMPT_IMAGE_PATH,
      text: CARE_SEARCH_PROMPT_TEXT,
    },
    matches: sorted.slice(0, limit),
  }
}

export function buildPatientLocalCareQuery(opts: {
  requestedServices: CareSearchType[]
  specialtyHint?: string
  patientAddress?: string
}): string {
  const servicePhrase = opts.requestedServices
    .map((service) => {
      if (service === "provider") return "providers"
      if (service === "caregiver") return "caregivers"
      if (service === "lab") return "labs"
      return "radiology centers"
    })
    .join(" and ")
  const specialty = opts.specialtyHint ? `${opts.specialtyHint} ` : ""
  const location = opts.patientAddress || currentUser.address
  return `Find ${specialty}${servicePhrase} near ${location}`
}
