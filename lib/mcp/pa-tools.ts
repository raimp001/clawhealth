/**
 * OpenRx MCP Tool Definitions — Prior Authorization
 *
 * These tools are exposed via the MCP server and callable by Claude
 * (and any MCP-compatible client) to drive the full PA lifecycle:
 *   check_pa_required → lookup_payer_criteria → submit_prior_auth
 *   → check_pa_status → generate_appeal
 */

// ── Payer rules data (Phase 2 will replace with live DB) ────────────

export type PayerRule = {
  payer: string
  cptCodes: string[]
  requires_pa: boolean
  step_therapy?: string[]
  quantity_limit?: string
  age_restrictions?: string
  diagnosis_required?: string[]
  turnaround_days: number
  expedited_turnaround_hours: number
  criteria_summary: string
  portal_url?: string
  phone?: string
  fax?: string
}

// Representative rules for high-value oncology PAs
export const PAYER_RULES: PayerRule[] = [
  {
    payer: "Aetna",
    cptCodes: ["J9269", "Q2050", "C9399"],  // teclistamab, CAR-T, misc
    requires_pa: true,
    step_therapy: ["Carfilzomib + dexamethasone", "Daratumumab + Vd"],
    diagnosis_required: ["C90.01", "C90.02"],
    turnaround_days: 3,
    expedited_turnaround_hours: 72,
    criteria_summary:
      "PA required for BCMA-targeted therapies. Patient must have ≥3 prior lines of therapy including PI, IMiD, and anti-CD38. ECOG ≤2.",
    portal_url: "https://www.aetna.com/providers/prior-authorizations.html",
    phone: "1-800-US-AETNA",
    fax: "1-859-455-8650",
  },
  {
    payer: "UnitedHealthcare",
    cptCodes: ["J9269", "Q2050", "J3490", "J9042"],  // gilteritinib
    requires_pa: true,
    step_therapy: ["Standard induction chemotherapy"],
    diagnosis_required: ["C91.00", "C92.00", "C90.01"],
    turnaround_days: 3,
    expedited_turnaround_hours: 72,
    criteria_summary:
      "PA required. For FLT3+ AML: gilteritinib requires prior standard induction failure or relapse. For MM: ≥2 prior lines. Oncologist attestation required.",
    portal_url: "https://www.uhcprovider.com/prior-auth",
    phone: "1-866-889-0054",
    fax: "1-866-783-7843",
  },
  {
    payer: "Cigna",
    cptCodes: ["J9269", "Q2050", "J9042", "C9399"],
    requires_pa: true,
    step_therapy: [],
    diagnosis_required: ["C90.01", "C91.00", "C92.00", "C85.10"],
    turnaround_days: 5,
    expedited_turnaround_hours: 72,
    criteria_summary:
      "PA required for specialty oncology infusibles. REMS enrollment required for CAR-T. Must submit pathology report + treatment plan from oncology board.",
    portal_url: "https://cignaforhcp.cigna.com/",
    phone: "1-800-88-CIGNA",
    fax: "1-855-541-0712",
  },
  {
    payer: "Humana",
    cptCodes: ["J9269", "Q2050", "J9042"],
    requires_pa: true,
    step_therapy: ["Bortezomib + melphalan"],
    diagnosis_required: ["C90.01", "C90.02"],
    turnaround_days: 5,
    expedited_turnaround_hours: 72,
    criteria_summary:
      "PA required. Patient must have failed ≥2 prior regimens. Specialist referral letter required. Quantity limit: 28-day supply per auth period.",
    quantity_limit: "28-day supply per authorization period",
    portal_url: "https://provider.humana.com/",
    phone: "1-800-523-0023",
    fax: "1-800-325-2227",
  },
  {
    payer: "Medicare",
    cptCodes: ["J9269", "Q2050", "J9042", "J3490"],
    requires_pa: true,
    step_therapy: [],
    diagnosis_required: ["C90.01", "C91.00", "C92.00", "C85.10"],
    turnaround_days: 3,
    expedited_turnaround_hours: 72,
    criteria_summary:
      "LCD L38551 / NCD 110.24 apply. For Part B infusibles: must be FDA-approved indication. Medically necessary documentation per CMS guidelines.",
    portal_url: "https://www.cms.gov/medicare",
    phone: "1-800-MEDICARE",
  },
  {
    payer: "BlueCross BlueShield",
    cptCodes: ["J9269", "Q2050", "J9042", "C9399"],
    requires_pa: true,
    step_therapy: ["Conventional chemotherapy"],
    diagnosis_required: ["C90.01", "C90.02", "C91.00", "C92.00", "C85.10"],
    turnaround_days: 5,
    expedited_turnaround_hours: 72,
    criteria_summary:
      "PA required. Clinical peer-to-peer available. Board-certified oncologist must attest. Pathology + genomics (FLT3 for AML) required.",
    portal_url: "https://www.bcbs.com/providers",
    phone: "1-800-262-BLUE",
    fax: "1-800-831-2583",
  },
]

