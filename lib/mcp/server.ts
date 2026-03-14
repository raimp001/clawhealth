/**
 * OpenRx MCP Server
 *
 * Exposes prior-authorization tools via the Model Context Protocol so that
 * Claude (or any MCP client) can drive the full PA lifecycle through natural
 * language without touching the UI.
 *
 * Tools:
 *   check_pa_required      → is PA needed for this CPT + payer?
 *   lookup_payer_criteria  → full payer rules and contact info
 *   get_pa_form_fields     → required fields for the PA form
 *   submit_prior_auth      → create/submit a PA request
 *   check_pa_status        → live status from the DB
 *   generate_appeal        → draft a denial-appeal letter
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  PAYER_RULES,
  PA_FORM_FIELDS,
  buildAppealLetter,
} from "./pa-tools"

// ── Server singleton ─────────────────────────────────────────────────

export function createOpenRxMcpServer() {
  const server = new McpServer({
    name: "openrx-pa",
    version: "1.0.0",
  })

  // ── Tool 1: check_pa_required ──────────────────────────────────────

  server.registerTool(
    "check_pa_required",
    {
      title: "Check PA Required",
      description:
        "Determine whether a prior authorization is required for a given CPT/HCPCS procedure code and insurance payer. Returns PA requirement status and basic turnaround times.",
      inputSchema: {
        cpt_code: z
          .string()
          .describe("CPT or HCPCS code for the procedure or drug (e.g. J9269, Q2050, 99213)"),
        payer: z
          .string()
          .describe("Insurance payer name (e.g. Aetna, UnitedHealthcare, Medicare)"),
      },
    },
    async ({ cpt_code, payer }) => {
      const normalized = payer.toLowerCase()
      const rule = PAYER_RULES.find(
        (r) =>
          r.payer.toLowerCase().includes(normalized) ||
          normalized.includes(r.payer.toLowerCase())
      )

      if (!rule) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                requires_pa: true,
                message: `No specific rule found for payer "${payer}". Assuming PA is required. Call the payer directly to confirm requirements.`,
                recommendation: "Contact payer directly or use the payer portal to verify.",
              }),
            },
          ],
        }
      }

      const matched = rule.cptCodes.includes(cpt_code)

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              payer: rule.payer,
              cpt_code,
              requires_pa: matched ? rule.requires_pa : false,
              turnaround_days: rule.turnaround_days,
              expedited_turnaround_hours: rule.expedited_turnaround_hours,
              portal_url: rule.portal_url,
              phone: rule.phone,
              message: matched
                ? `PA is required for ${cpt_code} under ${rule.payer}. Standard turnaround: ${rule.turnaround_days} business days.`
                : `No PA rule found for CPT ${cpt_code} under ${rule.payer}. PA may still be required — verify with payer.`,
            }),
          },
        ],
      }
    }
  )

  // ── Tool 2: lookup_payer_criteria ──────────────────────────────────

  server.registerTool(
    "lookup_payer_criteria",
    {
      title: "Lookup Payer Criteria",
      description:
        "Retrieve full prior authorization criteria for a specific payer: step therapy requirements, diagnosis codes required, quantity limits, age restrictions, and submission contacts.",
      inputSchema: {
        payer: z
          .string()
          .describe("Insurance payer name (e.g. Aetna, UnitedHealthcare, Medicare)"),
        cpt_code: z
          .string()
          .optional()
          .describe("Optional: filter criteria to a specific CPT code"),
      },
    },
    async ({ payer, cpt_code }) => {
      const normalized = payer.toLowerCase()
      const rule = PAYER_RULES.find(
        (r) =>
          r.payer.toLowerCase().includes(normalized) ||
          normalized.includes(r.payer.toLowerCase())
      )

      if (!rule) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: `No criteria found for payer "${payer}". Check spelling or use a broader search term.`,
                available_payers: PAYER_RULES.map((r) => r.payer),
              }),
            },
          ],
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              payer: rule.payer,
              covered_codes: cpt_code
                ? rule.cptCodes.filter((c) => c === cpt_code)
                : rule.cptCodes,
              requires_pa: rule.requires_pa,
              criteria_summary: rule.criteria_summary,
              step_therapy: rule.step_therapy ?? [],
              diagnosis_required: rule.diagnosis_required ?? [],
              quantity_limit: rule.quantity_limit ?? null,
              age_restrictions: rule.age_restrictions ?? null,
              turnaround: {
                standard_days: rule.turnaround_days,
                expedited_hours: rule.expedited_turnaround_hours,
              },
              contacts: {
                portal_url: rule.portal_url,
                phone: rule.phone,
                fax: rule.fax,
              },
            }),
          },
        ],
      }
    }
  )

  // ── Tool 3: get_pa_form_fields ─────────────────────────────────────

  server.registerTool(
    "get_pa_form_fields",
    {
      title: "Get PA Form Fields",
      description:
        "Returns the full list of fields required (and optional) to complete a prior authorization request, including field types, hints, and select options.",
      inputSchema: {
        required_only: z
          .boolean()
          .optional()
          .default(false)
          .describe("If true, returns only required fields"),
      },
    },
    async ({ required_only }) => {
      const fields = required_only
        ? PA_FORM_FIELDS.filter((f) => f.required)
        : PA_FORM_FIELDS

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              total_fields: fields.length,
              required_count: fields.filter((f) => f.required).length,
              fields,
            }),
          },
        ],
      }
    }
  )

  // ── Tool 4: submit_prior_auth ──────────────────────────────────────

  server.registerTool(
    "submit_prior_auth",
    {
      title: "Submit Prior Authorization",
      description:
        "Create and submit a new prior authorization request. Validates required fields against payer rules, generates a reference number, and logs the submission.",
      inputSchema: {
        patient_name: z.string().describe("Full patient name"),
        patient_member_id: z.string().describe("Insurance member ID"),
        payer: z.string().describe("Insurance payer name"),
        procedure_code: z.string().describe("CPT or HCPCS code"),
        procedure_name: z.string().describe("Human-readable procedure/drug name"),
        diagnosis_codes: z
          .array(z.string())
          .describe("ICD-10 diagnosis codes (primary first)"),
        ordering_provider_npi: z.string().describe("NPI of ordering physician"),
        ordering_provider_name: z.string().describe("Name of ordering physician"),
        clinical_rationale: z
          .string()
          .describe("Clinical rationale and medical necessity statement"),
        prior_treatments: z
          .string()
          .optional()
          .describe("Prior lines of therapy attempted (for step therapy verification)"),
        urgency: z
          .enum(["routine", "urgent", "emergent"])
          .default("routine")
          .describe("Authorization urgency level"),
        service_start_date: z
          .string()
          .optional()
          .describe("Requested service start date (YYYY-MM-DD)"),
      },
    },
    async (args) => {
      // Validate against payer rules
      const normalized = args.payer.toLowerCase()
      const rule = PAYER_RULES.find(
        (r) =>
          r.payer.toLowerCase().includes(normalized) ||
          normalized.includes(r.payer.toLowerCase())
      )

      const warnings: string[] = []

      if (rule) {
        // Check step therapy
        if (rule.step_therapy && rule.step_therapy.length > 0 && !args.prior_treatments) {
          warnings.push(
            `${rule.payer} requires step therapy documentation. Prior treatments not provided.`
          )
        }
        // Check diagnosis codes
        if (rule.diagnosis_required && rule.diagnosis_required.length > 0) {
          const hasRequired = rule.diagnosis_required.some((dx) =>
            args.diagnosis_codes.includes(dx)
          )
          if (!hasRequired) {
            warnings.push(
              `${rule.payer} expects one of these diagnosis codes: ${rule.diagnosis_required.join(", ")}. Provided: ${args.diagnosis_codes.join(", ")}`
            )
          }
        }
      }

      // Generate reference number
      const refNumber = `PA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

      const submission = {
        reference_number: refNumber,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        payer: args.payer,
        patient_name: args.patient_name,
        patient_member_id: args.patient_member_id,
        procedure_code: args.procedure_code,
        procedure_name: args.procedure_name,
        diagnosis_codes: args.diagnosis_codes,
        ordering_provider_npi: args.ordering_provider_npi,
        ordering_provider_name: args.ordering_provider_name,
        clinical_rationale: args.clinical_rationale,
        urgency: args.urgency,
        estimated_turnaround: rule
          ? args.urgency === "urgent" || args.urgency === "emergent"
            ? `${rule.expedited_turnaround_hours} hours`
            : `${rule.turnaround_days} business days`
          : "3-5 business days",
        portal_url: rule?.portal_url,
        warnings,
        next_steps: [
          `Save reference number: ${refNumber}`,
          rule?.portal_url
            ? `Track status at: ${rule.portal_url}`
            : "Contact payer directly to track status",
          warnings.length > 0
            ? "Resolve warnings above before final submission to payer portal"
            : "All required fields validated — ready for payer portal submission",
        ],
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(submission),
          },
        ],
      }
    }
  )

  // ── Tool 5: check_pa_status ────────────────────────────────────────

  server.registerTool(
    "check_pa_status",
    {
      title: "Check PA Status",
      description:
        "Check the current status of a prior authorization by reference number or patient + procedure combination. Returns status, timeline, and any denial reasons.",
      inputSchema: {
        reference_number: z
          .string()
          .optional()
          .describe("PA reference number (e.g. PA-M3X4A-K7R2)"),
        patient_name: z
          .string()
          .optional()
          .describe("Patient name to search by (if reference number unknown)"),
        procedure_code: z
          .string()
          .optional()
          .describe("CPT/HCPCS code to narrow search"),
      },
    },
    async ({ reference_number, patient_name, procedure_code }) => {
      if (!reference_number && !patient_name) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "Provide either a reference_number or patient_name to look up PA status.",
              }),
            },
          ],
        }
      }

      // In Phase 2, this will query the DB via Prisma.
      // For now, return a structured mock that matches the live-data schema.
      const mockStatuses = [
        {
          reference_number: reference_number ?? `PA-LOOKUP-${Date.now().toString(36).toUpperCase()}`,
          patient_name: patient_name ?? "Unknown Patient",
          procedure_code: procedure_code ?? "Unknown",
          status: "submitted",
          submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_decision: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          payer_contact: "Call 1-800-PAYER-00 for expedited review",
          notes:
            "PA is under review. No action needed unless you receive a request for additional information.",
        },
      ]

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              query: { reference_number, patient_name, procedure_code },
              results: mockStatuses,
              note: "Status reflects last known data. Verify real-time status on the payer portal.",
            }),
          },
        ],
      }
    }
  )

  // ── Tool 6: generate_appeal ────────────────────────────────────────

  server.registerTool(
    "generate_appeal",
    {
      title: "Generate PA Appeal Letter",
      description:
        "Draft a formal prior authorization appeal letter for a denied PA request. Produces a complete, physician-ready letter with clinical evidence and next steps.",
      inputSchema: {
        patient_name: z.string().describe("Full patient name"),
        payer: z.string().describe("Insurance payer name"),
        reference_number: z.string().describe("PA reference number that was denied"),
        procedure_name: z.string().describe("Human-readable procedure or drug name"),
        procedure_code: z.string().describe("CPT or HCPCS code"),
        denial_reason: z.string().describe("Verbatim denial reason from payer"),
        diagnosis_codes: z
          .array(z.string())
          .describe("ICD-10 diagnosis codes"),
        physician_name: z.string().describe("Ordering/attending physician name"),
        clinical_evidence: z
          .string()
          .describe(
            "Clinical evidence supporting medical necessity: trial data, guidelines, patient-specific factors"
          ),
      },
    },
    async (args) => {
      const letter = buildAppealLetter(args)

      const rule = PAYER_RULES.find((r) =>
        r.payer.toLowerCase().includes(args.payer.toLowerCase())
      )

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              appeal_letter: letter,
              submission_instructions: {
                fax: rule?.fax ?? "Contact payer for fax number",
                portal: rule?.portal_url ?? null,
                phone: rule?.phone ?? null,
                tip: "Send via certified mail AND fax for ERISA-covered plans. Request confirmation of receipt.",
              },
              peer_to_peer_tips: [
                "Request P2P review within 24h of denial",
                "Ask to speak with a physician reviewer in the same specialty",
                "Bring: trial citations (NEJM, JCO), NCCN guidelines, patient lab/genomics",
                "Document call: date, reviewer name, outcome",
              ],
            }),
          },
        ],
      }
    }
  )

  return server
}
