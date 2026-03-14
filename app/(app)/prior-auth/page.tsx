"use client"

import { useState } from "react"
import { cn, formatDate, getStatusColor } from "@/lib/utils"
import {
  AlertTriangle, CheckCircle2, XCircle, Clock, Send,
  FileText, Zap, ChevronRight, Shield, Activity,
  BookOpen, ArrowUpRight, Search, BarChart3, RefreshCw,
} from "lucide-react"
import AIAction from "@/components/ai-action"
import { useLiveSnapshot } from "@/lib/hooks/use-live-snapshot"

type Tab = "active" | "submit" | "evaluate"

interface EvalResult {
  found: boolean
  drug?: string
  drugClass?: string
  score?: number
  approvalLikelihood?: "HIGH" | "MODERATE" | "LOW"
  criteria?: {
    met: Array<{ id: string; label: string; required: boolean; evidenceLevel?: string }>
    missing: Array<{ id: string; label: string; description: string; required: boolean; evidenceLevel?: string; source?: string }>
  }
  stepTherapy?: { met: boolean; gaps: string[] }
  rems?: { required: boolean; program?: string | null }
  formulary?: { onFormulary: boolean; tier?: number; pa_required: boolean; notes?: string }
  payerOverride?: { additionalCriteria: string[]; preferredBiosimilar?: string } | null
  warnings?: string[]
  recommendations?: string[]
  guidelines?: { nccnCategory?: string; references: string[] }
  message?: string
}

