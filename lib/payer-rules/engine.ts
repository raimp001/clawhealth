/**
 * OpenRx Payer Rules Engine — Phase 2
 *
 * Structured LCD/NCD + formulary evaluation. Replaces AI hallucination with
 * deterministic rule evaluation for PA decisions.
 *
 * Sources:
 * - CMS Local Coverage Determinations (LCD) — https://www.cms.gov/medicare-coverage-database
 * - NCCN Compendium drug criteria
 * - Payer-specific formulary criteria (P&T committee decisions)
 */

// ── Rule types ───────────────────────────────────────────────────────

export type DrugClass =
  | "BCMA_BISPECIFIC"      // teclistamab, elranatamab
  | "CAR_T"               // axicabtagene, tisagenlecleucel, ciltacabtagene
  | "FLT3_INHIBITOR"      // gilteritinib, midostaurin, quizartinib
  | "CD20_MONOCLONAL"     // rituximab, obinutuzumab
  | "PD1_PDLR1"          // pembrolizumab, nivolumab, atezolizumab
  | "HER2_TARGETED"       // trastuzumab, pertuzumab, T-DM1
  | "VEGF_VEGFR"          // bevacizumab, sunitinib, sorafenib
  | "PROTEASOME_INHIBITOR" // bortezomib, carfilzomib, ixazomib
  | "IMID"                // lenalidomide, pomalidomide, thalidomide
  | "BTK_INHIBITOR"       // ibrutinib, acalabrutinib, zanubrutinib
  | "BCL2_INHIBITOR"      // venetoclax
  | "IL4_IL13"            // dupilumab
  | "IL17"                // secukinumab, ixekizumab, bimekizumab
  | "IL23"                // guselkumab, risankizumab
  | "IL12_23"             // ustekinumab
  | "TNF_INHIBITOR"       // adalimumab, etanercept, infliximab
  | "JAK_INHIBITOR"       // tofacitinib, baricitinib, upadacitinib
  | "CGRP"                // erenumab, fremanezumab, galcanezumab, eptinezumab
  | "GLP1"                // semaglutide, tirzepatide, liraglutide
  | "SGLT2"               // empagliflozin, dapagliflozin, canagliflozin
  | "ANTI_COMPLEMENT"     // eculizumab, ravulizumab
  | "SPECIALTY_OTHER"

export interface ClinicalCriterion {
  id: string
  label: string
  description: string
  required: boolean
  evidenceLevel?: "A" | "B" | "C"   // NCCN/AHA evidence level
  source?: string                    // LCD number, NCD number, guideline
}

export interface StepTherapyRequirement {
  drug: string
  minDurationDays?: number
  failureDocumented: boolean
  alternatives?: string[]
}

export interface PayerDrugRule {
  drugClass: DrugClass
  brandNames: string[]
  genericNames: string[]
  hcpcsCodes: string[]
  ndc?: string[]  // National Drug Codes

  // PA requirement
  requiresPA: boolean
  specialtyPharmacyRequired: boolean
  remsRequired: boolean
  remsProgram?: string

  // Clinical criteria
  indicationsDx: Array<{ icd10: string; label: string }>  // required ICD-10s
  criteria: ClinicalCriterion[]
  stepTherapy: StepTherapyRequirement[]

  // Authorization parameters
  initialAuthDays: number       // days for first auth
  renewalAuthDays: number       // days for renewal
  quantityLimit?: string        // e.g. "1 vial per 28 days"
  siteOfCare?: "inpatient" | "outpatient" | "home" | "any"

  // NCCN / LCD references
  nccnCategory?: "1" | "2A" | "2B" | "3"  // NCCN evidence level
  lcdNumbers?: string[]
  ncdNumbers?: string[]
  guidelineReferences?: string[]
}

// ── Rule database ────────────────────────────────────────────────────

