/**
 * Hermes Demo Patient Scenarios
 * High-fidelity oncology demo patients for investor presentations.
 * Each patient represents a different high-stakes PA use case.
 */

export interface DemoPatient {
  id: string
  name: string
  age: number
  diagnosis: string
  diagnosisCode: string
  drug: string
  hcpcsCode: string
  payer: string
  scenario: string
  paFlow: DemoPAStep[]
  talkingPoints: string[]
  wowMoment: string
}

export interface DemoPAStep {
  step: number
  actor: "clinician" | "rex" | "payer" | "hermes"
  action: string
  detail: string
  timeSeconds: number
  highlight?: boolean
}

export const DEMO_PATIENTS: DemoPatient[] = [
  {
    id: "demo-mitchell",
    name: "John Mitchell",
    age: 67,
    diagnosis: "Relapsed/Refractory Multiple Myeloma",
    diagnosisCode: "C90.02",
    drug: "Teclistamab (Talvey)",
    hcpcsCode: "J9269",
    payer: "Aetna",
    scenario: "BCMA-targeted bispecific — 4th-line myeloma",
    paFlow: [
      {
        step: 1,
        actor: "clinician",
        action: "Natural language request",
        detail: "\"John's myeloma has progressed again — he needs teclistamab. Handle the Aetna PA.\"",
        timeSeconds: 5,
        highlight: false,
      },
      {
        step: 2,
        actor: "rex",
        action: "Criteria check via MCP",
        detail: "Rex calls check_pa_required(J9269, Aetna) → PA required. Calls lookup_payer_criteria(Aetna) → 4 prior lines required, REMS enrollment, ECOG ≤2.",
        timeSeconds: 3,
        highlight: false,
      },
      {
        step: 3,
        actor: "rex",
        action: "Clinical data assembly",
        detail: "Pulls patient's 4 prior regimens from EHR (Vd, KRd, DPd, PACE). Confirms ECOG 1. Verifies TALISMAN REMS enrollment. All criteria met — score: 91/100.",
        timeSeconds: 8,
        highlight: true,
      },
      {
        step: 4,
        actor: "rex",
        action: "FHIR Bundle assembly",
        detail: "Builds Da Vinci PAS bundle: Patient R4, Practitioner, Coverage (Aetna Choice POS II), Claim (preauthorization), ServiceRequest, 3 Conditions.",
        timeSeconds: 2,
        highlight: false,
      },
      {
        step: 5,
        actor: "rex",
        action: "PA submitted",
        detail: "POST /api/fhir/pas → FHIR ClaimResponse: outcome=queued, reference PA-M4X7B-K3R9. Aetna portal notified.",
        timeSeconds: 1,
        highlight: false,
      },
      {
        step: 6,
        actor: "payer",
        action: "Aetna denial (simulated)",
        detail: "Step therapy not met — lenalidomide failure documentation insufficient. Denial code: A001.",
        timeSeconds: 0,
        highlight: false,
      },
      {
        step: 7,
        actor: "rex",
        action: "Appeal generated",
        detail: "Rex calls generate_appeal with MajesTEC-1 trial data (NEJM 2022), NCCN Category 1, ECOG documentation, prior treatment dates. 3-page appeal letter drafted in 8 seconds.",
        timeSeconds: 8,
        highlight: true,
      },
      {
        step: 8,
        actor: "rex",
        action: "P2P review requested",
        detail: "Peer-to-peer review with Aetna oncology medical director scheduled within 24h. Rex prepares talking points: MajesTEC-1 ORR 63%, median DoR 18.4 months.",
        timeSeconds: 3,
        highlight: false,
      },
      {
        step: 9,
        actor: "payer",
        action: "Appeal approved",
        detail: "Aetna approves teclistamab after P2P review. Auth reference AUTH-T7K2M. Valid 180 days. First infusion scheduled.",
        timeSeconds: 0,
        highlight: true,
      },
    ],
    talkingPoints: [
      "Without OpenRx: 3–5 days of phone calls, faxes, and portal navigation",
      "With OpenRx: clinician types one sentence → PA submitted in under 30 seconds",
      "Appeal generated in 8 seconds using MajesTEC-1 clinical evidence automatically",
      "FHIR R4 compliant — ready for the 2027 CMS mandate on day one",
      "Rex knows Aetna's exact TALISMAN REMS requirement — no hallucination",
    ],
    wowMoment: "Clinician types one sentence. PA submitted, denied, appealed, and approved — all in under 4 minutes. That's what we're selling.",
  },
  {
    id: "demo-chen",
    name: "Sarah Chen",
    age: 52,
    diagnosis: "Relapsed DLBCL after R-CHOP",
    diagnosisCode: "C83.30",
    drug: "Axicabtagene Ciloleucel (Yescarta) CAR-T",
    hcpcsCode: "Q2050",
    payer: "UnitedHealthcare",
    scenario: "CAR-T for DLBCL — REMS-certified center coordination",
    paFlow: [
      {
        step: 1,
        actor: "clinician",
        action: "CAR-T PA initiated",
        detail: "\"Sarah failed R-CHOP and R-ICE. She's eligible for Yescarta. UHC PA please — we need this fast.\"",
        timeSeconds: 5,
        highlight: false,
      },
      {
        step: 2,
        actor: "rex",
        action: "REMS center verification",
        detail: "Verifies facility is REMS-certified for Yescarta. Checks 24/7 ICU access documentation. Confirms leukapheresis scheduling slot available.",
        timeSeconds: 5,
        highlight: false,
      },
      {
        step: 3,
        actor: "rex",
        action: "Criteria evaluation",
        detail: "score: 88/100. ZUMA-1 trial cited. Two prior salvage regimens documented. ECOG 1. Bridging therapy plan included.",
        timeSeconds: 4,
        highlight: true,
      },
      {
        step: 4,
        actor: "rex",
        action: "Urgent PA submitted",
        detail: "72-hour expedited review requested (life-threatening diagnosis). Da Vinci PAS bundle with supporting pathology + flow cytometry.",
        timeSeconds: 2,
        highlight: false,
      },
      {
        step: 5,
        actor: "payer",
        action: "UHC approves",
        detail: "Expedited approval within 72 hours. Manufacturing slot coordinated with Kite Pharma. 17-day vein-to-vein timeline initiated.",
        timeSeconds: 0,
        highlight: true,
      },
    ],
    talkingPoints: [
      "CAR-T PA is the most complex in oncology — 40+ page clinical packages typical",
      "OpenRx assembles the complete FHIR bundle in seconds, not days",
      "Expedited 72-hour track triggered automatically based on diagnosis",
      "REMS verification automated — no manual checklist",
    ],
    wowMoment: "For CAR-T, clinics typically spend 2 weeks on PA paperwork. We do it in under a minute and flag REMS requirements automatically.",
  },
  {
    id: "demo-ramirez",
    name: "Marcus Ramirez",
    age: 44,
    diagnosis: "FLT3-ITD+ Acute Myeloid Leukemia, relapsed",
    diagnosisCode: "C92.00",
    drug: "Gilteritinib (Xospata)",
    hcpcsCode: "J9042",
    payer: "Cigna",
    scenario: "FLT3+ AML — genomic-driven PA with biomarker documentation",
    paFlow: [
      {
        step: 1,
        actor: "clinician",
        action: "Genomic-driven PA request",
        detail: "\"Marcus relapsed after 7+3. FLT3-ITD positive on FoundationOne. Start gilteritinib — Cigna PA.\"",
        timeSeconds: 5,
        highlight: false,
      },
      {
        step: 2,
        actor: "rex",
        action: "Biomarker documentation pull",
        detail: "Pulls FLT3-ITD result from FoundationOne Heme report. Confirms: FLT3-ITD VAF 42%, TP53 wild-type. ADMIRAL trial eligibility criteria met.",
        timeSeconds: 6,
        highlight: true,
      },
      {
        step: 3,
        actor: "rex",
        action: "Criteria evaluation",
        detail: "score: 94/100. FLT3 mutation confirmed. Standard induction failure documented. ECOG 1. No active CNS involvement. Step therapy met.",
        timeSeconds: 3,
        highlight: false,
      },
      {
        step: 4,
        actor: "rex",
        action: "FHIR PA submitted to Cigna",
        detail: "Bundle includes: pathology report reference, genomic variant data, ADMIRAL trial citation (NEJM 2019), prior treatment dates.",
        timeSeconds: 2,
        highlight: false,
      },
      {
        step: 5,
        actor: "payer",
        action: "Cigna approves 180 days",
        detail: "Approved: 120mg orally daily. No step therapy required when FLT3+ confirmed. Auth valid 180 days with renewal option.",
        timeSeconds: 0,
        highlight: true,
      },
    ],
    talkingPoints: [
      "Genomic biomarker documentation is the #1 missing piece in FLT3+ AML PAs",
      "Rex automatically pulls the FLT3 result and cites ADMIRAL trial data",
      "94/100 score = near-certain approval before submission",
      "Cigna waives step therapy when FLT3+ is confirmed — Rex knows this",
    ],
    wowMoment: "The genomic result that took the lab 2 weeks to produce becomes the PA approval reason in 10 seconds.",
  },
]

export function getDemoPatient(id: string): DemoPatient | undefined {
  return DEMO_PATIENTS.find((p) => p.id === id)
}

export function getDemoScriptText(patient: DemoPatient): string {
  const steps = patient.paFlow.map((s) =>
    `Step ${s.step} [${s.actor.toUpperCase()}]: ${s.action}\n${s.detail}`
  ).join("\n\n")

  return `
DEMO: ${patient.name} — ${patient.scenario}
Drug: ${patient.drug} (${patient.hcpcsCode})
Payer: ${patient.payer}
Diagnosis: ${patient.diagnosis} (${patient.diagnosisCode})

═══════════════════════════════════════
FLOW
═══════════════════════════════════════
${steps}

═══════════════════════════════════════
TALKING POINTS
═══════════════════════════════════════
${patient.talkingPoints.map((t, i) => `${i + 1}. ${t}`).join("\n")}

═══════════════════════════════════════
WOW MOMENT
═══════════════════════════════════════
${patient.wowMoment}
`.trim()
}