export default function PriorAuthPage() {
  const { snapshot, getPhysician } = useLiveSnapshot()
  const myAuths = snapshot.priorAuths
  const [tab, setTab] = useState<Tab>("active")
  const [evalDrug, setEvalDrug] = useState("")
  const [evalHcpcs, setEvalHcpcs] = useState("")
  const [evalIcd10, setEvalIcd10] = useState("")
  const [evalPriorTx, setEvalPriorTx] = useState("")
  const [evalNotes, setEvalNotes] = useState("")
  const [evalPayer, setEvalPayer] = useState("")
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null)
  const [evalLoading, setEvalLoading] = useState(false)

  const pending = myAuths.filter((p) => p.status === "pending" || p.status === "submitted")
  const approved = myAuths.filter((p) => p.status === "approved")
  const denied = myAuths.filter((p) => p.status === "denied")

  const getIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle2 size={16} className="text-accent" />
      case "denied": return <XCircle size={16} className="text-soft-red" />
      case "submitted": return <Send size={16} className="text-blue-400" />
      default: return <Clock size={16} className="text-yellow-400" />
    }
  }

  async function runEvaluation() {
    if (!evalDrug && !evalHcpcs) return
    setEvalLoading(true)
    setEvalResult(null)
    try {
      const res = await fetch("/api/pa/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drugName: evalDrug,
          hcpcsCode: evalHcpcs || undefined,
          icd10Codes: evalIcd10.split(",").map((s) => s.trim()).filter(Boolean),
          priorTherapies: evalPriorTx.split(",").map((s) => s.trim()).filter(Boolean),
          clinicalNotes: evalNotes,
          payer: evalPayer,
        }),
      })
      const data = await res.json() as EvalResult
      setEvalResult(data)
    } catch {
      setEvalResult({ found: false, message: "Evaluation service unavailable." })
    } finally {
      setEvalLoading(false)
    }
  }

  const likelihoodColor = (l?: string) =>
    l === "HIGH" ? "text-accent bg-accent/10 border-accent/20"
    : l === "MODERATE" ? "text-yellow-400 bg-yellow-900/20 border-yellow-700/30"
    : "text-soft-red bg-soft-red/10 border-soft-red/20"

  return (
    <div className="animate-slide-up space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-warm-800">Prior Authorizations</h1>
          <p className="text-sm text-warm-500 mt-1">
            {myAuths.length} total &middot;{" "}
            <span className="text-yellow-400 font-medium">{pending.length} pending</span> &middot;{" "}
            <span className="text-accent font-medium">{approved.length} approved</span> &middot;{" "}
            <span className="text-soft-red font-medium">{denied.length} denied</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-warm-500 bg-sand/40 px-3 py-1.5 rounded-full border border-sand">
            <Shield size={11} className="text-accent" />
            <span>Da Vinci PAS v2.0</span>
          </div>
          <AIAction
            agentId="prior-auth"
            label="Ask Rex"
            prompt="Review all my prior authorizations. Which ones need urgent attention? Are there any denials I should appeal?"
            context={`Pending: ${pending.length}, Denied: ${denied.length}, Approved: ${approved.length}`}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-yellow-900/20 rounded-2xl border border-yellow-700/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-yellow-400" />
            <span className="text-xs font-bold text-yellow-400">Pending Review</span>
          </div>
          <div className="text-3xl font-bold text-yellow-400">{pending.length}</div>
          <div className="text-xs text-yellow-400/70 mt-1">
            {pending.filter((p) => p.urgency === "urgent").length} urgent
          </div>
        </div>
        <div className="bg-accent/5 rounded-2xl border border-accent/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={16} className="text-accent" />
            <span className="text-xs font-bold text-accent">Approved</span>
          </div>
          <div className="text-3xl font-bold text-accent">{approved.length}</div>
          <div className="text-xs text-accent/70 mt-1">This period</div>
        </div>
        <div className="bg-soft-red/5 rounded-2xl border border-soft-red/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={16} className="text-soft-red" />
            <span className="text-xs font-bold text-soft-red">Denied</span>
          </div>
          <div className="text-3xl font-bold text-soft-red">{denied.length}</div>
          <div className="text-xs text-soft-red/70 mt-1">Appeal eligible</div>
        </div>
        <div className="bg-pampas rounded-2xl border border-sand p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={16} className="text-warm-500" />
            <span className="text-xs font-bold text-warm-600">Approval Rate</span>
          </div>
          <div className="text-3xl font-bold text-warm-800">
            {myAuths.length > 0 ? Math.round((approved.length / myAuths.length) * 100) : 0}%
          </div>
          <div className="text-xs text-warm-500 mt-1">of {myAuths.length} total</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-sand/30 rounded-xl p-1 border border-sand w-fit">
        {([
          { id: "active" as Tab, label: "Active PAs", icon: FileText },
          { id: "evaluate" as Tab, label: "Criteria Check", icon: Zap },
          { id: "submit" as Tab, label: "FHIR Submit", icon: Send },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === id
                ? "bg-warm-800 text-cream shadow-sm"
                : "text-warm-500 hover:text-warm-700 hover:bg-sand/50"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Active PAs ── */}
      {tab === "active" && (
        <div className="bg-pampas rounded-2xl border border-sand divide-y divide-sand/50">
          <div className="px-5 py-3 bg-sand/20 border-b border-sand flex items-center justify-between">
            <h2 className="text-sm font-bold text-warm-700">All Authorizations</h2>
            <span className="text-xs text-warm-500">{myAuths.length} records</span>
          </div>
          {myAuths.length === 0 && (
            <div className="px-5 py-12 text-center">
              <Shield size={32} className="text-warm-300 mx-auto mb-3" />
              <p className="text-sm text-warm-500">No prior authorizations on file.</p>
              <p className="text-xs text-warm-400 mt-1">Use Criteria Check to evaluate a drug before submitting.</p>
            </div>
          )}
          {myAuths.map((pa) => {
            const physician = getPhysician(pa.physician_id)
            return (
              <div
                key={pa.id}
                className={cn(
                  "px-5 py-4 hover:bg-sand/20 transition",
                  pa.urgency === "urgent" && pa.status === "pending" && "border-l-2 border-l-soft-red"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">{getIcon(pa.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-warm-800">{pa.procedure_name}</span>
                      <span className="text-xs text-warm-500 font-mono">CPT {pa.procedure_code}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                        getStatusColor(pa.status)
                      )}>
                        {pa.status}
                      </span>
                      {pa.urgency === "urgent" && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-soft-red">
                          <AlertTriangle size={10} />URGENT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-warm-500 mt-1">
                      {physician?.full_name ?? "Clinician"} &middot; {pa.insurance_provider}
                    </p>
                    {pa.icd_codes.length > 0 && (
                      <p className="text-xs text-warm-500 mt-0.5 font-mono">ICD: {pa.icd_codes.join(", ")}</p>
                    )}
                    <p className="text-[11px] text-warm-600 mt-2 leading-relaxed">{pa.clinical_notes}</p>

                    {/* Denial reason */}
                    {pa.denial_reason && (
                      <div className="mt-3 p-3 bg-soft-red/5 rounded-xl border border-soft-red/10">
                        <p className="text-[10px] font-bold text-soft-red uppercase tracking-wider mb-1">Denial Reason</p>
                        <p className="text-xs text-soft-red">{pa.denial_reason}</p>
                        <div className="flex gap-2 mt-2">
                          <AIAction
                            agentId="prior-auth"
                            label="Draft Appeal"
                            prompt={`Draft a PA appeal letter for ${pa.procedure_name}. Denial: "${pa.denial_reason}". Reference: ${pa.reference_number}. What clinical evidence should I include?`}
                            context={`CPT: ${pa.procedure_code}, ICD: ${pa.icd_codes.join(",")}, Insurer: ${pa.insurance_provider}`}
                            variant="compact"
                          />
                          <button
                            onClick={() => {
                              setTab("evaluate")
                              setEvalHcpcs(pa.procedure_code)
                              setEvalIcd10(pa.icd_codes.join(", "))
                              setEvalPayer(pa.insurance_provider)
                            }}
                            className="flex items-center gap-1 text-[11px] font-medium text-warm-600 hover:text-warm-800 bg-sand/50 hover:bg-sand px-2.5 py-1 rounded-lg border border-sand transition"
                          >
                            <Zap size={10} />
                            Re-evaluate
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Pending actions */}
                    {(pa.status === "pending" || pa.status === "submitted") && (
                      <div className="flex gap-2 mt-2">
                        <AIAction
                          agentId="prior-auth"
                          label={pa.status === "pending" ? "Submit via Rex" : "Check Status"}
                          prompt={pa.status === "pending"
                            ? `Submit my prior authorization for ${pa.procedure_name} to ${pa.insurance_provider}. Use FHIR Da Vinci PAS format. Reference: ${pa.reference_number}.`
                            : `Check status of PA ${pa.reference_number} with ${pa.insurance_provider}. Has there been a decision?`}
                          context={`CPT: ${pa.procedure_code}, Insurer: ${pa.insurance_provider}`}
                          variant="compact"
                        />
                        <button
                          onClick={() => {
                            setTab("evaluate")
                            setEvalHcpcs(pa.procedure_code)
                            setEvalIcd10(pa.icd_codes.join(", "))
                            setEvalPayer(pa.insurance_provider)
                          }}
                          className="flex items-center gap-1 text-[11px] font-medium text-warm-600 hover:text-warm-800 bg-sand/50 hover:bg-sand px-2.5 py-1 rounded-lg border border-sand transition"
                        >
                          <Activity size={10} />
                          Check Criteria
                        </button>
                      </div>
                    )}

                    {/* Approved */}
                    {pa.status === "approved" && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-accent">
                        <CheckCircle2 size={11} />
                        <span>Approved &middot; Valid 180 days from approval date</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {pa.reference_number && (
                      <div className="text-[10px] font-mono text-cloudy">{pa.reference_number}</div>
                    )}
                    {pa.submitted_at && (
                      <div className="text-[10px] text-cloudy mt-0.5">Submitted {formatDate(pa.submitted_at)}</div>
                    )}
                    {pa.resolved_at && (
                      <div className="text-[10px] text-cloudy mt-0.5">Resolved {formatDate(pa.resolved_at)}</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Tab: Criteria Evaluation ── */}
      {tab === "evaluate" && (
        <div className="grid grid-cols-2 gap-6">
          {/* Input form */}
          <div className="bg-pampas rounded-2xl border border-sand p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-accent" />
              <h2 className="text-sm font-bold text-warm-800">Real-Time Criteria Check</h2>
            </div>
            <p className="text-xs text-warm-500">
              Evaluate approval likelihood before submission using our structured payer rules engine
              (LCD/NCD + NCCN guidelines).
            </p>

            <div>
              <label className="text-xs font-bold text-warm-700 block mb-1">Drug Name</label>
              <input
                value={evalDrug}
                onChange={(e) => setEvalDrug(e.target.value)}
                placeholder="e.g. Teclistamab, Dupixent, Keytruda"
                className="w-full text-sm bg-white/50 border border-sand rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent/50 text-warm-800 placeholder:text-warm-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-warm-700 block mb-1">HCPCS/CPT Code</label>
                <input
                  value={evalHcpcs}
                  onChange={(e) => setEvalHcpcs(e.target.value)}
                  placeholder="J9269, Q2050..."
                  className="w-full text-sm bg-white/50 border border-sand rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent/50 text-warm-800 placeholder:text-warm-400 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-warm-700 block mb-1">Payer</label>
                <input
                  value={evalPayer}
                  onChange={(e) => setEvalPayer(e.target.value)}
                  placeholder="Aetna, UHC, Medicare..."
                  className="w-full text-sm bg-white/50 border border-sand rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent/50 text-warm-800 placeholder:text-warm-400"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-warm-700 block mb-1">ICD-10 Codes</label>
              <input
                value={evalIcd10}
                onChange={(e) => setEvalIcd10(e.target.value)}
                placeholder="C90.01, C90.02 (comma-separated)"
                className="w-full text-sm bg-white/50 border border-sand rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent/50 text-warm-800 placeholder:text-warm-400 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-warm-700 block mb-1">Prior Therapies Tried</label>
              <input
                value={evalPriorTx}
                onChange={(e) => setEvalPriorTx(e.target.value)}
                placeholder="Bortezomib, Lenalidomide, Daratumumab..."
                className="w-full text-sm bg-white/50 border border-sand rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent/50 text-warm-800 placeholder:text-warm-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-warm-700 block mb-1">Clinical Notes (optional)</label>
              <textarea
                value={evalNotes}
                onChange={(e) => setEvalNotes(e.target.value)}
                placeholder="ECOG status, lab values, rationale..."
                rows={3}
                className="w-full text-sm bg-white/50 border border-sand rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent/50 text-warm-800 placeholder:text-warm-400 resize-none"
              />
            </div>

            <button
              onClick={runEvaluation}
              disabled={(!evalDrug && !evalHcpcs) || evalLoading}
              className="w-full flex items-center justify-center gap-2 bg-warm-800 hover:bg-warm-900 disabled:opacity-40 text-cream text-sm font-bold py-2.5 rounded-xl transition"
            >
              {evalLoading ? (
                <><RefreshCw size={14} className="animate-spin" /> Evaluating...</>
              ) : (
                <><Search size={14} /> Check Approval Likelihood</>
              )}
            </button>
          </div>

          {/* Results panel */}
          <div className="space-y-4">
            {!evalResult && !evalLoading && (
              <div className="bg-pampas rounded-2xl border border-sand p-8 text-center h-full flex flex-col items-center justify-center">
                <Activity size={32} className="text-warm-300 mb-3" />
                <p className="text-sm text-warm-500">Enter a drug name or HCPCS code</p>
                <p className="text-xs text-warm-400 mt-1">Powered by LCD/NCD + NCCN guidelines</p>
              </div>
            )}

            {evalResult && (
              <div className="space-y-4">
                {/* Score card */}
                {evalResult.found && evalResult.score !== undefined && (
                  <div className={cn(
                    "rounded-2xl border p-4",
                    evalResult.approvalLikelihood === "HIGH"
                      ? "bg-accent/5 border-accent/15"
                      : evalResult.approvalLikelihood === "MODERATE"
                      ? "bg-yellow-900/10 border-yellow-700/20"
                      : "bg-soft-red/5 border-soft-red/15"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-bold text-warm-800">{evalResult.drug}</h3>
                        <p className="text-xs text-warm-500">{evalResult.drugClass?.replace(/_/g, " ")}</p>
                      </div>
                      <div className={cn(
                        "text-right px-3 py-1.5 rounded-xl border",
                        likelihoodColor(evalResult.approvalLikelihood)
                      )}>
                        <div className="text-2xl font-bold">{evalResult.score}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wide">{evalResult.approvalLikelihood} likelihood</div>
                      </div>
                    </div>
                    {/* Score bar */}
                    <div className="h-2 bg-sand rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          evalResult.score >= 85 ? "bg-accent" : evalResult.score >= 60 ? "bg-yellow-400" : "bg-soft-red"
                        )}
                        style={{ width: `${evalResult.score}%` }}
                      />
                    </div>

                    {/* REMS warning */}
                    {evalResult.rems?.required && (
                      <div className="mt-3 flex items-start gap-2 p-2.5 bg-yellow-900/15 rounded-lg border border-yellow-700/20">
                        <AlertTriangle size={13} className="text-yellow-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-bold text-yellow-400">REMS Required</p>
                          <p className="text-[11px] text-yellow-400/80">{evalResult.rems.program}</p>
                        </div>
                      </div>
                    )}

                    {/* Formulary */}
                    {evalResult.formulary && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-warm-600">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          evalResult.formulary.onFormulary ? "bg-accent/10 text-accent" : "bg-soft-red/10 text-soft-red"
                        )}>
                          {evalResult.formulary.onFormulary ? `Formulary Tier ${evalResult.formulary.tier}` : "Not on formulary"}
                        </span>
                        {evalResult.formulary.notes && <span className="text-warm-400">{evalResult.formulary.notes}</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* Not found */}
                {!evalResult.found && (
                  <div className="bg-pampas rounded-2xl border border-sand p-4">
                    <p className="text-sm text-warm-600">{evalResult.message}</p>
                  </div>
                )}

                {/* Criteria */}
                {evalResult.criteria && (
                  <div className="bg-pampas rounded-2xl border border-sand overflow-hidden">
                    <div className="px-4 py-2.5 bg-sand/20 border-b border-sand">
                      <h3 className="text-xs font-bold text-warm-700">Clinical Criteria</h3>
                    </div>
                    <div className="divide-y divide-sand/50">
                      {evalResult.criteria.met.map((c) => (
                        <div key={c.id} className="px-4 py-2.5 flex items-start gap-3">
                          <CheckCircle2 size={13} className="text-accent shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-warm-700 font-medium">{c.label}</span>
                            {c.evidenceLevel && (
                              <span className="ml-2 text-[10px] text-warm-400 bg-sand/50 px-1.5 py-0.5 rounded">
                                Level {c.evidenceLevel}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {evalResult.criteria.missing.map((c) => (
                        <div key={c.id} className={cn(
                          "px-4 py-2.5 flex items-start gap-3",
                          c.required ? "bg-soft-red/3" : ""
                        )}>
                          <XCircle size={13} className={cn("shrink-0 mt-0.5", c.required ? "text-soft-red" : "text-warm-400")} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-xs font-medium", c.required ? "text-soft-red" : "text-warm-500")}>
                                {c.label}
                              </span>
                              {c.required && (
                                <span className="text-[9px] font-bold text-soft-red bg-soft-red/10 px-1.5 py-0.5 rounded">REQUIRED</span>
                              )}
                            </div>
                            <p className="text-[11px] text-warm-500 mt-0.5">{c.description}</p>
                            {c.source && <p className="text-[10px] text-warm-400 mt-0.5 italic">Source: {c.source}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step therapy */}
                {evalResult.stepTherapy && !evalResult.stepTherapy.met && (
                  <div className="bg-yellow-900/10 rounded-2xl border border-yellow-700/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={13} className="text-yellow-400" />
                      <h3 className="text-xs font-bold text-yellow-400">Step Therapy Gaps</h3>
                    </div>
                    <ul className="space-y-1.5">
                      {evalResult.stepTherapy.gaps.map((g, i) => (
                        <li key={i} className="text-xs text-yellow-300 flex items-start gap-2">
                          <ChevronRight size={11} className="shrink-0 mt-0.5" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {evalResult.recommendations && evalResult.recommendations.length > 0 && (
                  <div className="bg-pampas rounded-2xl border border-sand p-4">
                    <h3 className="text-xs font-bold text-warm-700 mb-2.5 flex items-center gap-2">
                      <BookOpen size={12} />Recommendations
                    </h3>
                    <ul className="space-y-1.5">
                      {evalResult.recommendations.map((r, i) => (
                        <li key={i} className="text-[11px] text-warm-600 flex items-start gap-2">
                          <ChevronRight size={10} className="shrink-0 mt-0.5 text-accent" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Guidelines */}
                {evalResult.guidelines?.references && evalResult.guidelines.references.length > 0 && (
                  <div className="bg-pampas rounded-2xl border border-sand p-4">
                    <h3 className="text-xs font-bold text-warm-700 mb-2.5">
                      Evidence Base
                      {evalResult.guidelines.nccnCategory && (
                        <span className="ml-2 text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                          NCCN Category {evalResult.guidelines.nccnCategory}
                        </span>
                      )}
                    </h3>
                    <ul className="space-y-1">
                      {evalResult.guidelines.references.map((ref, i) => (
                        <li key={i} className="text-[11px] text-warm-500 flex items-center gap-1.5">
                          <ArrowUpRight size={10} className="text-warm-400 shrink-0" />
                          {ref}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Payer override */}
                {evalResult.payerOverride && (
                  <div className="bg-blue-900/10 rounded-2xl border border-blue-700/20 p-4">
                    <h3 className="text-xs font-bold text-blue-400 mb-2">Payer-Specific Requirements</h3>
                    {evalResult.payerOverride.preferredBiosimilar && (
                      <p className="text-xs text-blue-300 mb-1.5">
                        Preferred biosimilar: <strong>{evalResult.payerOverride.preferredBiosimilar}</strong>
                      </p>
                    )}
                    {evalResult.payerOverride.additionalCriteria.map((c, i) => (
                      <p key={i} className="text-[11px] text-blue-300 flex items-start gap-1.5">
                        <ChevronRight size={10} className="shrink-0 mt-0.5" />{c}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: FHIR Submit ── */}
      {tab === "submit" && (
        <div className="bg-pampas rounded-2xl border border-sand p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Shield size={16} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-warm-800">Da Vinci PAS Submission</h2>
              <p className="text-xs text-warm-500">FHIR R4 Claim/$submit — HL7 Da Vinci PAS v2.0</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/40 rounded-xl border border-sand space-y-2">
              <h3 className="text-xs font-bold text-warm-700">Request Format</h3>
              <div className="text-[11px] text-warm-500 space-y-1">
                <p className="flex items-center gap-1.5"><CheckCircle2 size={10} className="text-accent" /> FHIR R4 Bundle (collection)</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 size={10} className="text-accent" /> Claim (preauthorization use)</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 size={10} className="text-accent" /> Patient, Practitioner, Coverage</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 size={10} className="text-accent" /> ServiceRequest + Conditions</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 size={10} className="text-accent" /> Da Vinci PAS extensions</p>
              </div>
            </div>
            <div className="p-4 bg-white/40 rounded-xl border border-sand space-y-2">
              <h3 className="text-xs font-bold text-warm-700">Endpoints</h3>
              <div className="text-[11px] font-mono text-warm-600 space-y-1.5">
                <p className="bg-sand/50 px-2 py-1 rounded">POST /api/fhir/pas</p>
                <p className="bg-sand/50 px-2 py-1 rounded">GET /api/fhir/metadata</p>
                <p className="bg-sand/50 px-2 py-1 rounded">GET /api/fhir/pas?preAuthRef=</p>
                <p className="bg-sand/50 px-2 py-1 rounded">POST /api/pa/evaluate</p>
                <p className="bg-sand/50 px-2 py-1 rounded">POST /api/mcp</p>
              </div>
            </div>
          </div>

          {/* Submit PAs for denied/pending */}
          {(pending.length > 0 || denied.length > 0) && (
            <div className="mt-2">
              <h3 className="text-xs font-bold text-warm-700 mb-3">Submit Pending PAs via FHIR</h3>
              <div className="space-y-2">
                {[...pending, ...denied].slice(0, 5).map((pa) => (
                  <div key={pa.id} className="flex items-center justify-between p-3 bg-white/40 rounded-xl border border-sand">
                    <div className="flex items-center gap-3">
                      {getIcon(pa.status)}
                      <div>
                        <p className="text-xs font-bold text-warm-800">{pa.procedure_name}</p>
                        <p className="text-[10px] text-warm-500 font-mono">{pa.procedure_code} &middot; {pa.insurance_provider}</p>
                      </div>
                    </div>
                    <AIAction
                      agentId="prior-auth"
                      label="Submit FHIR PA"
                      prompt={`Submit prior authorization for ${pa.procedure_name} (${pa.procedure_code}) to ${pa.insurance_provider} using the Da Vinci PAS FHIR format. Reference: ${pa.reference_number}. Clinical notes: ${pa.clinical_notes}`}
                      context={`ICD: ${pa.icd_codes.join(",")}, Urgency: ${pa.urgency}`}
                      variant="compact"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-sand">
            <p className="text-[11px] text-warm-400">
              FHIR R4 Da Vinci PAS compliant with CMS-0057-F (2027 mandate). All bundles include
              US Core profiles for Patient, Practitioner, and Coverage. X12 278 mapping available on request.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