export const DRUG_RULES: PayerDrugRule[] = [
  // ── TECLISTAMAB (Talvey) ─────────────────────────────────
  {
    drugClass: "BCMA_BISPECIFIC",
    brandNames: ["Talvey"],
    genericNames: ["teclistamab-cqyv", "teclistamab"],
    hcpcsCodes: ["J9269"],
    requiresPA: true,
    specialtyPharmacyRequired: true,
    remsRequired: true,
    remsProgram: "TALISMAN REMS",
    indicationsDx: [
      { icd10: "C90.00", label: "Multiple myeloma, not having achieved remission" },
      { icd10: "C90.01", label: "Multiple myeloma in remission" },
      { icd10: "C90.02", label: "Multiple myeloma in relapse" },
    ],
    criteria: [
      { id: "tc-1", label: "Relapsed/refractory MM diagnosis", description: "Patient has confirmed diagnosis of relapsed or refractory multiple myeloma", required: true, evidenceLevel: "A" },
      { id: "tc-2", label: "≥4 prior lines of therapy", description: "Patient must have received at least 4 prior lines of therapy including PI, IMiD, anti-CD38", required: true, evidenceLevel: "A", source: "MajesTEC-1 trial eligibility" },
      { id: "tc-3", label: "ECOG ≤2", description: "Eastern Cooperative Oncology Group performance status 0–2", required: true, evidenceLevel: "B" },
      { id: "tc-4", label: "Adequate organ function", description: "ANC ≥1.0×10⁹/L, platelets ≥75×10⁹/L, creatinine clearance ≥30 mL/min, ALT/AST ≤3× ULN", required: true, evidenceLevel: "A" },
      { id: "tc-5", label: "REMS enrollment", description: "Provider and patient must be enrolled in TALISMAN REMS program prior to dispensing", required: true, evidenceLevel: "A" },
      { id: "tc-6", label: "No active CNS myeloma", description: "No evidence of central nervous system involvement", required: true, evidenceLevel: "B" },
    ],
    stepTherapy: [
      { drug: "Any proteasome inhibitor (bortezomib, carfilzomib, ixazomib)", minDurationDays: 84, failureDocumented: true },
      { drug: "Any IMiD (lenalidomide, pomalidomide, thalidomide)", minDurationDays: 84, failureDocumented: true },
      { drug: "Any anti-CD38 (daratumumab, isatuximab)", minDurationDays: 84, failureDocumented: true },
    ],
    initialAuthDays: 180,
    renewalAuthDays: 365,
    quantityLimit: "1.5 mg/kg IV every 2 weeks after step-up dosing",
    siteOfCare: "outpatient",
    nccnCategory: "1",
    guidelineReferences: ["NCCN MM v3.2024", "MajesTEC-1 (NEJM 2022)", "FDA Approval Oct 2022"],
  },

  // ── CAR-T THERAPIES ─────────────────────────────────────
  {
    drugClass: "CAR_T",
    brandNames: ["Yescarta", "Kymriah", "Breyanzi", "Abecma", "Carvykti"],
    genericNames: ["axicabtagene ciloleucel", "tisagenlecleucel", "lisocabtagene maraleucel", "idecabtagene vicleucel", "ciltacabtagene autoleucel"],
    hcpcsCodes: ["Q2050", "Q2051", "Q2052", "Q2053", "Q2054"],
    requiresPA: true,
    specialtyPharmacyRequired: false, // hospital pharmacy only
    remsRequired: true,
    remsProgram: "REMS programs vary by product",
    indicationsDx: [
      { icd10: "C83.30", label: "DLBCL, unspecified" },
      { icd10: "C83.38", label: "DLBCL, other sites" },
      { icd10: "C91.10", label: "CLL/SLL, not in remission" },
      { icd10: "C90.00", label: "Multiple myeloma, not in remission" },
      { icd10: "C85.10", label: "Non-Hodgkin lymphoma, NOS" },
    ],
    criteria: [
      { id: "cart-1", label: "FDA-approved indication", description: "Treatment for FDA-approved indication (e.g., R/R DLBCL after ≥2 prior lines, R/R ALL in pediatric/young adult)", required: true, evidenceLevel: "A" },
      { id: "cart-2", label: "REMS-certified center", description: "Treatment must be administered at a REMS-certified healthcare facility with 24/7 ICU access", required: true, evidenceLevel: "A" },
      { id: "cart-3", label: "Adequate organ function", description: "Renal, hepatic, pulmonary, and cardiac function meeting trial-established thresholds", required: true, evidenceLevel: "A" },
      { id: "cart-4", label: "No active CNS involvement", description: "No active CNS disease unless enrolled in specific trials", required: true, evidenceLevel: "B" },
      { id: "cart-5", label: "Bridging therapy documentation", description: "Plan for bridging chemotherapy during manufacturing period documented", required: false, evidenceLevel: "B" },
    ],
    stepTherapy: [
      { drug: "Rituximab-based combination (R-CHOP or equivalent)", minDurationDays: 63, failureDocumented: true },
      { drug: "Second-line salvage chemotherapy (R-ICE, R-DHAP, or equivalent)", minDurationDays: 42, failureDocumented: true },
    ],
    initialAuthDays: 30, // one-time treatment
    renewalAuthDays: 0,
    quantityLimit: "Single infusion per treatment course",
    siteOfCare: "inpatient",
    nccnCategory: "1",
    lcdNumbers: ["L38551"],
    guidelineReferences: ["NCCN DLBCL v5.2024", "ZUMA-1 (Nature Medicine 2019)", "JULIET trial (NEJM 2018)"],
  },

  // ── GILTERITINIB (Xospata) — FLT3+ AML ─────────────────
  {
    drugClass: "FLT3_INHIBITOR",
    brandNames: ["Xospata"],
    genericNames: ["gilteritinib fumarate", "gilteritinib"],
    hcpcsCodes: ["J9042"],
    requiresPA: true,
    specialtyPharmacyRequired: true,
    remsRequired: false,
    indicationsDx: [
      { icd10: "C92.00", label: "Acute myeloid leukemia, NOS" },
      { icd10: "C92.01", label: "AML with t(8;21)(q22;q22.1)" },
      { icd10: "C92.02", label: "AML, chronic phase" },
      { icd10: "C92.10", label: "Chronic myeloid leukemia, BCR/ABL-positive" },
    ],
    criteria: [
      { id: "gilt-1", label: "FLT3 mutation confirmed", description: "FLT3-ITD or FLT3-TKD mutation confirmed by validated assay (e.g., FoundationOne Heme, Genoptix)", required: true, evidenceLevel: "A", source: "ADMIRAL trial" },
      { id: "gilt-2", label: "Relapsed/refractory AML", description: "AML that is relapsed or refractory following at least one prior course of therapy", required: true, evidenceLevel: "A" },
      { id: "gilt-3", label: "Appropriate performance status", description: "ECOG 0–2 or Karnofsky ≥60%", required: true, evidenceLevel: "B" },
      { id: "gilt-4", label: "Standard induction failure", description: "Prior standard induction chemotherapy (7+3 or equivalent) with documented failure", required: true, evidenceLevel: "A" },
    ],
    stepTherapy: [
      { drug: "Standard AML induction chemotherapy (cytarabine + anthracycline)", minDurationDays: 21, failureDocumented: true },
    ],
    initialAuthDays: 180,
    renewalAuthDays: 365,
    quantityLimit: "120 mg orally once daily",
    siteOfCare: "any",
    nccnCategory: "1",
    guidelineReferences: ["NCCN AML v3.2024", "ADMIRAL trial (NEJM 2019)", "FDA Approval Nov 2018"],
  },

  // ── PEMBROLIZUMAB (Keytruda) ────────────────────────────
  {
    drugClass: "PD1_PDLR1",
    brandNames: ["Keytruda"],
    genericNames: ["pembrolizumab"],
    hcpcsCodes: ["J9271"],
    requiresPA: true,
    specialtyPharmacyRequired: false,
    remsRequired: false,
    indicationsDx: [
      { icd10: "C34.10", label: "NSCLC, upper lobe" },
      { icd10: "C34.90", label: "NSCLC, unspecified" },
      { icd10: "C43.9", label: "Melanoma, unspecified" },
      { icd10: "C67.9", label: "Bladder cancer, unspecified" },
      { icd10: "C50.919", label: "Breast cancer, unspecified" },
      { icd10: "C18.9", label: "Colon cancer, unspecified" },
    ],
    criteria: [
      { id: "pem-1", label: "FDA-approved indication", description: "Treatment for an FDA-approved indication. Pembrolizumab has 40+ approved indications.", required: true, evidenceLevel: "A" },
      { id: "pem-2", label: "PD-L1 testing (where required)", description: "PD-L1 expression tested via IHC where required by indication (e.g., TPS ≥1% for NSCLC 2L)", required: false, evidenceLevel: "A" },
      { id: "pem-3", label: "MSI/TMB testing (where applicable)", description: "MSI-H/dMMR or TMB-H ≥10 mut/Mb for TMB-based indications", required: false, evidenceLevel: "A" },
      { id: "pem-4", label: "No active autoimmune disease", description: "No active, known or suspected autoimmune disease requiring systemic treatment", required: true, evidenceLevel: "B" },
    ],
    stepTherapy: [],
    initialAuthDays: 180,
    renewalAuthDays: 365,
    quantityLimit: "200 mg IV every 3 weeks or 400 mg IV every 6 weeks",
    siteOfCare: "outpatient",
    nccnCategory: "1",
    guidelineReferences: ["NCCN NSCLC v4.2024", "KEYNOTE-024", "FDA Approval Sept 2014"],
  },

  // ── DUPILUMAB (Dupixent) ────────────────────────────────
  {
    drugClass: "IL4_IL13",
    brandNames: ["Dupixent"],
    genericNames: ["dupilumab"],
    hcpcsCodes: ["J0173"],
    requiresPA: true,
    specialtyPharmacyRequired: true,
    remsRequired: false,
    indicationsDx: [
      { icd10: "L20.9", label: "Atopic dermatitis, unspecified" },
      { icd10: "J45.50", label: "Severe persistent asthma" },
      { icd10: "J32.9", label: "Chronic rhinosinusitis with nasal polyps" },
      { icd10: "K52.21", label: "Eosinophilic esophagitis" },
      { icd10: "L20.81", label: "Atopic dermatitis, severe" },
    ],
    criteria: [
      { id: "dup-1", label: "Moderate-to-severe atopic dermatitis OR type 2 indication", description: "Diagnosed moderate-to-severe atopic dermatitis, or asthma with eosinophil count ≥150/μL, or CRSwNP, or EoE", required: true, evidenceLevel: "A" },
      { id: "dup-2", label: "Topical therapy failure (AD)", description: "For AD: failure or contraindication to medium/high potency topical corticosteroids and at least one of TCI, crisaborole", required: true, evidenceLevel: "A" },
      { id: "dup-3", label: "ICS failure (asthma)", description: "For asthma: add-on to inadequately controlled moderate-to-severe asthma on ICS + LABA", required: false, evidenceLevel: "A" },
      { id: "dup-4", label: "Age criteria", description: "AD: ≥6 months; Asthma: ≥6 years; CRSwNP: ≥18 years; EoE: ≥12 years", required: true, evidenceLevel: "A" },
    ],
    stepTherapy: [
      { drug: "Medium-to-high potency topical corticosteroids (for AD)", minDurationDays: 28, failureDocumented: true },
      { drug: "Topical calcineurin inhibitor or PDE4 inhibitor (for AD)", minDurationDays: 28, failureDocumented: true, alternatives: ["Tacrolimus 0.1%", "Pimecrolimus", "Crisaborole"] },
    ],
    initialAuthDays: 365,
    renewalAuthDays: 365,
    quantityLimit: "300 mg SC every 2 weeks (AD/asthma) or per approved schedule",
    siteOfCare: "home",
    nccnCategory: "1",
    guidelineReferences: ["SOLO 1&2 trials (NEJM 2016)", "LIBERTY ASTHMA QUEST", "FDA Approval Mar 2017"],
  },

  // ── ADALIMUMAB (Humira + biosimilars) ──────────────────
  {
    drugClass: "TNF_INHIBITOR",
    brandNames: ["Humira", "Hadlima", "Hyrimoz", "Cyltezo", "Yusimry", "Simlandi"],
    genericNames: ["adalimumab", "adalimumab-adaz", "adalimumab-bwwd", "adalimumab-adbm", "adalimumab-aqvh"],
    hcpcsCodes: ["J0135"],
    requiresPA: true,
    specialtyPharmacyRequired: true,
    remsRequired: false,
    indicationsDx: [
      { icd10: "M05.79", label: "Rheumatoid arthritis with RA factor" },
      { icd10: "M45.9", label: "Ankylosing spondylitis" },
      { icd10: "L40.50", label: "Psoriatic arthritis, unspecified" },
      { icd10: "K50.90", label: "Crohn's disease, unspecified" },
      { icd10: "K51.90", label: "Ulcerative colitis, unspecified" },
      { icd10: "L40.9", label: "Psoriasis, unspecified" },
    ],
    criteria: [
      { id: "ada-1", label: "Confirmed diagnosis", description: "Physician-confirmed diagnosis of approved indication with documented disease activity (DAS28, CDAI, PASI, HBI, etc.)", required: true, evidenceLevel: "A" },
      { id: "ada-2", label: "MTX/DMARD failure (RA)", description: "For RA: failure to respond adequately to ≥2 conventional DMARDs including methotrexate unless contraindicated", required: true, evidenceLevel: "A" },
      { id: "ada-3", label: "Biologic-naive preferred", description: "Biosimilar preferred over originator when clinically appropriate", required: false, evidenceLevel: "B" },
      { id: "ada-4", label: "TB screening", description: "Tuberculosis screening completed (TST or IGRA) before initiation", required: true, evidenceLevel: "A" },
      { id: "ada-5", label: "No active infection", description: "No active serious infections, sepsis, or opportunistic infections", required: true, evidenceLevel: "A" },
    ],
    stepTherapy: [
      { drug: "Methotrexate (RA)", minDurationDays: 90, failureDocumented: true, alternatives: ["Leflunomide", "Hydroxychloroquine + sulfasalazine"] },
      { drug: "Sulfasalazine (SpA, AS)", minDurationDays: 84, failureDocumented: true, alternatives: ["NSAIDs at max dose × 4 weeks"] },
    ],
    initialAuthDays: 180,
    renewalAuthDays: 365,
    quantityLimit: "40 mg SC every 2 weeks (RA); varies by indication",
    siteOfCare: "home",
    nccnCategory: "1",
    guidelineReferences: ["ACR RA Guidelines 2021", "ACR SpA Guidelines 2019", "FDA Approval Jan 2003"],
  },

  // ── SEMAGLUTIDE (Ozempic/Wegovy) ────────────────────────
  {
    drugClass: "GLP1",
    brandNames: ["Ozempic", "Wegovy", "Rybelsus"],
    genericNames: ["semaglutide"],
    hcpcsCodes: ["J3490", "J3590"],
    requiresPA: true,
    specialtyPharmacyRequired: false,
    remsRequired: false,
    indicationsDx: [
      { icd10: "E11.9", label: "Type 2 diabetes mellitus, without complications" },
      { icd10: "E11.65", label: "Type 2 diabetes with hyperglycemia" },
      { icd10: "E66.01", label: "Morbid (severe) obesity due to excess calories" },
      { icd10: "E66.09", label: "Other obesity" },
      { icd10: "Z68.35", label: "BMI 35.0-35.9, adult" },
    ],
    criteria: [
      { id: "sem-1", label: "T2D or BMI ≥27 with comorbidity", description: "Type 2 diabetes OR BMI ≥27 kg/m² with weight-related comorbidity (HTN, dyslipidemia, OSA, ASCVD, T2D)", required: true, evidenceLevel: "A" },
      { id: "sem-2", label: "Prior weight management effort (Wegovy)", description: "For Wegovy: failed initial diet and exercise counseling for ≥6 months", required: false, evidenceLevel: "B" },
      { id: "sem-3", label: "Metformin failure/contraindication (T2D)", description: "For T2D: metformin failure or contraindication (eGFR <30, lactic acidosis risk)", required: false, evidenceLevel: "A" },
      { id: "sem-4", label: "No T1D or DKA history", description: "Not indicated for type 1 diabetes or diabetic ketoacidosis", required: true, evidenceLevel: "A" },
      { id: "sem-5", label: "No personal/family history MTC or MEN2", description: "No personal or family history of medullary thyroid carcinoma or MEN2", required: true, evidenceLevel: "A" },
    ],
    stepTherapy: [
      { drug: "Metformin (for T2D indication)", minDurationDays: 90, failureDocumented: true, alternatives: ["Sulfonylurea", "DPP4 inhibitor"] },
    ],
    initialAuthDays: 180,
    renewalAuthDays: 365,
    quantityLimit: "Wegovy: 2.4 mg SC weekly; Ozempic: 0.5–2 mg SC weekly",
    siteOfCare: "home",
    nccnCategory: "1",
    guidelineReferences: ["ADA Standards of Care 2024", "SURMOUNT-1 (NEJM 2022)", "SUSTAIN trials"],
  },
]

