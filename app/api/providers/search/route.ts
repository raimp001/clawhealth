import { NextRequest, NextResponse } from "next/server"

// Real NPI Registry API — free, no auth required
// Docs: https://npiregistry.cms.hhs.gov/api-page
const NPPES_BASE = "https://npiregistry.cms.hhs.gov/api/?version=2.1"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const city = searchParams.get("city") || ""
    const state = searchParams.get("state") || ""
    const zip = searchParams.get("zip") || ""
    const specialty = searchParams.get("specialty") || ""
    const name = searchParams.get("name") || ""
    const limit = searchParams.get("limit") || "20"
    const skip = searchParams.get("skip") || "0"

    // Build NPPES query
    const params = new URLSearchParams()
    params.set("version", "2.1")
    params.set("limit", limit)
    params.set("skip", skip)
    params.set("enumeration_type", "NPI-1") // Individual providers only

    if (city) params.set("city", city)
    if (state) params.set("state", state)
    if (zip) params.set("postal_code", zip)
    if (specialty) params.set("taxonomy_description", specialty)
    if (name) {
      // Split name into first/last
      const parts = name.trim().split(/\s+/)
      if (parts.length >= 2) {
        params.set("first_name", parts[0])
        params.set("last_name", parts.slice(1).join(" "))
      } else {
        params.set("last_name", parts[0])
      }
    }

    const res = await fetch(`${NPPES_BASE}&${params.toString()}`, {
      next: { revalidate: 300 }, // Cache for 5 min
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: "NPI Registry unavailable" },
        { status: 502 }
      )
    }

    const data = await res.json()

    // Transform NPPES response into clean format
    const providers = (data.results || []).map((r: any) => {
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