// ── PA Form field requirements by insurer ───────────────────────────

export type FormField = {
  name: string
  label: string
  required: boolean
  type: "text" | "date" | "select" | "boolean" | "textarea"
  options?: string[]
  hint?: string
}

export const PA_FORM_FIELDS: FormField[] = [
  { name: "patient_first_name", label: "Patient First Name", required: true, type: "text" },
  { name: "patient_last_name", label: "Patient Last Name", required: true, type: "text" },
  { name: "patient_dob", label: "Date of Birth", required: true, type: "date" },
  { name: "patient_member_id", label: "Insurance Member ID", required: true, type: "text" },
  { name: "patient_group_number", label: "Group Number", required: false, type: "text" },
  { name: "ordering_provider_npi", label: "Ordering Physician NPI", required: true, type: "text" },
  { name: "ordering_provider_name", label: "Ordering Physician Name", required: true, type: "text" },
  { name: "facility_npi", label: "Facility NPI", required: true, type: "text" },
  { name: "procedure_code", label: "CPT / HCPCS Code", required: true, type: "text" },
  { name: "procedure_description", label: "Procedure Description", required: true, type: "text" },
  { name: "diagnosis_codes", label: "Primary ICD-10 Diagnosis Code(s)", required: true, type: "text", hint: "Comma-separated, e.g. C90.01, Z85.3" },
  { name: "service_start_date", label: "Requested Service Start Date", required: true, type: "date" },
  { name: "urgency", label: "Urgency", required: true, type: "select", options: ["routine", "urgent", "emergent"] },
  { name: "prior_treatments", label: "Prior Lines of Therapy Attempted", required: true, type: "textarea", hint: "List regimens with dates and outcomes" },
  { name: "clinical_rationale", label: "Clinical Rationale / Medical Necessity", required: true, type: "textarea" },
  { name: "supporting_labs", label: "Supporting Lab / Genomic Results", required: false, type: "textarea", hint: "e.g. FLT3-ITD positive, FISH, cytogenetics" },
  { name: "ecog_score", label: "ECOG Performance Status (0-4)", required: false, type: "select", options: ["0", "1", "2", "3", "4"] },
  { name: "step_therapy_tried", label: "Step Therapy Requirements Met", required: false, type: "boolean" },
  { name: "rems_enrolled", label: "REMS Program Enrollment (if applicable)", required: false, type: "boolean" },
  { name: "attending_notes", label: "Attending Physician Notes", required: false, type: "textarea" },
]

// ── Appeal letter template ───────────────────────────────────────────

export function buildAppealLetter(args: {
  patient_name: string
  payer: string
  reference_number: string
  procedure_name: string
  procedure_code: string
  denial_reason: string
  diagnosis_codes: string[]
  physician_name: string
  clinical_evidence: string
}) {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  })

  return `${today}

Medical Review Department
${args.payer}

RE: Prior Authorization Appeal — ${args.patient_name}
    Authorization Reference: ${args.reference_number}
    Procedure: ${args.procedure_name} (${args.procedure_code})
    Diagnosis: ${args.diagnosis_codes.join(", ")}

To the Medical Review Committee:

We are writing to formally appeal the denial of prior authorization for the above-referenced patient and procedure. We believe this denial is inconsistent with established clinical evidence and respectfully request a full clinical review.

REASON FOR DENIAL (AS STATED):
${args.denial_reason}

CLINICAL EVIDENCE SUPPORTING MEDICAL NECESSITY:
${args.clinical_evidence}

This treatment has received FDA approval for the documented indication and is supported by peer-reviewed clinical evidence demonstrating superior outcomes over available alternatives. Denial of this therapy would leave the patient without a medically appropriate treatment option and may constitute a health and safety risk.

We respectfully request:
1. A complete clinical peer-to-peer review with a board-certified specialist in the relevant subspecialty
2. Approval of the requested authorization within the expedited timeframe (72 hours)
3. If denied again, written notice of all clinical criteria applied, with citations

If you require additional clinical information, please contact our office directly at the number below.

Sincerely,

${args.physician_name}
Treating Physician
OpenRx Health Network

---
This letter was prepared with the assistance of OpenRx's AI-powered prior authorization system (Rex). All clinical facts require physician verification before submission.
`
}