// ── Criteria evaluation engine ───────────────────────────────────────

export interface CriteriaEvaluation {
  drug: string
  drugClass: DrugClass
  passed: boolean
  score: number           // 0–100 likelihood of approval
  met: ClinicalCriterion[]
  missing: ClinicalCriterion[]
  stepTherapyMet: boolean
  stepTherapyGaps: string[]
  remsRequired: boolean
  warnings: string[]
  recommendations: string[]
  nccnCategory?: string
  guidelineReferences: string[]
}

export function evaluatePACriteria(params: {
  drugName: string        // brand or generic name
  hcpcsCode?: string
  icd10Codes: string[]
  priorTherapies?: string[]
  ecogScore?: number
  patientAge?: number
  clinicalNotes?: string
}): CriteriaEvaluation | null {
  const { drugName, hcpcsCode, icd10Codes, priorTherapies = [], ecogScore, clinicalNotes = "" } = params
  const nameLower = drugName.toLowerCase()
  const notesLower = clinicalNotes.toLowerCase()

  // Find matching rule
  const rule = DRUG_RULES.find((r) =>
    r.brandNames.some((b) => nameLower.includes(b.toLowerCase())) ||
    r.genericNames.some((g) => nameLower.includes(g.toLowerCase())) ||
    (hcpcsCode && r.hcpcsCodes.includes(hcpcsCode))
  )

  if (!rule) return null

  const warnings: string[] = []
  const recommendations: string[] = []
  const met: ClinicalCriterion[] = []
  const missing: ClinicalCriterion[] = []

  // Evaluate each criterion
  for (const criterion of rule.criteria) {
    // Heuristic: check if criterion keyword appears in notes or is implied
    const keywordsInNotes = criterion.description.split(/\s+/).slice(0, 5).some((w) =>
      w.length > 4 && notesLower.includes(w.toLowerCase())
    )

    // ECOG check
    if (criterion.id.includes("ecog") || criterion.label.toLowerCase().includes("ecog")) {
      if (ecogScore !== undefined && ecogScore <= 2) {
        met.push(criterion)
      } else {
        if (!criterion.required) {
          met.push(criterion)
        } else {
          missing.push(criterion)
          warnings.push(`ECOG performance status not documented or >2`)
          recommendations.push("Document ECOG performance status in clinical notes (must be ≤2)")
        }
      }
      continue
    }

    // REMS check
    if (criterion.id.includes("rems") || criterion.label.toLowerCase().includes("rems")) {
      if (rule.remsRequired) {
        missing.push(criterion)
        recommendations.push(`Enroll in ${rule.remsProgram ?? "required REMS program"} before dispensing`)
      } else {
        met.push(criterion)
      }
      continue
    }

    // ICD-10 diagnosis check
    if (criterion.label.toLowerCase().includes("diagnosis") || criterion.label.toLowerCase().includes("confirmed")) {
      const hasRequiredDx = rule.indicationsDx.some((dx) => icd10Codes.includes(dx.icd10))
      if (hasRequiredDx) {
        met.push(criterion)
      } else {
        missing.push(criterion)
        warnings.push(`Required diagnosis codes not found. Expected one of: ${rule.indicationsDx.map((d) => d.icd10).join(", ")}`)
        recommendations.push(`Add ICD-10 code for approved indication: ${rule.indicationsDx.map((d) => `${d.icd10} (${d.label})`).join(" OR ")}`)
      }
      continue
    }

    // Default: mark as met if keywords appear in notes, missing if required
    if (keywordsInNotes || !criterion.required) {
      met.push(criterion)
    } else {
      missing.push(criterion)
      recommendations.push(`Document: ${criterion.label} — ${criterion.description}`)
    }
  }

  // Step therapy evaluation
  const stepTherapyGaps: string[] = []
  for (const step of rule.stepTherapy) {
    const tried = priorTherapies.some((t) =>
      t.toLowerCase().includes(step.drug.split(" ")[0].toLowerCase())
    )
    if (!tried) {
      stepTherapyGaps.push(`${step.drug} — failure not documented (min ${step.minDurationDays ?? 30} days required)`)
      if (step.alternatives?.length) {
        recommendations.push(`Document failure of: ${step.drug}. Acceptable alternatives: ${step.alternatives.join(", ")}`)
      } else {
        recommendations.push(`Document failure of: ${step.drug} (minimum ${step.minDurationDays ?? 30} days)`)
      }
    }
  }

  const stepTherapyMet = stepTherapyGaps.length === 0

  // Score calculation
  const requiredCriteria = rule.criteria.filter((c) => c.required)
  const metRequired = met.filter((c) => c.required).length
  const criteriaScore = requiredCriteria.length > 0
    ? (metRequired / requiredCriteria.length) * 60
    : 60
  const stepScore = rule.stepTherapy.length > 0
    ? (stepTherapyMet ? 30 : Math.max(0, 30 - stepTherapyGaps.length * 10))
    : 30
  const dxScore = rule.indicationsDx.some((dx) => icd10Codes.includes(dx.icd10)) ? 10 : 0
  const score = Math.min(100, Math.round(criteriaScore + stepScore + dxScore))

  if (score >= 85) {
    recommendations.unshift("Strong approval likelihood — submit PA immediately")
  } else if (score >= 60) {
    recommendations.unshift("Moderate approval likelihood — gather missing documentation before submission")
  } else {
    recommendations.unshift("Low approval likelihood — address all missing criteria and step therapy before submitting")
    warnings.push("Consider peer-to-peer review request if denied")
  }

  if (rule.specialtyPharmacyRequired) {
    recommendations.push("Route to specialty pharmacy — mandatory for this drug class")
  }

  return {
    drug: rule.brandNames[0] ?? drugName,
    drugClass: rule.drugClass,
    passed: score >= 70 && missing.filter((c) => c.required).length === 0 && stepTherapyMet,
    score,
    met,
    missing,
    stepTherapyMet,
    stepTherapyGaps,
    remsRequired: rule.remsRequired,
    warnings,
    recommendations,
    nccnCategory: rule.nccnCategory,
    guidelineReferences: rule.guidelineReferences ?? [],
  }
}

