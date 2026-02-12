"use client"

import {
  getPatient,
  getPhysician,
  getPatientAppointments,
  getPatientClaims,
  getPatientPrescriptions,
  getPatientMessages,
} from "@/lib/seed-data"
import {
  cn,
  formatCurrency,
  formatDate,
  formatTime,
  getInitials,
  getStatusColor,
} from "@/lib/utils"
import {
  ArrowLeft,
  Calendar,
  Receipt,
  Pill,
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import AIAction from "@/components/ai-action"

export default function PatientDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const patient = getPatient(id)

  if (!patient) {
    return (
      <div className="text-center py-20">
        <p className="text-warm-500">Patient not found.</p>
        <Link
          href="/patients"
          className="text-terra text-sm font-semibold mt-2 inline-block"
        >
          Back to Patients
        </Link>
      </div>
    )
  }

  const physician = getPhysician(patient.primary_physician_id)
  const appointments = getPatientAppointments(patient.id)
  const claimsData = getPatientClaims(patient.id)
  const prescriptionsData = getPatientPrescriptions(patient.id)
  const messagesData = getPatientMessages(patient.id)

  return (
    <div className="animate-slide-up space-y-6">
      {/* Back */}
      <Link
        href="/patients"
        className="inline-flex items-center gap-1.5 text-sm text-warm-500 hover:text-terra transition"
      >
        <ArrowLeft size={14} />
        All Patients
      </Link>

      {/* Patient Header */}
      <div className="bg-white rounded-2xl border border-sand p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-terra/10 to-terra/5 flex items-center justify-center text-terra font-bold text-xl font-serif shrink-0">
            {getInitials(patient.full_name)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-serif text-warm-800">
              {patient.full_name}
            </h1>
            <p className="text-sm text-warm-500 mt-1">
              {patient.gender} &middot; DOB:{" "}
              {formatDate(patient.date_of_birth)} &middot; Primary:{" "}
              {physician?.full_name}
            </p>

            <div className="flex flex-wrap gap-4 mt-4 text-xs text-warm-500">
              <span className="flex items-center gap-1.5">
                <Phone size={13} /> {patient.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail size={13} /> {patient.email}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={13} /> {patient.address}
              </span>
            </div>

            {/* Insurance */}
            <div className="mt-3 p-3 bg-cream rounded-xl inline-block">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-soft-blue" />
                <span className="text-xs font-semibold text-warm-800">
                  {patient.insurance_provider}
                </span>
                <span className="text-xs text-warm-500">
                  {patient.insurance_plan}
                </span>
                <span className="text-xs font-mono text-cloudy">
                  {patient.insurance_id}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Medical History */}
        <div className="mt-5 pt-5 border-t border-sand">
          <h3 className="text-xs font-bold text-warm-500 uppercase tracking-wider mb-2">
            Medical History
          </h3>
          <div className="flex flex-wrap gap-2">
            {patient.medical_history.map((h) => (
              <span
                key={h.condition}
                className={cn(
                  "text-xs font-semibold px-3 py-1 rounded-full",
                  h.status === "in-treatment"
                    ? "bg-terra-100 text-terra"
                    : h.status === "active"
                    ? "bg-yellow-100 text-yellow-700"
                    : h.status === "monitored"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-green-100 text-green-700"
                )}
              >
                {h.condition} ({h.status})
              </span>
            ))}
          </div>
          {patient.allergies.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-soft-red" />
              <span className="text-xs font-semibold text-soft-red">
                Allergies:
              </span>
              <span className="text-xs text-warm-600">
                {patient.allergies.join(", ")}
              </span>
            </div>
          )}

          {/* AI Actions for this patient */}
          <div className="mt-4 pt-4 border-t border-sand flex flex-wrap gap-2">
            <AIAction
              agentId="coordinator"
              label="Message Patient"
              prompt={`Draft a personalized check-in message for ${patient.full_name}. Consider their active conditions, upcoming appointments, and any adherence concerns.`}
              context={`Conditions: ${patient.medical_history.map(h => `${h.condition} (${h.status})`).join(", ")}, Allergies: ${patient.allergies.join(", ") || "None"}, Insurance: ${patient.insurance_provider}`}
              variant="inline"
            />
            <AIAction
              agentId="rx"
              label="Check Medications"
              prompt={`Review all active medications for ${patient.full_name}. Check for drug-drug interactions, adherence issues, and upcoming refill needs.`}
              context={`Patient: ${patient.full_name}, Active Rx: ${prescriptionsData.filter(r => r.status === "active").map(r => `${r.medication_name} ${r.dosage}`).join(", ")}`}
              variant="inline"
            />
            <AIAction
              agentId="billing"
              label="Review Claims"
              prompt={`Analyze all claims for ${patient.full_name}. Check for errors, denied claims needing appeal, and outstanding patient responsibility.`}
              context={`Patient: ${patient.full_name}, Claims: ${claimsData.length}, Insurance: ${patient.insurance_provider} ${patient.insurance_plan}`}
              variant="inline"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments */}
        <div className="bg-white rounded-2xl border border-sand">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-sand">
            <Calendar size={16} className="text-terra" />
            <h2 className="text-sm font-bold text-warm-800">
              Appointments ({appointments.length})
            </h2>
          </div>
          <div className="divide-y divide-sand/50 max-h-[300px] overflow-y-auto">
            {[...appointments]
              .sort(
                (a, b) =>
                  new Date(b.scheduled_at).getTime() -
                  new Date(a.scheduled_at).getTime()
              )
              .map((apt) => {
                const doc = getPhysician(apt.physician_id)
                return (
                  <div key={apt.id} className="px-5 py-3 hover:bg-cream/30 transition">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-warm-800">
                        {formatDate(apt.scheduled_at)} at{" "}
                        {formatTime(apt.scheduled_at)}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                          getStatusColor(apt.status)
                        )}
                      >
                        {apt.status}
                      </span>
                    </div>
                    <p className="text-xs text-warm-500 mt-0.5">
                      {apt.reason} &middot; {doc?.full_name} &middot;{" "}
                      {apt.duration_minutes}min
                    </p>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Prescriptions */}
        <div className="bg-white rounded-2xl border border-sand">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-sand">
            <Pill size={16} className="text-accent" />
            <h2 className="text-sm font-bold text-warm-800">
              Prescriptions ({prescriptionsData.length})
            </h2>
          </div>
          <div className="divide-y divide-sand/50 max-h-[300px] overflow-y-auto">
            {prescriptionsData.map((rx) => (
              <div key={rx.id} className="px-5 py-3 hover:bg-cream/30 transition">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-warm-800">
                    {rx.medication_name} {rx.dosage}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                      getStatusColor(rx.status)
                    )}
                  >
                    {rx.status}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold ml-auto",
                      rx.adherence_pct >= 90
                        ? "text-accent"
                        : rx.adherence_pct >= 80
                        ? "text-warm-600"
                        : "text-soft-red"
                    )}
                  >
                    {rx.adherence_pct}%
                  </span>
                </div>
                <p className="text-xs text-warm-500 mt-0.5">
                  {rx.frequency} &middot; {rx.refills_remaining} refills
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Claims */}
        <div className="bg-white rounded-2xl border border-sand">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-sand">
            <Receipt size={16} className="text-soft-blue" />
            <h2 className="text-sm font-bold text-warm-800">
              Claims ({claimsData.length})
            </h2>
          </div>
          <div className="divide-y divide-sand/50 max-h-[300px] overflow-y-auto">
            {claimsData.map((c) => (
              <div key={c.id} className="px-5 py-3 hover:bg-cream/30 transition">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-warm-800">
                    {c.claim_number}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                      getStatusColor(c.status)
                    )}
                  >
                    {c.status}
                  </span>
                  <span className="text-xs font-semibold text-warm-800 ml-auto">
                    {formatCurrency(c.total_amount)}
                  </span>
                </div>
                <p className="text-xs text-warm-500 mt-0.5">
                  {formatDate(c.date_of_service)} &middot; CPT:{" "}
                  {c.cpt_codes.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Messages */}
        <div className="bg-white rounded-2xl border border-sand">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-sand">
            <MessageSquare size={16} className="text-yellow-600" />
            <h2 className="text-sm font-bold text-warm-800">
              Messages ({messagesData.length})
            </h2>
          </div>
          <div className="divide-y divide-sand/50 max-h-[300px] overflow-y-auto">
            {[...messagesData]
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )
              .map((m) => (
                <div key={m.id} className="px-5 py-3 hover:bg-cream/30 transition">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wide",
                        m.sender_type === "agent"
                          ? "text-terra"
                          : m.sender_type === "physician"
                          ? "text-accent"
                          : m.sender_type === "system"
                          ? "text-yellow-600"
                          : "text-soft-blue"
                      )}
                    >
                      {m.sender_type}
                    </span>
                    <span className="text-[10px] text-cloudy capitalize">
                      {m.channel}
                    </span>
                    <span className="text-[10px] text-cloudy ml-auto">
                      {formatDate(m.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-warm-600 mt-0.5 line-clamp-2">
                    {m.content}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
