"use client"

import { claims, getPatient } from "@/lib/seed-data"
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils"
import {
  Receipt,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  XCircle,
  CheckCircle2,
  Clock,
  Filter,
} from "lucide-react"
import Link from "next/link"
import { useState, useMemo } from "react"

export default function BillingPage() {
  const [statusFilter, setStatusFilter] = useState("")

  const stats = useMemo(() => {
    const totalBilled = claims.reduce((s, c) => s + c.total_amount, 0)
    const totalPaid = claims
      .filter((c) => c.status === "paid" || c.status === "approved")
      .reduce((s, c) => s + c.insurance_paid + c.patient_responsibility, 0)
    const totalDenied = claims
      .filter((c) => c.status === "denied")
      .reduce((s, c) => s + c.total_amount, 0)
    const totalPending = claims
      .filter((c) => ["submitted", "processing"].includes(c.status))
      .reduce((s, c) => s + c.total_amount, 0)

    return { totalBilled, totalPaid, totalDenied, totalPending }
  }, [])

  const statCards = [
    {
      label: "Total Billed",
      value: formatCurrency(stats.totalBilled),
      icon: Receipt,
      color: "text-warm-800",
      bg: "bg-sand/30",
    },
    {
      label: "Collected",
      value: formatCurrency(stats.totalPaid),
      icon: CheckCircle2,
      color: "text-accent",
      bg: "bg-accent/5",
    },
    {
      label: "Pending",
      value: formatCurrency(stats.totalPending),
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      label: "Denied",
      value: formatCurrency(stats.totalDenied),
      icon: XCircle,
      color: "text-soft-red",
      bg: "bg-soft-red/5",
    },
  ]

  const filtered = useMemo(() => {
    if (!statusFilter) return claims
    return claims.filter((c) => c.status === statusFilter)
  }, [statusFilter])

  const statuses = useMemo(
    () => Array.from(new Set(claims.map((c) => c.status))),
    []
  )

  return (
    <div className="animate-slide-up space-y-6">
      <div>
        <h1 className="text-2xl font-serif text-warm-800">Billing & Claims</h1>
        <p className="text-sm text-warm-500 mt-1">
          {claims.length} total claims &middot;{" "}
          {claims.filter((c) => c.errors_detected.length > 0).length} with
          errors
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-sand p-5"
          >
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                s.bg
              )}
            >
              <s.icon size={18} className={s.color} />
            </div>
            <div className="text-2xl font-bold text-warm-800">{s.value}</div>
            <div className="text-xs font-semibold text-warm-500 mt-1">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter size={14} className="text-cloudy" />
        <div className="flex bg-white border border-sand rounded-xl overflow-hidden">
          <button
            onClick={() => setStatusFilter("")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold transition-all",
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
                "px-3 py-1.5 text-xs font-semibold transition-all capitalize",
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

      {/* Claims Table */}
      <div className="bg-white rounded-2xl border border-sand overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 bg-cream/50 border-b border-sand text-[10px] font-bold text-warm-500 uppercase tracking-wider">
          <span>Patient / Claim</span>
          <span className="w-20 text-right">Amount</span>
          <span className="w-20 text-right">Ins. Paid</span>
          <span className="w-20 text-right">Patient</span>
          <span className="w-24 text-center">Status</span>
          <span className="w-24 text-right">Date</span>
        </div>
        <div className="divide-y divide-sand/50">
          {filtered.map((claim) => {
            const patient = getPatient(claim.patient_id)
            return (
              <div
                key={claim.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3.5 hover:bg-cream/30 transition items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-warm-800 truncate">
                      {patient?.full_name}
                    </span>
                    {claim.errors_detected.length > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-soft-red">
                        <AlertTriangle size={10} />
                        {claim.errors_detected.length}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-cloudy mt-0.5 truncate">
                    {claim.claim_number} &middot; CPT:{" "}
                    {claim.cpt_codes.join(", ")} &middot; ICD:{" "}
                    {claim.icd_codes.join(", ")}
                  </div>
                  {claim.denial_reason && (
                    <div className="text-[10px] text-soft-red mt-0.5 truncate">
                      {claim.denial_reason}
                    </div>
                  )}
                </div>
                <span className="w-20 text-right text-sm font-semibold text-warm-800">
                  {formatCurrency(claim.total_amount)}
                </span>
                <span className="w-20 text-right text-sm text-warm-600">
                  {formatCurrency(claim.insurance_paid)}
                </span>
                <span className="w-20 text-right text-sm text-warm-600">
                  {formatCurrency(claim.patient_responsibility)}
                </span>
                <span className="w-24 text-center">
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide inline-block",
                      getStatusColor(claim.status)
                    )}
                  >
                    {claim.status}
                  </span>
                </span>
                <span className="w-24 text-right text-xs text-warm-500">
                  {formatDate(claim.date_of_service)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