// ── Payer-specific overrides ─────────────────────────────────────────

export interface PayerOverride {
  payer: string
  drugClass: DrugClass
  additionalCriteria: string[]
  stepTherapyAdditions: string[]
  authDaysOverride?: number
  quantityLimitOverride?: string
  preferredBiosimilar?: string
}

export const PAYER_OVERRIDES: PayerOverride[] = [
  {
    payer: "UnitedHealthcare",
    drugClass: "TNF_INHIBITOR",
    additionalCriteria: ["Biosimilar required unless patient has documented intolerance"],
    stepTherapyAdditions: ["Prefer Hadlima or Hyrimoz biosimilar before Humira originator"],
    preferredBiosimilar: "Hadlima (adalimumab-bwwd)",
  },
  {
    payer: "Aetna",
    drugClass: "GLP1",
    additionalCriteria: ["HbA1c ≥7.5% documented within 3 months for T2D indication", "Lifestyle modification program enrollment required for obesity indication"],
    stepTherapyAdditions: [],
    authDaysOverride: 90,
  },
  {
    payer: "Cigna",
    drugClass: "CAR_T",
    additionalCriteria: ["Pre-authorization for inpatient admission required separately", "Pathology report required with confirmed histology"],
    stepTherapyAdditions: ["Two prior salvage chemotherapy regimens documented"],
    authDaysOverride: 30,
  },
  {
    payer: "Medicare",
    drugClass: "BCMA_BISPECIFIC",
    additionalCriteria: ["Must meet LCD L38551 criteria for Part B coverage", "Site of care must be Medicare-enrolled outpatient facility"],
    stepTherapyAdditions: [],
  },
]

