"use client"

import { prescriptions, getPatient, getPhysician } from "@/lib/seed-data"
import { cn, formatDate, getStatusColor } from "@/lib/utils"
import { Pill, Search, AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react"
import { useState, useMemo } from "react"

export default function PrescriptionsPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const statuses = useMemo(
    () => Array.from(new Set(prescriptions.map((p) => p.status))),
    []
  )

  const filtered = useMemo(() => {
    return prescriptions.filter((rx) => {
      const patient = getPatient(rx.patient_id)
      const matchesSearch =
        !search ||
        rx.medication_name.toLowerCase().includes(search.toLowerCase()) ||
        patient?.full_name.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = !statusFilter || rx.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [search, statusFilter])

  const lowAdherenceCount = prescriptions.filter(
    (p) => p.status === "active" && p.adherence_pct < 80
  ).length
  const pendingRefills = prescriptions.filter(
    (p) => p.status === "pending-refill"
  ).length

  return (
    <div className="animate-slide-up space-y-6">
      <div>
        <h1 className="text-2xl font-serif text-warm-800">Prescriptions</h1>
        <p className="text-sm text-warm-500 mt-1">
          {prescriptions.length} prescriptions &middot;{" "}
          <span className="text-soft-red font-medium">
            {lowAdherenceCount} low adherence
          </span>{" "}
          &middot;{" "}
          <span className="text-yellow-600 font-medium">
            {pendingRefills} pending refills
          </span>
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-cloudy"
          />
          <input
            type="text"
            placeholder="Search medication or patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sand bg-white text-sm text-warm-800 placeholder:text-cloudy focus:outline-none focus:border-terra/40 focus:ring-1 focus:ring-terra/20 transition"
          />
        </div>
        <div className="flex bg-white border border-sand rounded-xl overflow-hidden">
          <button
            onClick={() => setStatusFilter("")}
            className={cn(
              "px-3 py-2 text-xs font-semibold transition-all",
              !statusFilter
                ? "bg-terra text-white"
                : "text-warm-600 hover:bg-cream"
            )}
          >
            All
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-2 text-xs font-semibold transition-all capitalize",
                statusFilter === s
                  ? "bg-terra text-white"
                  : "text-warm-600 hover:bg-cream"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="bg-white rounded-2xl border border-sand divide-y divide-sand/50">
        {filtered.map((rx) => {
          const patient = getPatient(rx.patient_id)
          const physician = getPhysician(rx.physician_id)
          const isLowAdherence = rx.status === "active" && rx.adherence_pct < 80

          return (
            <div
              key={rx.id}
              className={cn(
                "flex items-center gap-4 px-5 py-4 hover:bg-cream/30 transition",
                isLowAdherence && "border-l-2 border-l-soft-red"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  isLowAdherence
                    ? "bg-soft-red/10"
                    : rx.status === "pending-refill"
                    ? "bg-yellow-50"
                    : rx.status === "completed"
                    ? "bg-gray-100"
                    : "bg-accent/5"
                )}
              >
                {isLowAdherence ? (
                  <AlertTriangle size={16} className="text-soft-red" />
                ) : rx.status === "pending-refill" ? (
                  <RefreshCw size={16} className="text-yellow-600" />
                ) : (
                  <Pill
                    size={16}
                    className={
                      rx.status === "completed" ? "text-gray-400" : "text-accent"
                    }
                  />
                )}
              </div>

              {/* Main */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-warm-800">
                    {rx.medication_name}
                  </span>
                  <span className="text-xs text-warm-600">{rx.dosage}</span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                      getStatusColor(rx.status)
                    )}
                  >
                    {rx.status}
                  </span>
                </div>
                <p className="text-xs text-warm-500 mt-0.5">
                  {patient?.full_name} &middot; {rx.frequency} &middot; Rx by{" "}
                  {physician?.full_name}
                </p>
                {rx.notes && (
                  <p className="text-[10px] text-cloudy mt-0.5 italic">
                    {rx.notes}
                  </p>
                )}
              </div>

              {/* Adherence */}
              <div className="w-24 shrink-0 text-center">
                <div
                  className={cn(
                    "text-lg font-bold",
                    rx.adherence_pct >= 90
                      ? "text-accent"
                      : rx.adherence_pct >= 80
                      ? "text-warm-700"
                      : "text-soft-red"
                  )}
                >
                  {rx.adherence_pct}%
                </div>
                <div className="text-[10px] text-cloudy">adherence</div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      rx.adherence_pct >= 90
                        ? "bg-accent"
                        : rx.adherence_pct >= 80
                        ? "bg-yellow-400"
                        : "bg-soft-red"
                    )}
                    style={{ width: `${rx.adherence_pct}%` }}
                  />
                </div>
              </div>

              {/* Meta */}
              <div className="text-right shrink-0">
                <div className="text-xs text-warm-500">
                  {rx.refills_remaining} refills left
                </div>
                <div className="text-[10px] text-cloudy mt-0.5">
                  Last filled {formatDate(rx.last_filled)}
                </div>
                <div className="text-[10px] text-cloudy">{rx.pharmacy}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
