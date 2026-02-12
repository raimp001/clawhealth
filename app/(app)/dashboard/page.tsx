"use client"

import {
  Calendar,
  Receipt,
  Users,
  ShieldCheck,
  Pill,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  XCircle,
  ArrowRight,
  Bot,
  Zap,
  Send,
  Bell,
  CheckCircle2,
  Clock,
} from "lucide-react"
import Link from "next/link"
import {
  getDashboardMetrics,
  getTodayAppointments,
  getPatient,
  getPhysician,
  claims,
  prescriptions,
  priorAuths,
} from "@/lib/seed-data"
import { cn, formatCurrency, formatTime, getStatusColor } from "@/lib/utils"

export default function DashboardPage() {
  const metrics = getDashboardMetrics()
  const todayApts = getTodayAppointments()
  const deniedClaims = claims.filter((c) => c.status === "denied")
  const urgentPA = priorAuths.filter(
    (p) => p.status === "pending" || p.status === "submitted"
  )
  const lowAdherenceRx = prescriptions.filter(
    (p) => p.status === "active" && p.adherence_pct < 80
  )

  const metricCards = [
    {
      label: "Today's Appointments",
      value: metrics.todayAppointments,
      sub: `${metrics.completedToday} completed`,
      icon: Calendar,
      color: "text-terra",
      bg: "bg-terra/5",
      href: "/scheduling",
    },
    {
      label: "Total Patients",
      value: metrics.totalPatients,
      sub: "Active in system",
      icon: Users,
      color: "text-accent",
      bg: "bg-accent/5",
      href: "/patients",
    },
    {
      label: "Pending Claims",
      value: metrics.pendingClaims,
      sub: `${metrics.deniedClaims} denied`,
      icon: Receipt,
      color: "text-soft-blue",
      bg: "bg-soft-blue/5",
      href: "/billing",
    },
    {
      label: "Revenue (Paid)",
      value: formatCurrency(metrics.totalRevenue),
      sub: "This period",
      icon: TrendingUp,
      color: "text-accent",
      bg: "bg-accent/5",
      href: "/billing",
    },
    {
      label: "Prior Auth Queue",
      value: metrics.pendingPA,
      sub: "Pending review",
      icon: ShieldCheck,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      href: "/prior-auth",
    },
    {
      label: "Unread Messages",
      value: metrics.unreadMessages,
      sub: `${metrics.lowAdherence} low-adherence alerts`,
      icon: MessageSquare,
      color: "text-soft-red",
      bg: "bg-soft-red/5",
      href: "/messages",
    },
  ]

  return (
    <div className="animate-slide-up space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif text-warm-800">
          Good{" "}
          {new Date().getHours() < 12
            ? "morning"
            : new Date().getHours() < 17
            ? "afternoon"
            : "evening"}
          , Dr. Silbermann
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map((m, i) => (
          <Link
            key={i}
            href={m.href}
            className="bg-white rounded-2xl p-5 border border-sand hover:border-terra/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-terra/5 transition-all group"
          >
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                m.bg
              )}
            >
              <m.icon size={18} className={m.color} />
            </div>
            <div className="text-2xl font-bold text-warm-800 font-sans">
              {m.value}
            </div>
            <div className="text-xs font-semibold text-warm-700 mt-1">
              {m.label}
            </div>
            <div className="text-[10px] text-cloudy mt-0.5">{m.sub}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-sand">
          <div className="flex items-center justify-between p-5 border-b border-sand">
            <h2 className="text-lg font-serif text-warm-800">
              Today&apos;s Schedule
            </h2>
            <Link
              href="/scheduling"
              className="text-xs font-semibold text-terra flex items-center gap-1 hover:gap-2 transition-all"
            >
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-sand/50">
            {todayApts.map((apt) => {
              const patient = getPatient(apt.patient_id)
              const physician = getPhysician(apt.physician_id)
              return (
                <div
                  key={apt.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-cream/50 transition"
                >
                  <div className="text-sm font-semibold text-warm-600 w-16 shrink-0">
                    {formatTime(apt.scheduled_at)}
                  </div>
                  <div
                    className={cn(
                      "w-1.5 h-8 rounded-full shrink-0",
                      apt.status === "completed"
                        ? "bg-accent"
                        : apt.status === "in-progress"
                        ? "bg-terra"
                        : apt.status === "checked-in"
                        ? "bg-yellow-400"
                        : apt.status === "no-show"
                        ? "bg-soft-red"
                        : "bg-sand"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/patients/${apt.patient_id}`}
                        className="text-sm font-semibold text-warm-800 hover:text-terra transition"
                      >
                        {patient?.full_name}
                      </Link>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                          getStatusColor(apt.status)
                        )}
                      >
                        {apt.status}
                      </span>
                    </div>
                    <p className="text-xs text-warm-500 truncate">
                      {apt.reason} &middot; {physician?.full_name} &middot;{" "}
                      {apt.duration_minutes}min
                    </p>
                  </div>
                  <div className="text-xs text-warm-500 shrink-0">
                    {apt.type === "urgent" && (
                      <span className="text-soft-red font-bold">URGENT</span>
                    )}
                    {apt.type === "new-patient" && (
                      <span className="text-accent font-bold">NEW</span>
                    )}
                    {apt.type === "telehealth" && (
                      <span className="text-soft-blue font-bold">TELE</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action Items */}
        <div className="space-y-4">
          {/* Denied Claims */}
          {deniedClaims.length > 0 && (
            <div className="bg-white rounded-2xl border border-sand">
              <div className="flex items-center gap-2 p-4 border-b border-sand">
                <XCircle size={16} className="text-soft-red" />
                <h3 className="text-sm font-bold text-warm-800">
                  Denied Claims ({deniedClaims.length})
                </h3>
              </div>
              <div className="divide-y divide-sand/50">
                {deniedClaims.map((c) => {
                  const patient = getPatient(c.patient_id)
                  return (
                    <Link
                      key={c.id}
                      href="/billing"
                      className="block px-4 py-3 hover:bg-cream/50 transition"
                    >
                      <div className="text-sm font-medium text-warm-800">
                        {patient?.full_name}
                      </div>
                      <div className="text-xs text-warm-500 mt-0.5">
                        {formatCurrency(c.total_amount)} &middot;{" "}
                        {c.claim_number}
                      </div>
                      {c.errors_detected.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-soft-red font-medium">
                          <AlertTriangle size={10} />
                          {c.errors_detected.length} error
                          {c.errors_detected.length > 1 ? "s" : ""} detected
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Pending Prior Auth */}
          {urgentPA.length > 0 && (
            <div className="bg-white rounded-2xl border border-sand">
              <div className="flex items-center gap-2 p-4 border-b border-sand">
                <ShieldCheck size={16} className="text-yellow-600" />
                <h3 className="text-sm font-bold text-warm-800">
                  Pending Prior Auth ({urgentPA.length})
                </h3>
              </div>
              <div className="divide-y divide-sand/50">
                {urgentPA.map((pa) => {
                  const patient = getPatient(pa.patient_id)
                  return (
                    <Link
                      key={pa.id}
                      href="/prior-auth"
                      className="block px-4 py-3 hover:bg-cream/50 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-warm-800">
                          {patient?.full_name}
                        </span>
                        {pa.urgency === "urgent" && (
                          <span className="text-[9px] font-bold text-white bg-soft-red px-1.5 py-0.5 rounded uppercase">
                            Urgent
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-warm-500 mt-0.5">
                        {pa.procedure_name}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Low Adherence */}
          {lowAdherenceRx.length > 0 && (
            <div className="bg-white rounded-2xl border border-sand">
              <div className="flex items-center gap-2 p-4 border-b border-sand">
                <Pill size={16} className="text-terra" />
                <h3 className="text-sm font-bold text-warm-800">
                  Low Adherence Alerts ({lowAdherenceRx.length})
                </h3>
              </div>
              <div className="divide-y divide-sand/50">
                {lowAdherenceRx.map((rx) => {
                  const patient = getPatient(rx.patient_id)
                  return (
                    <Link
                      key={rx.id}
                      href="/prescriptions"
                      className="block px-4 py-3 hover:bg-cream/50 transition"
                    >
                      <div className="text-sm font-medium text-warm-800">
                        {patient?.full_name}
                      </div>
                      <div className="text-xs text-warm-500 mt-0.5">
                        {rx.medication_name} {rx.dosage} &middot;{" "}
                        <span className="text-soft-red font-semibold">
                          {rx.adherence_pct}% adherence
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OpenClaw Agent Activity Feed */}
      <div className="bg-white rounded-2xl border border-sand">
        <div className="flex items-center justify-between p-5 border-b border-sand">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-terra" />
            <h2 className="text-lg font-serif text-warm-800">
              AI Agent Activity
            </h2>
            <span className="text-[10px] font-bold text-terra bg-terra/10 px-2 py-0.5 rounded-full">
              OPENCLAW
            </span>
          </div>
          <Link
            href="/chat"
            className="text-xs font-semibold text-terra flex items-center gap-1 hover:gap-2 transition-all"
          >
            Open Agent <ArrowRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-sand/50">
          {[
            {
              icon: Send,
              color: "text-soft-blue",
              bg: "bg-soft-blue/5",
              action: "Sent appointment reminder",
              detail: "James Thompson — Tomorrow 8:30 AM diabetes review",
              channel: "SMS",
              time: "2 min ago",
              agent: "Scheduling",
            },
            {
              icon: AlertTriangle,
              color: "text-soft-red",
              bg: "bg-soft-red/5",
              action: "Billing error detected",
              detail: "Claim BCB-2026-41882 billed for no-show — flagged for correction",
              channel: "Auto",
              time: "15 min ago",
              agent: "Billing",
            },
            {
              icon: Pill,
              color: "text-yellow-600",
              bg: "bg-yellow-50",
              action: "Low adherence alert",
              detail: "Amanda Liu — Ferrous Sulfate at 65%. Tips sent via SMS.",
              channel: "SMS",
              time: "1 hr ago",
              agent: "Rx Manager",
            },
            {
              icon: ShieldCheck,
              color: "text-terra",
              bg: "bg-terra/5",
              action: "Prior auth submitted",
              detail: "Patricia Williams — PET/CT Scan via Aetna ePA",
              channel: "ePA",
              time: "2 hrs ago",
              agent: "PA Agent",
            },
            {
              icon: CheckCircle2,
              color: "text-accent",
              bg: "bg-accent/5",
              action: "Claim appeal filed",
              detail: "Elena Rodriguez — ER visit $3,400 → expected $840 after correction",
              channel: "Auto",
              time: "3 hrs ago",
              agent: "Billing",
            },
            {
              icon: Calendar,
              color: "text-soft-blue",
              bg: "bg-soft-blue/5",
              action: "No-show rescheduled",
              detail: "Sarah Johnson rebooked to Friday 2:00 PM with Dr. Chen",
              channel: "SMS",
              time: "4 hrs ago",
              agent: "Scheduling",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-3 hover:bg-cream/30 transition"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  item.bg
                )}
              >
                <item.icon size={14} className={item.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-warm-800">
                    {item.action}
                  </span>
                  <span className="text-[9px] font-bold text-terra bg-terra/10 px-1.5 py-0.5 rounded">
                    {item.agent}
                  </span>
                </div>
                <p className="text-[11px] text-warm-500 mt-0.5 truncate">
                  {item.detail}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-cloudy">{item.time}</span>
                <div className="text-[9px] text-warm-500 mt-0.5">
                  via {item.channel}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