export function getPayerOverride(payer: string, drugClass: DrugClass): PayerOverride | null {
  const payerLower = payer.toLowerCase()
  return PAYER_OVERRIDES.find((o) =>
    o.drugClass === drugClass &&
    (o.payer.toLowerCase().includes(payerLower) || payerLower.includes(o.payer.toLowerCase()))
  ) ?? null
}

// ── Formulary check ───────────────────────────────────────────────────

export function isOnFormulary(params: {
  drugName: string
  payer: string
  hcpcsCode?: string
}): { onFormulary: boolean; tier?: number; pa_required: boolean; notes?: string } {
  const rule = DRUG_RULES.find((r) =>
    r.brandNames.some((b) => params.drugName.toLowerCase().includes(b.toLowerCase())) ||
    r.genericNames.some((g) => params.drugName.toLowerCase().includes(g.toLowerCase())) ||
    (params.hcpcsCode && r.hcpcsCodes.includes(params.hcpcsCode))
  )

  if (!rule) return { onFormulary: false, pa_required: true, notes: "Drug not found in formulary database" }

  // All specialty drugs are tier 4–5 and require PA
  return {
    onFormulary: true,
    tier: rule.drugClass === "GLP1" || rule.drugClass === "JAK_INHIBITOR" ? 4 : 5,
    pa_required: rule.requiresPA,
    notes: rule.specialtyPharmacyRequired
      ? "Specialty pharmacy distribution only. PA required."
      : rule.requiresPA
      ? "PA required before dispensing."
      : undefined,
  }
}
