"use client"

import { priorAuths, getPatient, getPhysician } from "@/lib/seed-data"
import { cn, formatDate, getStatusColor } from "@/lib/utils"
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
} from "lucide-react"
import AIAction from "@/components/ai-action"

export default function PriorAuthPage() {
  const pending = priorAuths.filter(
    (p) => p.status === "pending" || p.status === "submitted"
  )
  const approved = priorAuths.filter((p) => p.status === "approved")
  const denied = priorAuths.filter((p) => p.status === "denied")

  const getIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 size={16} className="text-accent" />
      case "denied":
        return <XCircle size={16} className="text-soft-red" />
      case "submitted":
        return <Send size={16} className="text-soft-blue" />
      default:
        return <Clock size={16} className="text-yellow-600" />
    }
  }

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-warm-800">
            Prior Authorizations
          </h1>
          <p className="text-sm text-warm-500 mt-1">
            {priorAuths.length} total &middot;{" "}
            <span className="text-yellow-600 font-medium">
              {pending.length} pending
            </span>{" "}
            &middot;{" "}
            <span className="text-accent font-medium">
              {approved.length} approved
            </span>{" "}
            &middot;{" "}
            <span className="text-soft-red font-medium">
              {denied.length} denied
            </span>
          </p>
        </div>
        <AIAction
          agentId="prior-auth"
          label="Check All PA Status"
          prompt="Check the status of all pending and submitted prior authorizations. For any that are past expected turnaround time, escalate. For denied PAs, prepare peer-to-peer review materials."
          context={`Pending: ${pending.length}, Denied: ${denied.length}`}
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-yellow-50 rounded-2xl border border-yellow-200/50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-yellow-600" />
            <span className="text-sm font-bold text-yellow-700">
              Pending Review
            </span>
          </div>
          <div className="text-3xl font-bold text-yellow-700">
            {pending.length}
          </div>
          <div className="text-xs text-yellow-600 mt-1">
            {pending.filter((p) => p.urgency === "urgent").length} urgent
          </div>
        </div>
        <div className="bg-accent/5 rounded-2xl border border-accent/10 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={18} className="text-accent" />
            <span className="text-sm font-bold text-accent">Approved</span>
          </div>
          <div className="text-3xl font-bold text-accent">
            {approved.length}
          </div>
          <div className="text-xs text-accent/70 mt-1">This period</div>
        </div>
        <div className="bg-soft-red/5 rounded-2xl border border-soft-red/10 p-5">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={18} className="text-soft-red" />
            <span className="text-sm font-bold text-soft-red">Denied</span>
          </div>
          <div className="text-3xl font-bold text-soft-red">
            {denied.length}
          </div>
          <div className="text-xs text-soft-red/70 mt-1">Needs appeal</div>
        </div>
      </div>

      {/* PA List */}
      <div className="bg-white rounded-2xl border border-sand divide-y divide-sand/50">
        <div className="px-5 py-3 bg-cream/50 border-b border-sand">
          <h2 className="text-sm font-bold text-warm-700">
            All Authorizations
          </h2>
        </div>
        {priorAuths.map((pa) => {
          const patient = getPatient(pa.patient_id)
          const physician = getPhysician(pa.physician_id)

          return (
            <div
              key={pa.id}
              className={cn(
                "px-5 py-4 hover:bg-cream/30 transition",
                pa.urgency === "urgent" &&
                  pa.status === "pending" &&
                  "border-l-2 border-l-soft-red"
              )}
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5">{getIcon(pa.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-warm-800">
                      {pa.procedure_name}
                    </span>
                    <span className="text-xs text-warm-500 font-mono">
                      CPT {pa.procedure_code}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                        getStatusColor(pa.status)
                      )}
                    >
                      {pa.status}
                    </span>
                    {pa.urgency === "urgent" && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-soft-red">
                        <AlertTriangle size={10} />
                        URGENT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-warm-500 mt-1">
                    {patient?.full_name} &middot; {physician?.full_name} &middot;{" "}
                    {pa.insurance_provider}
                  </p>
                  <p className="text-xs text-warm-500 mt-0.5">
                    ICD: {pa.icd_codes.join(", ")}
                  </p>
                  <p className="text-[11px] text-warm-600 mt-2 leading-relaxed">
                    {pa.clinical_notes}
                  </p>
                  {pa.denial_reason && (
                    <div className="mt-2 p-2.5 bg-soft-red/5 rounded-lg border border-soft-red/10">
                      <p className="text-[10px] font-bold text-soft-red uppercase tracking-wider mb-0.5">
                        Denial Reason
                      </p>
                      <p className="text-xs text-soft-red">
                        {pa.denial_reason}
                      </p>
                      <AIAction
                        agentId="prior-auth"
                        label="Prepare Appeal"
                        prompt={`Prepare a peer-to-peer review appeal for denied PA ${pa.reference_number}. Denial: "${pa.denial_reason}". Gather additional clinical evidence to support medical necessity.`}
                        context={`Patient: ${getPatient(pa.patient_id)?.full_name}, Procedure: ${pa.procedure_name} (${pa.procedure_code}), ICD: ${pa.icd_codes.join(",")}, Insurer: ${pa.insurance_provider}`}
                        variant="compact"
                        className="mt-2"
                      />
                    </div>
                  )}
                  {(pa.status === "pending" || pa.status === "submitted") && (
                    <AIAction
                      agentId="prior-auth"
                      label={pa.status === "pending" ? "AI Submit" : "Check Status"}
                      prompt={pa.status === "pending"
                        ? `Auto-fill and submit prior authorization for ${pa.procedure_name}. Match clinical criteria to ${pa.insurance_provider} requirements and submit via ePA.`
                        : `Check the current status of PA ${pa.reference_number} with ${pa.insurance_provider}. If past expected turnaround, escalate.`}
                      context={`Patient: ${getPatient(pa.patient_id)?.full_name}, CPT: ${pa.procedure_code}, Insurer: ${pa.insurance_provider}`}
                      variant="compact"
                      className="mt-2"
                    />
                  )}
                </div>
                <div className="text-right shrink-0">
                  {pa.reference_number && (
                    <div className="text-[10px] font-mono text-cloudy">
                      {pa.reference_number}
                    </div>
                  )}
                  {pa.submitted_at && (
                    <div className="text-[10px] text-cloudy mt-0.5">
                      Submitted {formatDate(pa.submitted_at)}
                    </div>
                  )}
                  {pa.resolved_at && (
                    <div className="text-[10px] text-cloudy mt-0.5">
                      Resolved {formatDate(pa.resolved_at)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
