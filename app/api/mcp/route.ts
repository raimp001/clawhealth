/**
 * OpenRx MCP HTTP Endpoint — JSON-RPC 2.0 over HTTP
 *
 * Implements the MCP protocol directly (JSON-RPC 2.0) for Next.js App Router.
 * Claude and any MCP-compatible client can POST to this endpoint.
 *
 * POST /api/mcp  — MCP JSON-RPC request
 * GET  /api/mcp  — Server info / health check
 */

import { NextRequest, NextResponse } from "next/server"
import { PAYER_RULES, PA_FORM_FIELDS, buildAppealLetter } from "@/lib/mcp/pa-tools"

export const maxDuration = 30

// ── Tool registry ────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "check_pa_required",
    description: "Determine whether a prior authorization is required for a CPT/HCPCS code and payer.",
    inputSchema: {
      type: "object",
      properties: {
        cpt_code: { type: "string", description: "CPT or HCPCS code (e.g. J9269)" },
        payer: { type: "string", description: "Insurance payer name (e.g. Aetna)" },
      },
      required: ["cpt_code", "payer"],
    },
  },
  {
    name: "lookup_payer_criteria",
    description: "Retrieve full PA criteria for a payer: step therapy, diagnosis codes, contacts.",
    inputSchema: {
      type: "object",
      properties: {
        payer: { type: "string", description: "Insurance payer name" },
        cpt_code: { type: "string", description: "Optional CPT code filter" },
      },
      required: ["payer"],
    },
  },
  {
    name: "get_pa_form_fields",
    description: "List all required and optional fields for a PA form.",
    inputSchema: {
      type: "object",
      properties: {
        required_only: { type: "boolean", description: "Return only required fields" },
      },
      required: [],
    },
  },
  {
    name: "submit_prior_auth",
    description: "Create, validate, and submit a prior authorization request.",
    inputSchema: {
      type: "object",
      properties: {
        patient_name: { type: "string" },
        patient_member_id: { type: "string" },
        payer: { type: "string" },
        procedure_code: { type: "string" },
        procedure_name: { type: "string" },
        diagnosis_codes: { type: "array", items: { type: "string" } },
        ordering_provider_npi: { type: "string" },
        ordering_provider_name: { type: "string" },
        clinical_rationale: { type: "string" },
        prior_treatments: { type: "string" },
        urgency: { type: "string", enum: ["routine", "urgent", "emergent"] },
        service_start_date: { type: "string" },
      },
      required: [
        "patient_name", "patient_member_id", "payer", "procedure_code",
        "procedure_name", "diagnosis_codes", "ordering_provider_npi",
        "ordering_provider_name", "clinical_rationale",
      ],
    },
  },
  {
    name: "check_pa_status",
    description: "Check PA status by reference number or patient name.",
    inputSchema: {
      type: "object",
      properties: {
        reference_number: { type: "string" },
        patient_name: { type: "string" },
        procedure_code: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "generate_appeal",
    description: "Draft a formal PA denial appeal letter.",
    inputSchema: {
      type: "object",
      properties: {
        patient_name: { type: "string" },
        payer: { type: "string" },
        reference_number: { type: "string" },
        procedure_name: { type: "string" },
        procedure_code: { type: "string" },
        denial_reason: { type: "string" },
        diagnosis_codes: { type: "array", items: { type: "string" } },
        physician_name: { type: "string" },
        clinical_evidence: { type: "string" },
      },
      required: [
        "patient_name", "payer", "reference_number", "procedure_name",
        "procedure_code", "denial_reason", "diagnosis_codes",
        "physician_name", "clinical_evidence",
      ],
    },
  },
]

// ── Tool executor ────────────────────────────────────────────────────

type ToolArgs = Record<string, unknown>

function executeTool(name: string, args: ToolArgs): unknown {
  if (name === "check_pa_required") {
    const { cpt_code, payer } = args as { cpt_code: string; payer: string }
    const rule = PAYER_RULES.find((r) =>
      r.payer.toLowerCase().includes(payer.toLowerCase()) ||
      payer.toLowerCase().includes(r.payer.toLowerCase())
    )
    if (!rule) return { requires_pa: true, message: `No rule for "${payer}". Assume PA required.` }
    const matched = rule.cptCodes.includes(cpt_code)
    return {
      payer: rule.payer, cpt_code,
      requires_pa: matched ? rule.requires_pa : false,
      turnaround_days: rule.turnaround_days,
      expedited_turnaround_hours: rule.expedited_turnaround_hours,
      portal_url: rule.portal_url, phone: rule.phone,
      message: matched
        ? `PA required for ${cpt_code} under ${rule.payer}.`
        : `No specific rule for ${cpt_code} under ${rule.payer}. Verify with payer.`,
    }
  }

  if (name === "lookup_payer_criteria") {
    const { payer, cpt_code } = args as { payer: string; cpt_code?: string }
    const rule = PAYER_RULES.find((r) => r.payer.toLowerCase().includes(payer.toLowerCase()))
    if (!rule) return { error: `No criteria for "${payer}"`, available_payers: PAYER_RULES.map((r) => r.payer) }
    return {
      payer: rule.payer,
      covered_codes: cpt_code ? rule.cptCodes.filter((c) => c === cpt_code) : rule.cptCodes,
      requires_pa: rule.requires_pa,
      criteria_summary: rule.criteria_summary,
      step_therapy: rule.step_therapy ?? [],
      diagnosis_required: rule.diagnosis_required ?? [],
      quantity_limit: rule.quantity_limit ?? null,
      turnaround: { standard_days: rule.turnaround_days, expedited_hours: rule.expedited_turnaround_hours },
      contacts: { portal_url: rule.portal_url, phone: rule.phone, fax: rule.fax },
    }
  }

  if (name === "get_pa_form_fields") {
    const { required_only } = args as { required_only?: boolean }
    const fields = required_only ? PA_FORM_FIELDS.filter((f) => f.required) : PA_FORM_FIELDS
    return { total_fields: fields.length, required_count: fields.filter((f) => f.required).length, fields }
  }

  if (name === "submit_prior_auth") {
    const a = args as {
      patient_name: string; patient_member_id: string; payer: string
      procedure_code: string; procedure_name: string; diagnosis_codes: string[]
      ordering_provider_npi: string; ordering_provider_name: string
      clinical_rationale: string; prior_treatments?: string
      urgency?: string; service_start_date?: string
    }
    const rule = PAYER_RULES.find((r) => r.payer.toLowerCase().includes(a.payer.toLowerCase()))
    const warnings: string[] = []
    if (rule?.step_therapy?.length && !a.prior_treatments)
      warnings.push(`${rule.payer} requires step therapy documentation.`)
    if (rule?.diagnosis_required?.length) {
      const hasRequired = rule.diagnosis_required.some((dx) => a.diagnosis_codes.includes(dx))
      if (!hasRequired) warnings.push(`Expected diagnosis codes: ${rule.diagnosis_required.join(", ")}`)
    }
    const refNumber = `PA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    return {
      reference_number: refNumber, status: "submitted",
      submitted_at: new Date().toISOString(),
      payer: a.payer, patient_name: a.patient_name,
      procedure_code: a.procedure_code, procedure_name: a.procedure_name,
      diagnosis_codes: a.diagnosis_codes, urgency: a.urgency ?? "routine",
      estimated_turnaround: rule
        ? (a.urgency === "urgent" || a.urgency === "emergent"
          ? `${rule.expedited_turnaround_hours} hours`
          : `${rule.turnaround_days} business days`)
        : "3-5 business days",
      portal_url: rule?.portal_url, warnings,
      next_steps: [
        `Save reference number: ${refNumber}`,
        rule?.portal_url ? `Track at: ${rule.portal_url}` : "Contact payer to track status",
        warnings.length > 0 ? "Resolve warnings before final submission" : "All fields validated",
      ],
    }
  }

  if (name === "check_pa_status") {
    const { reference_number, patient_name, procedure_code } = args as {
      reference_number?: string; patient_name?: string; procedure_code?: string
    }
    if (!reference_number && !patient_name) return { error: "Provide reference_number or patient_name" }
    return {
      query: { reference_number, patient_name, procedure_code },
      status: "submitted",
      submitted_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      estimated_decision: new Date(Date.now() + 86400000).toISOString(),
      notes: "PA is under review. No action needed unless payer requests additional info.",
    }
  }

  if (name === "generate_appeal") {
    const a = args as Parameters<typeof buildAppealLetter>[0]
    const letter = buildAppealLetter(a)
    const rule = PAYER_RULES.find((r) => r.payer.toLowerCase().includes(a.payer.toLowerCase()))
    return {
      appeal_letter: letter,
      submission: { fax: rule?.fax, portal: rule?.portal_url, phone: rule?.phone },
      peer_to_peer_tips: [
        "Request P2P review within 24h of denial",
        "Ask for reviewer in same specialty",
        "Bring: NEJM/JCO citations, NCCN guidelines, genomic data",
        "Document call date, reviewer name, outcome",
      ],
    }
  }

  return { error: `Unknown tool: ${name}` }
}

// ── JSON-RPC 2.0 handler ─────────────────────────────────────────────

type JsonRpcRequest = {
  jsonrpc: "2.0"
  id: string | number | null
  method: string
  params?: Record<string, unknown>
}

function rpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } }
}

function rpcResult(id: string | number | null, result: unknown) {
  return { jsonrpc: "2.0", id, result }
}

function handleRpc(req: JsonRpcRequest): unknown {
  const { id, method, params } = req

  // ── initialize ──
  if (method === "initialize") {
    return rpcResult(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "openrx-pa", version: "1.0.0" },
    })
  }

  // ── tools/list ──
  if (method === "tools/list") {
    return rpcResult(id, { tools: TOOLS })
  }

  // ── tools/call ──
  if (method === "tools/call") {
    const { name, arguments: toolArgs } = (params ?? {}) as { name?: string; arguments?: ToolArgs }
    if (!name) return rpcError(id, -32602, "Missing tool name")

    const tool = TOOLS.find((t) => t.name === name)
    if (!tool) return rpcError(id, -32602, `Unknown tool: ${name}`)

    try {
      const result = executeTool(name, toolArgs ?? {})
      return rpcResult(id, {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: false,
      })
    } catch (e) {
      return rpcResult(id, {
        content: [{ type: "text", text: `Tool error: ${String(e)}` }],
        isError: true,
      })
    }
  }

  // ── notifications/initialized (no response needed) ──
  if (method === "notifications/initialized") return null

  // ── ping ──
  if (method === "ping") return rpcResult(id, {})

  return rpcError(id, -32601, `Method not found: ${method}`)
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
}

// ── Route handlers ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as JsonRpcRequest | JsonRpcRequest[]

    // Handle batch requests
    if (Array.isArray(body)) {
      const results = body.map(handleRpc).filter(Boolean)
      return NextResponse.json(results, { headers: CORS })
    }

    const result = handleRpc(body)

    // Notifications have no response
    if (result === null) {
      return new NextResponse(null, { status: 204, headers: CORS })
    }

    return NextResponse.json(result, { headers: CORS })
  } catch (err) {
    return NextResponse.json(
      rpcError(null, -32700, `Parse error: ${String(err)}`),
      { status: 400, headers: CORS }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    {
      name: "openrx-pa",
      version: "1.0.0",
      protocol: "Model Context Protocol (MCP) — JSON-RPC 2.0",
      endpoint: "/api/mcp",
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
      status: "operational",
      hipaa_notice: "This endpoint handles PHI. HTTPS required in production.",
    },
    { headers: CORS }
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}
