import { NextRequest, NextResponse } from "next/server"

// Real NPI Registry API — free, no auth required
const NPPES_BASE = "https://npiregistry.cms.hhs.gov/api/?version=2.1"

// Common state names → abbreviations
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

// Common specialties for fuzzy matching
const SPECIALTY_MAP: Record<string, string> = {
  cardiologist: "Cardiology", cardiology: "Cardiology", heart: "Cardiology",
  dermatologist: "Dermatology", dermatology: "Dermatology", skin: "Dermatology",
  dentist: "Dentist", dental: "Dentist",
  ent: "Otolaryngology", "ear nose throat": "Otolaryngology",
  endocrinologist: "Endocrinology", endocrinology: "Endocrinology", diabetes: "Endocrinology",
  "family medicine": "Family Medicine", "family doctor": "Family Medicine", "family practice": "Family Medicine",
  gastroenterologist: "Gastroenterology", gastro: "Gastroenterology", gi: "Gastroenterology",
  "general practitioner": "Internal Medicine", gp: "Internal Medicine", "primary care": "Internal Medicine",
  "internal medicine": "Internal Medicine", internist: "Internal Medicine",
  hematologist: "Hematology", hematology: "Hematology",
  neurologist: "Neurology", neurology: "Neurology", brain: "Neurology",
  obgyn: "Obstetrics & Gynecology", gynecologist: "Obstetrics & Gynecology", ob: "Obstetrics & Gynecology",
  oncologist: "Oncology", oncology: "Oncology", cancer: "Oncology",
  ophthalmologist: "Ophthalmology", ophthalmology: "Ophthalmology", eye: "Ophthalmology",
  orthopedic: "Orthopedic Surgery", orthopedist: "Orthopedic Surgery", bones: "Orthopedic Surgery",
  pediatrician: "Pediatrics", pediatrics: "Pediatrics", "kids doctor": "Pediatrics",
  psychiatrist: "Psychiatry", psychiatry: "Psychiatry", "mental health": "Psychiatry",
  psychologist: "Psychology", psychology: "Psychology",
  pulmonologist: "Pulmonary Disease", pulmonology: "Pulmonary Disease", lung: "Pulmonary Disease",
  radiologist: "Radiology", radiology: "Radiology",
  rheumatologist: "Rheumatology", rheumatology: "Rheumatology", arthritis: "Rheumatology",
  surgeon: "Surgery", surgery: "Surgery",
  urologist: "Urology", urology: "Urology",
  therapist: "Physical Therapist", "physical therapy": "Physical Therapist", pt: "Physical Therapist",
  chiropractor: "Chiropractic", chiropractic: "Chiropractic",
  optometrist: "Optometry", optometry: "Optometry",
  podiatrist: "Podiatry", podiatry: "Podiatry", foot: "Podiatry",
  allergist: "Allergy & Immunology", allergy: "Allergy & Immunology",
  anesthesiologist: "Anesthesiology", anesthesia: "Anesthesiology",
  nephrologist: "Nephrology", nephrology: "Nephrology", kidney: "Nephrology",
}

