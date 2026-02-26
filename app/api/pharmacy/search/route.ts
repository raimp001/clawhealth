import { NextRequest, NextResponse } from "next/server"
import { fetchWithTimeout, isAbortError } from "@/lib/fetch-with-timeout"

const NPPES_BASE = "https://npiregistry.cms.hhs.gov/api/?version=2.1"
export const dynamic = "force-dynamic"
const PHARMACY_SEARCH_PROMPT_ID = "openrx.pharmacy-search.v1"
const PHARMACY_SEARCH_PROMPT_IMAGE = "/prompts/pharmacy-search-prompt.svg"
const PHARMACY_SEARCH_PROMPT_TEXT = `You are OpenRx Pharmacy Search.
Goal: Convert natural language into safe pharmacy NPI searches.
Rules:
1) Extract pharmacy name (optional) and location (ZIP OR city+state).
2) Do not search until location is complete.
3) Ask one concise clarification question if location is missing.
4) Return pharmacy organization records with NPI, taxonomy, phone, and full address.`

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
const KNOWN_PHARMACY_NAMES = [
  "walgreens",
  "cvs",
  "rite aid",
  "costco",
  "walmart",
  "safeway",
  "kroger",
  "capsule",
  "cost plus drugs",
]

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
  organization_name?: string
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

interface ParsedPharmacyQuery {
  query: string
  normalizedQuery: string
  name?: string
  city?: string
  state?: string
  zip?: string
  ready: boolean
  clarificationQuestion?: string
}

