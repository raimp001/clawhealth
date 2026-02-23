"use client"

import { getMyPrescriptions } from "@/lib/current-user"
import { getPhysician } from "@/lib/seed-data"
import { cn, formatDate, getStatusColor } from "@/lib/utils"
import { Pill, Search, AlertTriangle, RefreshCw, CheckCircle2, Clock, X } from "lucide-react"
import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import AIAction from "@/components/ai-action"

interface DoseLog {
  rxId: string
  date: string // YYYY-MM-DD
  status: "taken" | "missed"
  loggedAt: string
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function getStoredLogs(): DoseLog[] {
  try {
    return JSON.parse(localStorage.getItem("openrx_dose_logs") || "[]")
  } catch {
    return []
  }
}

function saveLogs(logs: DoseLog[]): void {
  try {
    localStorage.setItem("openrx_dose_logs", JSON.stringify(logs))
  } catch {}
}

export default function PrescriptionsPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [doseLogs, setDoseLogs] = useState<DoseLog[]>(() => {
    if (typeof window !== "undefined") return getStoredLogs()
    return []
  })

  const myPrescriptions = getMyPrescriptions()
  const today = todayKey()

  const getTodayStatus = useCallback((rxId: string): "taken" | "missed" | null => {
    const log = doseLogs.find((l) => l.rxId === rxId && l.date === today)
    return log?.status ?? null
  }, [doseLogs, today])

  const logDose = useCallback((rxId: string, status: "taken" | "missed") => {
    setDoseLogs((prev) => {
      const filtered = prev.filter((l) => !(l.rxId === rxId && l.date === today))
      const updated = [
        ...filtered,
        { rxId, date: today, status, loggedAt: new Date().toISOString() },
      ]
      saveLogs(updated)
      return updated
    })
  }, [today])

  const clearLog = useCallback((rxId: string) => {
    setDoseLogs((prev) => {
      const updated = prev.filter((l) => !(l.rxId === rxId && l.date === today))
      saveLogs(updated)
      return updated
    })
  }, [today])

  // Derived adherence — boosts % if taken today, reduces if missed
  const getEffectiveAdherence = useCallback((rxId: string, base: number): number => {
    const log = doseLogs.find((l) => l.rxId === rxId && l.date === today)
    if (!log) return base
    if (log.status === "taken") return Math.min(100, base + 2)
    if (log.status === "missed") return Math.max(0, base - 5)
    return base
  }, [doseLogs, today])

  const statuses = useMemo(
    () => Array.from(new Set(myPrescriptions.map((p) => p.status))),
    [myPrescriptions]
  )

