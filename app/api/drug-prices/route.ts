import { NextRequest, NextResponse } from "next/server"

const OPENFDA_BASE = "https://api.fda.gov/drug/ndc.json"
const PRICE_PROVIDER_BASE = process.env.OPENRX_DRUG_PRICE_PROVIDER_URL
const PRICE_PROVIDER_API_KEY = process.env.OPENRX_DRUG_PRICE_PROVIDER_KEY
export const dynamic = "force-dynamic"

interface DirectPrice {
  source: string
  price: string
  savings: string
  url: string
  note: string
}

interface FdaActiveIngredient {
  name?: string
  strength?: string
}

interface FdaRecord {
  brand_name?: string
  generic_name?: string
  dosage_form?: string
  route?: string[]
  labeler_name?: string
  active_ingredients?: FdaActiveIngredient[]
  dea_schedule?: string
  product_ndc?: string
  pharm_class?: string[]
}

interface FdaResponse {
  results?: FdaRecord[]
}

interface PriceProviderOption {
  source?: string
  price?: string | number
  savings?: string
  url?: string
  note?: string
}

interface PriceProviderResponse {
  retail?: string | number
  options?: PriceProviderOption[]
}

function asCurrency(value: string | number | undefined): string {
  if (value === undefined) return ""
  if (typeof value === "number") return `$${value.toFixed(2)}`
  return String(value)
}

async function fetchDrugInfo(query: string): Promise<Array<{
  brandName: string
  genericName: string
  dosageForm: string
  route: string
  manufacturer: string
  activeIngredients: string
  deaSchedule: string
  productNdc: string
  pharm_class: string[]
}> | null> {
  const expressions = [
    `(brand_name:\"${query}\"+generic_name:\"${query}\")`,
    `(brand_name:${query}+generic_name:${query})`,
  ]

  for (const expression of expressions) {
    try {
      const response = await fetch(`${OPENFDA_BASE}?search=${encodeURIComponent(expression)}&limit=5`, {
        next: { revalidate: 3600 },
      })
      if (!response.ok) continue
      const payload = (await response.json()) as FdaResponse
      const rows = (payload.results || []).map((record) => ({
        brandName: record.brand_name || "",
        genericName: record.generic_name || "",
        dosageForm: record.dosage_form || "",
        route: record.route?.join(", ") || "",
        manufacturer: record.labeler_name || "",
        activeIngredients:
          record.active_ingredients?.map((entry) => `${entry.name || ""} ${entry.strength || ""}`.trim()).filter(Boolean).join(", ") || "",
        deaSchedule: record.dea_schedule || "Non-controlled",
        productNdc: record.product_ndc || "",
        pharm_class: record.pharm_class || [],
      }))
      if (rows.length > 0) return rows
    } catch {
      continue
    }
  }

  return null
}

async function fetchLivePricing(query: string): Promise<{ retail: string; options: DirectPrice[] } | null> {
  if (!PRICE_PROVIDER_BASE) return null

  try {
    const headers: HeadersInit = { "Content-Type": "application/json" }
    if (PRICE_PROVIDER_API_KEY) {
      headers.Authorization = `Bearer ${PRICE_PROVIDER_API_KEY}`
    }

    const response = await fetch(`${PRICE_PROVIDER_BASE}?q=${encodeURIComponent(query)}`, {
      method: "GET",
      headers,
      next: { revalidate: 300 },
    })

    if (!response.ok) return null

    const payload = (await response.json()) as PriceProviderResponse
    const options: DirectPrice[] = (payload.options || [])
      .map((option) => ({
        source: option.source || "External source",
        price: asCurrency(option.price),
        savings: option.savings || "",
        url: option.url || "",
        note: option.note || "",
      }))
      .filter((option) => option.price)

    if (options.length === 0) return null

    return {
      retail: asCurrency(payload.retail) || "",
      options,
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q")?.trim().toLowerCase() || ""

    if (!query) {
      return NextResponse.json({ error: "Please enter a drug name" }, { status: 400 })
    }

    const [drugInfo, directPricing] = await Promise.all([
      fetchDrugInfo(query),
      fetchLivePricing(query),
    ])

    const generalTips = [
      {
        tip: "Ask for a cash quote and insurance quote",
        detail:
          "Pharmacy cash pricing can differ from insurance copays. Compare both before filling.",
      },
      {
        tip: "Check manufacturer assistance",
        detail:
          "Many branded therapies offer official copay cards or patient-assistance pathways.",
      },
      {
        tip: "Request clinically appropriate generics",
        detail:
          "When medically suitable, generics can materially reduce monthly out-of-pocket costs.",
      },
      {
        tip: "Use 90-day fill options when appropriate",
        detail:
          "Larger fills can lower dispensing frequency and reduce total pharmacy costs.",
      },
      {
        tip: "Confirm preferred network pharmacies",
        detail:
          "Your plan may have preferred pharmacies with lower contracted rates.",
      },
    ]

    return NextResponse.json({
      query,
      drugInfo,
      directPricing,
      partialMatches: [],
      generalTips,
      pricingProviderConfigured: !!PRICE_PROVIDER_BASE,
      livePricingAvailable: !!directPricing,
    })
  } catch (error) {
    console.error("Drug price search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
