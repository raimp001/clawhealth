import { NextRequest, NextResponse } from "next/server"

// ── OpenFDA Drug NDC API (free, no key) ──────────────────
const OPENFDA_BASE = "https://api.fda.gov/drug/ndc.json"
export const dynamic = "force-dynamic"

// ── Known direct pricing data (PBM bypass options) ───────
// Sources: TrumpRx.gov MFN prices, Cost Plus Drugs formula,
// manufacturer patient assistance programs

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

const DIRECT_PRICING: Record<string, { retail: string; options: DirectPrice[] }> = {
  ozempic: {
    retail: "$1,028/mo",
    options: [
      { source: "TrumpRx (MFN)", price: "$199/mo", savings: "81% off", url: "https://trumprx.gov/p/ozempic", note: "Cash pay only. Not for Medicare/Medicaid patients." },
      { source: "Cost Plus Drugs", price: "$varies", savings: "Up to 70%", url: "https://costplusdrugs.com", note: "Cost + 15% markup + $3 dispensing + shipping" },
      { source: "Novo Nordisk PAP", price: "$0-$25/mo", savings: "Up to 100%", url: "https://www.novocare.com/eligibility.html", note: "Patient Assistance Program — income-based eligibility" },
    ],
  },
  semaglutide: {
    retail: "$1,028/mo",
    options: [
      { source: "TrumpRx (MFN)", price: "$199/mo", savings: "81% off", url: "https://trumprx.gov/p/ozempic", note: "Brand name Ozempic. Cash pay." },
      { source: "Compounding Pharmacies", price: "$150-$300/mo", savings: "70-85%", url: "#", note: "Compounded semaglutide — verify with your physician" },
    ],
  },
  wegovy: {
    retail: "$1,349/mo",
    options: [
      { source: "TrumpRx (MFN) — Pill", price: "$149/mo", savings: "89% off", url: "https://trumprx.gov/p/wegovy-pill", note: "Oral form. Cash pay only." },
      { source: "TrumpRx (MFN) — Pen", price: "$199/mo", savings: "85% off", url: "https://trumprx.gov/p/wegovy", note: "Injectable. Cash pay only." },
      { source: "Novo Nordisk PAP", price: "$0/mo", savings: "100%", url: "https://www.novocare.com", note: "Patient Assistance Program — income-based" },
    ],
  },
  zepbound: {
    retail: "$1,087/mo",
    options: [
      { source: "TrumpRx (MFN)", price: "$299/mo", savings: "72% off", url: "https://trumprx.gov/p/zepbound", note: "Cash pay only." },
      { source: "Eli Lilly Savings Card", price: "$25/mo", savings: "97% off", url: "https://www.zepbound.lilly.com/savings", note: "With commercial insurance. Not for government plans." },
    ],
  },
  mounjaro: {
    retail: "$1,069/mo",
    options: [
      { source: "TrumpRx (MFN)", price: "$299/mo", savings: "72% off", url: "https://trumprx.gov/p/mounjaro", note: "Cash pay only." },
      { source: "Eli Lilly Savings Card", price: "$25/mo", savings: "97% off", url: "https://www.mounjaro.com/savings", note: "With commercial insurance." },
    ],
  },
  metformin: {
    retail: "$30-$80/mo",
    options: [
      { source: "Cost Plus Drugs", price: "$3.60/mo", savings: "90%+", url: "https://costplusdrugs.com/medications/metforminHCl-500mg-tablet", note: "Generic. Cost + 15% + $3 + shipping." },
      { source: "Walmart $4 List", price: "$4/mo", savings: "85%+", url: "https://www.walmart.com/cp/4-prescriptions/1078664", note: "30-day supply at Walmart pharmacy" },
      { source: "Costco Pharmacy", price: "$5-$8/mo", savings: "80%+", url: "https://www.costco.com/pharmacy", note: "No membership required for pharmacy" },
    ],
  },
  lisinopril: {
    retail: "$20-$60/mo",
    options: [
      { source: "Cost Plus Drugs", price: "$3.90/mo", savings: "85%+", url: "https://costplusdrugs.com", note: "Generic. Cost + 15% + $3 + shipping." },
      { source: "Walmart $4 List", price: "$4/mo", savings: "85%+", url: "https://www.walmart.com/cp/4-prescriptions/1078664", note: "30-day supply" },
    ],
  },
  atorvastatin: {
    retail: "$30-$90/mo",
    options: [
      { source: "Cost Plus Drugs", price: "$4.20/mo", savings: "90%+", url: "https://costplusdrugs.com", note: "Generic Lipitor. Cost + 15% + $3." },
      { source: "Walmart $4 List", price: "$4/mo", savings: "90%+", url: "https://www.walmart.com/cp/4-prescriptions/1078664", note: "30-day supply" },
    ],
  },
  insulin: {
    retail: "$300-$700/mo",
    options: [
      { source: "TrumpRx (MFN)", price: "$25/mo", savings: "90%+", url: "https://trumprx.gov/browse", note: "Insulin Lispro. Cash pay only." },
      { source: "Walmart ReliOn", price: "$25/vial", savings: "90%+", url: "https://www.walmart.com", note: "OTC insulin at Walmart pharmacy" },
      { source: "Manufacturer Caps", price: "$35/mo", savings: "85%+", url: "#", note: "Most manufacturers cap insulin at $35/mo with insurance" },
    ],
  },
  amlodipine: {
    retail: "$15-$50/mo",
    options: [
      { source: "Cost Plus Drugs", price: "$3.60/mo", savings: "85%+", url: "https://costplusdrugs.com", note: "Generic. Cost + 15% + $3." },
      { source: "Walmart $4 List", price: "$4/mo", savings: "85%+", url: "https://www.walmart.com/cp/4-prescriptions/1078664", note: "30-day supply" },
    ],
  },
  sertraline: {
    retail: "$20-$80/mo",
    options: [
      { source: "Cost Plus Drugs", price: "$3.90/mo", savings: "90%+", url: "https://costplusdrugs.com", note: "Generic Zoloft. Cost + 15% + $3." },
      { source: "Walmart $4 List", price: "$4/mo", savings: "90%+", url: "https://www.walmart.com/cp/4-prescriptions/1078664", note: "30-day supply" },
    ],
  },
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q")?.trim().toLowerCase() || ""

    if (!query) {
      return NextResponse.json({ error: "Please enter a drug name" }, { status: 400 })
    }

    // 1. Search OpenFDA for drug info
    let drugInfo = null
    try {
      const fdaRes = await fetch(
        `${OPENFDA_BASE}?search=brand_name:"${encodeURIComponent(query)}"+generic_name:"${encodeURIComponent(query)}"&limit=3`,
        { next: { revalidate: 3600 } }
      )
      if (fdaRes.ok) {
        const fdaData = (await fdaRes.json()) as FdaResponse
        const results = fdaData.results || []
        drugInfo = results.map((r) => ({
          brandName: r.brand_name || "",
          genericName: r.generic_name || "",
          dosageForm: r.dosage_form || "",
          route: r.route?.join(", ") || "",
          manufacturer: r.labeler_name || "",
          activeIngredients: r.active_ingredients?.map((a) => `${a.name} ${a.strength}`).join(", ") || "",
          deaSchedule: r.dea_schedule || "Non-controlled",
          productNdc: r.product_ndc || "",
          pharm_class: r.pharm_class || [],
        }))
      }
    } catch {
      // FDA API may fail — continue with direct pricing
    }

    // 2. Look up direct pricing (PBM bypass options)
    const directPricing = DIRECT_PRICING[query] || null

    // 3. Check partial matches for direct pricing
    let partialMatches: string[] = []
    if (!directPricing) {
      partialMatches = Object.keys(DIRECT_PRICING).filter(
        (key) => key.includes(query) || query.includes(key)
      )
    }

    // 4. General PBM bypass tips
    const generalTips = [
      { tip: "Ask your pharmacy for the cash price", detail: "Sometimes the cash price without insurance is lower than your copay — pharmacists are now required to tell you." },
      { tip: "Check Cost Plus Drugs (costplusdrugs.com)", detail: "Mark Cuban's pharmacy: cost + 15% markup + $3 dispensing. 1,000+ generics available." },
      { tip: "Check TrumpRx.gov for MFN pricing", detail: "43 brand-name drugs at Most-Favored-Nation prices — the lowest price in the developed world. Cash pay only." },
      { tip: "Use manufacturer savings cards", detail: "Most brand-name drugs offer copay cards that can reduce your cost to $0-$25/mo with commercial insurance." },
      { tip: "Ask about 90-day supplies", detail: "Buying 90-day supplies is often 30-50% cheaper per pill than monthly refills." },
      { tip: "Check Costco pharmacy (no membership needed)", detail: "By law, you don't need a Costco membership to use their pharmacy. Their prices are often the lowest." },
      { tip: "Look into Patient Assistance Programs", detail: "Every major manufacturer offers free medication programs for patients who qualify based on income." },
      { tip: "Consider pill splitting (with doctor approval)", detail: "Some medications can be safely split — a double-strength tablet split in half can cost the same as a single dose." },
    ]

    return NextResponse.json({
      query,
      drugInfo,
      directPricing,
      partialMatches,
      generalTips,
    })
  } catch (error) {
    console.error("Drug price search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
