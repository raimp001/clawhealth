import { NextRequest, NextResponse } from "next/server"

// Use NPPES API to search for pharmacies (enumeration_type=NPI-2 for organizations)
// Taxonomy code 333600000X = Pharmacy
const NPPES_BASE = "https://npiregistry.cms.hhs.gov/api/?version=2.1"

const PHARMACY_TAXONOMIES = [
  "333600000X", // Pharmacy
  "3336C0002X", // Clinic Pharmacy
  "3336C0003X", // Community/Retail Pharmacy
  "3336C0004X", // Compounding Pharmacy
  "3336H0001X", // Home Infusion Therapy Pharmacy
  "3336I0012X", // Institutional Pharmacy
  "3336L0003X", // Long Term Care Pharmacy
  "3336M0002X", // Mail Order Pharmacy
  "3336M0003X", // Managed Care Organization Pharmacy
  "3336N0007X", // Nuclear Pharmacy
  "3336S0011X", // Specialty Pharmacy
]

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const city = searchParams.get("city") || ""
    const state = searchParams.get("state") || ""
    const zip = searchParams.get("zip") || ""
    const name = searchParams.get("name") || ""
    const limit = searchParams.get("limit") || "20"
    const skip = searchParams.get("skip") || "0"

    const params = new URLSearchParams()
    params.set("version", "2.1")
    params.set("limit", limit)
    params.set("skip", skip)
    params.set("enumeration_type", "NPI-2") // Organizations
    params.set("taxonomy_description", "pharmacy") // Pharmacy taxonomy

    if (city) params.set("city", city)
    if (state) params.set("state", state)
    if (zip) params.set("postal_code", zip)
    if (name) params.set("organization_name", name)

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

    const pharmacies = (data.results || []).map((r: any) => {
      const basic = r.basic || {}
      const addr =
        r.addresses?.find((a: any) => a.address_purpose === "LOCATION") ||
        r.addresses?.[0] ||
        {}
      const taxonomies = r.taxonomies || []
      const primaryTaxonomy =
        taxonomies.find((t: any) => t.primary) || taxonomies[0] || {}

      return {
        npi: r.number,
        name: basic.organization_name || basic.name || "",
        type: primaryTaxonomy.desc || "Pharmacy",
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
      pharmacies,
    })
  } catch (error) {
    console.error("Pharmacy search error:", error)
    return NextResponse.json(
      { error: "Failed to search pharmacies" },
      { status: 500 }
    )
  }
}