// Parse natural language query into structured NPPES params
function parseQuery(query: string) {
  const result: {
    city?: string
    state?: string
    zip?: string
    specialty?: string
    firstName?: string
    lastName?: string
  } = {}

  let remaining = query.trim()

  // Strip common filler words
  remaining = remaining.replace(/\b(find|search|look for|looking for|need|want|a|an|the|near|in|around|nearby|close to|doctor|provider|physician|specialist|dr\.?)\b/gi, " ")
  remaining = remaining.replace(/\s+/g, " ").trim()

  // Extract ZIP code (5 digits)
  const zipMatch = remaining.match(/\b(\d{5})\b/)
  if (zipMatch) {
    result.zip = zipMatch[1]
    remaining = remaining.replace(zipMatch[0], "").trim()
  }

  // Extract state — check for full state names first (e.g., "New York", "North Carolina")
  const lowerRemaining = remaining.toLowerCase()
  for (const [stateName, abbrev] of Object.entries(STATE_MAP)) {
    if (lowerRemaining.includes(stateName)) {
      result.state = abbrev
      remaining = remaining.replace(new RegExp(stateName, "i"), "").trim()
      break
    }
  }

  // Check for state abbreviations (2 uppercase letters at word boundary)
  if (!result.state) {
    const stateAbbrMatch = remaining.match(/\b([A-Z]{2})\b/)
    if (stateAbbrMatch && STATE_ABBREVS.has(stateAbbrMatch[1])) {
      result.state = stateAbbrMatch[1]
      remaining = remaining.replace(stateAbbrMatch[0], "").trim()
    }
  }

  // Extract specialty
  const words = remaining.toLowerCase().split(/\s+/)
  for (let i = 0; i < words.length; i++) {
    // Try multi-word matches first
    const twoWord = words.slice(i, i + 2).join(" ")
    const threeWord = words.slice(i, i + 3).join(" ")
    if (SPECIALTY_MAP[threeWord]) {
      result.specialty = SPECIALTY_MAP[threeWord]
      remaining = remaining.replace(new RegExp(threeWord, "i"), "").trim()
      break
    }
    if (SPECIALTY_MAP[twoWord]) {
      result.specialty = SPECIALTY_MAP[twoWord]
      remaining = remaining.replace(new RegExp(twoWord, "i"), "").trim()
      break
    }
    if (SPECIALTY_MAP[words[i]]) {
      result.specialty = SPECIALTY_MAP[words[i]]
      remaining = remaining.replace(new RegExp(`\\b${words[i]}\\b`, "i"), "").trim()
      break
    }
  }

  // Clean remaining text
  remaining = remaining.replace(/[,.\-]+/g, " ").replace(/\s+/g, " ").trim()

  // Whatever's left: if it looks like a name (has uppercase), treat as name; otherwise city
  if (remaining) {
    const parts = remaining.split(/\s+/).filter(Boolean)
    // If we already have a zip or state, remaining is likely a city or name
    // Heuristic: if 1-2 words and no specialty found, could be city
    if (parts.length <= 2 && !result.zip) {
      // Likely a city
      result.city = remaining
    } else if (parts.length >= 2) {
      // Could be "city name" or "first last" — check if it looks like a person name
      // If first word is capitalized and short, might be a name
      result.city = remaining
    } else {
      result.city = remaining
    }
  }

  return result
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q") || ""
    const limit = searchParams.get("limit") || "20"
    const skip = searchParams.get("skip") || "0"

    const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 50)
    const parsedSkip = Math.max(0, parseInt(skip, 10) || 0)

    if (!query.trim()) {
      return NextResponse.json(
        { error: "Please enter a search query" },
        { status: 400 }
      )
    }

    if (query.length > 200) {
      return NextResponse.json(
        { error: "Search query too long" },
        { status: 400 }
      )
    }

    // Parse the natural language query
    const parsed = parseQuery(query)

    // Build NPPES query
    const params = new URLSearchParams()
    params.set("version", "2.1")
    params.set("limit", String(parsedLimit))
    params.set("skip", String(parsedSkip))
    params.set("enumeration_type", "NPI-1")

    if (parsed.city) params.set("city", parsed.city)
    if (parsed.state) params.set("state", parsed.state)
    if (parsed.zip) params.set("postal_code", parsed.zip)
    if (parsed.specialty) params.set("taxonomy_description", parsed.specialty)
    if (parsed.firstName) params.set("first_name", parsed.firstName)
    if (parsed.lastName) params.set("last_name", parsed.lastName)

    const res = await fetch(`${NPPES_BASE}&${params.toString()}`, {
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: "NPI Registry unavailable" },
        { status: 502 }
      )
    }

    const data = await res.json()

    const providers = (data.results || []).map((r: Record<string, any>) => {
      const basic = r.basic || {}
      const addr =
        r.addresses?.find((a: Record<string, any>) => a.address_purpose === "LOCATION") ||
        r.addresses?.[0] ||
        {}
      const taxonomies = r.taxonomies || []
      const primaryTaxonomy =
        taxonomies.find((t: Record<string, any>) => t.primary) || taxonomies[0] || {}

      return {
        npi: r.number,
        name: `${basic.first_name || ""} ${basic.last_name || ""}`.trim(),
        credential: basic.credential || "",
        gender: basic.gender === "M" ? "Male" : basic.gender === "F" ? "Female" : "",
        specialty: primaryTaxonomy.desc || "",
        taxonomyCode: primaryTaxonomy.code || "",
        phone: addr.telephone_number || "",
        fax: addr.fax_number || "",
        address: {
          line1: addr.address_1 || "",
          line2: addr.address_2 || "",
          city: addr.city || "",
          state: addr.state || "",
          zip: addr.postal_code || "",
        },
        fullAddress: [
          addr.address_1,
          addr.address_2,
          `${addr.city || ""}, ${addr.state || ""} ${(addr.postal_code || "").slice(0, 5)}`,
        ]
          .filter(Boolean)
          .join(", "),
        status: basic.status === "A" ? "Active" : basic.status || "Active",
        lastUpdated: basic.last_updated || "",
      }
    })

    return NextResponse.json({
      count: data.result_count || 0,
      parsed, // Return what we parsed so user can see
      providers,
    })
  } catch (error) {
    console.error("NPI search error:", error)
    return NextResponse.json(
      { error: "Failed to search providers" },
      { status: 500 }
    )
  }
}