function parseLocation(input: string): { city?: string; state?: string; zip?: string; cleaned: string } {
  let text = input
  let zip: string | undefined
  let state: string | undefined
  let city: string | undefined

  const zipMatch = text.match(/\b(\d{5})(?:-\d{4})?\b/)
  if (zipMatch) {
    zip = zipMatch[1]
    text = text.replace(zipMatch[0], " ")
  }

  const lowered = text.toLowerCase()
  for (const [name, abbreviation] of Object.entries(STATE_MAP)) {
    if (lowered.includes(name)) {
      state = abbreviation
      text = text.replace(new RegExp(name, "i"), " ")
      break
    }
  }

  if (!state) {
    const stateUpper = text.match(/\b([A-Z]{2})\b/)
    if (stateUpper && STATE_ABBREVS.has(stateUpper[1])) {
      state = stateUpper[1]
      text = text.replace(stateUpper[0], " ")
    }
  }

  if (!state) {
    const stateLowerTail = text.match(/\b([a-z]{2})\b\s*$/)
    if (stateLowerTail) {
      const candidate = stateLowerTail[1].toUpperCase()
      if (STATE_ABBREVS.has(candidate)) {
        state = candidate
        text = text.replace(new RegExp(`${stateLowerTail[1]}\\s*$`), " ")
      }
    }
  }

  const cityCandidate = text
    .replace(/\b(find|search|look|for|near|in|around|need|pharmacy|pharmacies|closest|me|a|an|the)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (cityCandidate) {
    const tokens = cityCandidate.split(" ")
    if (tokens.length <= 3) city = cityCandidate
  }

  const cleaned = text.replace(/[,.]+/g, " ").replace(/\s+/g, " ").trim()
  return { city, state, zip, cleaned }
}

function parsePharmacyName(query: string): string | undefined {
  const lowered = query.toLowerCase()
  const quoted = query.match(/"([^"]+)"/)
  if (quoted?.[1]) return quoted[1].trim()

  for (const known of KNOWN_PHARMACY_NAMES) {
    if (lowered.includes(known)) {
      return known
        .split(" ")
        .map((token) => token.slice(0, 1).toUpperCase() + token.slice(1))
        .join(" ")
    }
  }

  const byName = query.match(/\b(?:named|called)\s+([a-zA-Z0-9'&.\-\s]{2,40})/i)
  if (byName?.[1]) return byName[1].trim()
  return undefined
}

function parseNaturalLanguageQuery(query: string): ParsedPharmacyQuery {
  const original = query.trim()
  const location = parseLocation(original)
  const name = parsePharmacyName(original)
  const ready = !!location.zip || (!!location.city && !!location.state)
  let clarificationQuestion: string | undefined
  if (!ready) {
    clarificationQuestion = "What city/state or ZIP should I use for pharmacy search?"
  }
  return {
    query: original,
    normalizedQuery: location.cleaned,
    name,
    city: location.city,
    state: location.state,
    zip: location.zip,
    ready,
    clarificationQuestion,
  }
}

function buildPharmacyParams(input: {
  city?: string
  state?: string
  zip?: string
  name?: string
  limit?: string
  skip?: string
}): URLSearchParams {
  const params = new URLSearchParams()
  params.set("version", "2.1")
  params.set("limit", input.limit || "20")
  params.set("skip", input.skip || "0")
  params.set("enumeration_type", "NPI-2")
  params.set("taxonomy_description", "pharmacy")
  if (input.city) params.set("city", input.city)
  if (input.state) params.set("state", input.state)
  if (input.zip) params.set("postal_code", input.zip)
  if (input.name) params.set("organization_name", input.name)
  return params
}

function mapPharmacies(payload: NppesResponse): Array<{
  npi: string
  name: string
  type: string
  phone: string
  fax: string
  address: {
    line1: string
    line2: string
    city: string
    state: string
    zip: string
  }
  fullAddress: string
  status: string
  lastUpdated: string
}> {
  const list = payload.results || []
  return list
    .map((item) => {
      if (!item.number) return null
      const basic = item.basic || {}
      const address =
        item.addresses?.find((candidate) => candidate.address_purpose === "LOCATION") ||
        item.addresses?.[0] ||
        {}
      const taxonomy =
        item.taxonomies?.find((candidate) => candidate.primary) ||
        item.taxonomies?.[0] ||
        {}
      return {
        npi: item.number,
        name: basic.organization_name || "",
        type: taxonomy.desc || "Pharmacy",
        phone: address.telephone_number || "",
        fax: address.fax_number || "",
        address: {
          line1: address.address_1 || "",
          line2: address.address_2 || "",
          city: address.city || "",
          state: address.state || "",
          zip: (address.postal_code || "").slice(0, 5),
        },
        fullAddress: [
          address.address_1,
          address.address_2,
          `${address.city || ""}, ${address.state || ""} ${(address.postal_code || "").slice(0, 5)}`,
        ]
          .filter(Boolean)
          .join(", "),
        status: basic.status === "A" ? "Active" : basic.status || "Active",
        lastUpdated: basic.last_updated || "",
      }
    })
    .filter((item): item is NonNullable<typeof item> => !!item)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const nlQuery = (searchParams.get("q") || "").trim()
    const limitRaw = Number.parseInt(searchParams.get("limit") || "20", 10)
    const skipRaw = Number.parseInt(searchParams.get("skip") || "0", 10)
    const limit = String(Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20)
    const skip = String(Number.isFinite(skipRaw) ? Math.min(Math.max(skipRaw, 0), 500) : 0)

    let params: URLSearchParams
    let parsed: ParsedPharmacyQuery | undefined

    if (nlQuery) {
      if (nlQuery.length > 220) {
        return NextResponse.json(
          { error: "Search query is too long. Keep it under 220 characters." },
          { status: 400 }
        )
      }
      parsed = parseNaturalLanguageQuery(nlQuery)
      if (!parsed.ready) {
        return NextResponse.json({
          ready: false,
          parsed,
          clarificationQuestion: parsed.clarificationQuestion,
          prompt: {
            id: PHARMACY_SEARCH_PROMPT_ID,
            image: PHARMACY_SEARCH_PROMPT_IMAGE,
            text: PHARMACY_SEARCH_PROMPT_TEXT,
          },
          count: 0,
          pharmacies: [],
        })
      }

      params = buildPharmacyParams({
        city: parsed.city,
        state: parsed.state,
        zip: parsed.zip,
        name: parsed.name,
        limit,
        skip,
      })
    } else {
      // Backward compatibility for structured clients.
      const city = searchParams.get("city") || ""
      const state = searchParams.get("state") || ""
      const zip = searchParams.get("zip") || ""
      const name = searchParams.get("name") || ""
      if (!city && !state && !zip && !name) {
        return NextResponse.json(
          { error: "Provide a natural-language query using q." },
          { status: 400 }
        )
      }
      params = buildPharmacyParams({ city, state, zip, name, limit, skip })
    }

    const response = await fetchWithTimeout(
      `${NPPES_BASE}&${params.toString()}`,
      { next: { revalidate: 300 } },
      9000
    )
    if (!response.ok) {
      return NextResponse.json(
        { error: "NPI Registry unavailable." },
        { status: 502 }
      )
    }

    const payload = (await response.json()) as NppesResponse
    const pharmacies = mapPharmacies(payload)
    return NextResponse.json({
      ready: true,
      parsed,
      prompt: {
        id: PHARMACY_SEARCH_PROMPT_ID,
        image: PHARMACY_SEARCH_PROMPT_IMAGE,
        text: PHARMACY_SEARCH_PROMPT_TEXT,
      },
      count: payload.result_count || pharmacies.length,
      pharmacies,
    })
  } catch (error) {
    if (isAbortError(error)) {
      return NextResponse.json(
        { error: "Pharmacy search timed out. Please try again." },
        { status: 504 }
      )
    }
    console.error("Pharmacy search error:", error)
    return NextResponse.json(
      { error: "Failed to search pharmacies." },
      { status: 500 }
    )
  }
}