  const filtered = useMemo(() => {
    return myPrescriptions.filter((rx) => {
      const matchesSearch =
        !search ||
        rx.medication_name.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = !statusFilter || rx.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [search, statusFilter, myPrescriptions])

  const activeRxs = myPrescriptions.filter((p) => p.status === "active")
  const takenToday = doseLogs.filter((l) => l.date === today && l.status === "taken").length
  const lowAdherenceCount = myPrescriptions.filter(
    (p) => p.status === "active" && p.adherence_pct < 80
  ).length
  const pendingRefills = myPrescriptions.filter(
    (p) => p.status === "pending-refill"
  ).length

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-warm-800">My Medications</h1>
          <p className="text-sm text-warm-500 mt-1">
            {myPrescriptions.length} prescriptions &middot;{" "}
            <span className="text-soft-red font-medium">{lowAdherenceCount} low adherence</span>
            {" "}&middot;{" "}
            <span className="text-yellow-600 font-medium">{pendingRefills} pending refills</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/pharmacy"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-warm-600 border border-sand hover:border-terra/30 hover:text-terra transition"
          >
            Find Pharmacy
          </Link>
          <AIAction
            agentId="rx"
            label="Check My Adherence"
            prompt="Review my medication adherence for all active prescriptions. For any below 80%, give me tips to stay on track."
            context={`Low adherence: ${lowAdherenceCount} medications, Pending refills: ${pendingRefills}`}
          />
          <AIAction
            agentId="rx"
            label="Refill Reminders"
            prompt="Check which of my prescriptions need refills within the next 7 days and remind me."
            variant="inline"
          />
        </div>
      </div>

      {/* Today's dose tracker */}
      {activeRxs.length > 0 && (
        <div className="bg-pampas rounded-2xl border border-sand p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-warm-800 flex items-center gap-2">
                <Clock size={14} className="text-terra" />
                Today&apos;s Doses
              </h2>
              <p className="text-xs text-warm-500 mt-0.5">
                {takenToday} of {activeRxs.length} taken today
              </p>
            </div>
            <div className="flex gap-1">
              {activeRxs.map((rx) => {
                const s = getTodayStatus(rx.id)
                return (
                  <div
                    key={rx.id}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      s === "taken" ? "bg-accent" : s === "missed" ? "bg-soft-red" : "bg-sand"
                    )}
                    title={rx.medication_name}
                  />
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            {activeRxs.map((rx) => {
              const s = getTodayStatus(rx.id)
              return (
                <div
                  key={rx.id}
                  className="flex items-center justify-between py-2 px-3 rounded-xl bg-cream/50"
                >
                  <div>
                    <span className="text-xs font-semibold text-warm-700">{rx.medication_name}</span>
                    <span className="text-[10px] text-cloudy ml-2">{rx.dosage} · {rx.frequency}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {s ? (
                      <>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          s === "taken" ? "bg-accent/10 text-accent" : "bg-soft-red/10 text-soft-red"
                        )}>
                          {s === "taken" ? "✓ Taken" : "✗ Missed"}
                        </span>
                        <button
                          onClick={() => clearLog(rx.id)}
                          className="p-1 rounded-lg text-cloudy hover:text-warm-500 hover:bg-sand/30 transition"
                          title="Clear"
                        >
                          <X size={10} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => logDose(rx.id, "taken")}
                          className="px-3 py-1 text-[10px] font-bold bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition"
                        >
                          Taken
                        </button>
                        <button
                          onClick={() => logDose(rx.id, "missed")}
                          className="px-3 py-1 text-[10px] font-bold bg-soft-red/10 text-soft-red rounded-lg hover:bg-soft-red/20 transition"
                        >
                          Missed
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cloudy" />
          <input
            type="text"
            placeholder="Search medication..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sand bg-pampas text-sm text-warm-800 placeholder:text-cloudy focus:outline-none focus:border-terra/40 focus:ring-1 focus:ring-terra/20 transition"
          />
        </div>
        <div className="flex bg-pampas border border-sand rounded-xl overflow-hidden">
          <button
            onClick={() => setStatusFilter("")}
            className={cn(
              "px-3 py-2 text-xs font-semibold transition-all",
              !statusFilter ? "bg-terra text-white" : "text-warm-600 hover:bg-sand/30"
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
                statusFilter === s ? "bg-terra text-white" : "text-warm-600 hover:bg-sand/30"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="bg-pampas rounded-2xl border border-sand divide-y divide-sand/50">
        {filtered.map((rx) => {
          const physician = getPhysician(rx.physician_id)
          const isLowAdherence = rx.status === "active" && rx.adherence_pct < 80
          const effectiveAdherence = getEffectiveAdherence(rx.id, rx.adherence_pct)
          const todayStatus = getTodayStatus(rx.id)

          return (
            <div
              key={rx.id}
              className={cn(
                "flex items-center gap-4 px-5 py-4 hover:bg-sand/20 transition",
                isLowAdherence && "border-l-2 border-l-soft-red"
              )}
            >
              {/* Icon */}
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                todayStatus === "taken" ? "bg-accent/10" :
                isLowAdherence ? "bg-soft-red/10" :
                rx.status === "pending-refill" ? "bg-yellow-900/20" :
                rx.status === "completed" ? "bg-sand/40" :
                "bg-accent/5"
              )}>
                {todayStatus === "taken" ? (
                  <CheckCircle2 size={16} className="text-accent" />
                ) : isLowAdherence ? (
                  <AlertTriangle size={16} className="text-soft-red" />
                ) : rx.status === "pending-refill" ? (
                  <RefreshCw size={16} className="text-yellow-600" />
                ) : (
                  <Pill size={16} className={rx.status === "completed" ? "text-gray-400" : "text-accent"} />
                )}
              </div>

              {/* Main */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-warm-800">{rx.medication_name}</span>
                  <span className="text-xs text-warm-600">{rx.dosage}</span>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                    getStatusColor(rx.status)
                  )}>
                    {rx.status}
                  </span>
                  {todayStatus === "taken" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                      ✓ taken today
                    </span>
                  )}
                  {todayStatus === "missed" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-soft-red/10 text-soft-red">
                      missed today
                    </span>
                  )}
                </div>
                <p className="text-xs text-warm-500 mt-0.5">
                  {rx.frequency} &middot; Prescribed by {physician?.full_name}
                </p>
                {rx.notes && (
                  <p className="text-[10px] text-cloudy mt-0.5 italic">{rx.notes}</p>
                )}
              </div>

              {/* Adherence */}
              <div className="w-24 shrink-0 text-center">
                <div className={cn(
                  "text-lg font-bold transition-all",
                  effectiveAdherence >= 90 ? "text-accent" :
                  effectiveAdherence >= 80 ? "text-warm-700" : "text-soft-red"
                )}>
                  {effectiveAdherence}%
                </div>
                <div className="text-[10px] text-cloudy">adherence</div>
                <div className="w-full h-1.5 bg-sand/40 rounded-full mt-1 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      effectiveAdherence >= 90 ? "bg-accent" :
                      effectiveAdherence >= 80 ? "bg-yellow-400" : "bg-soft-red"
                    )}
                    style={{ width: `${effectiveAdherence}%` }}
                  />
                </div>
              </div>

              {/* Meta + quick log */}
              <div className="text-right shrink-0 space-y-1">
                <div className="text-xs text-warm-500">{rx.refills_remaining} refills left</div>
                <div className="text-[10px] text-cloudy">Last filled {formatDate(rx.last_filled)}</div>
                <div className="text-[10px] text-cloudy">{rx.pharmacy}</div>
                {rx.status === "active" && !todayStatus && (
                  <div className="flex justify-end gap-1 mt-1.5">
                    <button
                      onClick={() => logDose(rx.id, "taken")}
                      className="px-2 py-0.5 text-[9px] font-bold bg-accent/10 text-accent rounded-md hover:bg-accent/20 transition"
                    >
                      Taken
                    </button>
                    <button
                      onClick={() => logDose(rx.id, "missed")}
                      className="px-2 py-0.5 text-[9px] font-bold bg-soft-red/10 text-soft-red rounded-md hover:bg-soft-red/20 transition"
                    >
                      Missed
                    </button>
                  </div>
                )}
                {(isLowAdherence || rx.status === "pending-refill") && (
                  <AIAction
                    agentId="rx"
                    label={isLowAdherence ? "Get Tips" : "Request Refill"}
                    prompt={isLowAdherence
                      ? `I have ${rx.adherence_pct}% adherence for ${rx.medication_name}. Give me tips and reminders to help me stay on track.`
                      : `Help me request a refill for ${rx.medication_name} ${rx.dosage} at ${rx.pharmacy}.`}
                    context={`Medication: ${rx.medication_name} ${rx.dosage}, Adherence: ${rx.adherence_pct}%`}
                    variant="compact"
                    className="mt-1.5 justify-end"
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
