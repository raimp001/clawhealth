"use client"

import {
  Calendar,
  Receipt,
  Pill,
  ShieldCheck,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  Bot,
  Zap,
  Send,
  Bell,
  CheckCircle2,
  Clock,
  Heart,
  Stethoscope,
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
  patients,
} from "@/lib/seed-data"
import { cn, formatCurrency, formatTime, getStatusColor } from "@/lib/utils"
import RevenueChart from "@/components/dashboard/revenue-chart"

export default function DashboardPage() {
  const metrics = getDashboardMetrics()
  const todayApts = getTodayAppointments()
  // Simulate "my" data — first patient in seed data
  const me = patients[0]
  const myRx = prescriptions.filter((p) => p.patient_id === me.id && p.status === "active")
  const myClaims = claims.filter((c) => c.patient_id === me.id)
  const myUnpaid = myClaims.filter((c) => c.patient_responsibility > 0 && c.status === "paid")
  const lowAdherenceRx = myRx.filter((p) => p.adherence_pct < 80)

  return (
    <div className="animate-slide-up space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-serif text-warm-800">
          Good{" "}
          {new Date().getHours() < 12
            ? "morning"
            : new Date().getHours() < 17
            ? "afternoon"
            : "evening"}
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          Here&apos;s what&apos;s happening with your health today.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          href="/scheduling"
          className="bg-white rounded-2xl p-4 border border-sand hover:border-terra/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-terra/5 transition-all group"
        >
          <Calendar size={20} className="text-terra mb-2" />
          <div className="text-lg font-bold text-warm-800">{todayApts.length}</div>
          <div className="text-xs text-warm-500">Upcoming Appointments</div>
        </Link>
        <Link
          href="/prescriptions"
          className="bg-white rounded-2xl p-4 border border-sand hover:border-terra/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-terra/5 transition-all group"
        >
          <Pill size={20} className="text-accent mb-2" />
          <div className="text-lg font-bold text-warm-800">{myRx.length}</div>
          <div className="text-xs text-warm-500">Active Medications</div>
        </Link>
        <Link
          href="/billing"
          className="bg-white rounded-2xl p-4 border border-sand hover:border-terra/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-terra/5 transition-all group"
        >
          <Receipt size={20} className="text-soft-blue mb-2" />
          <div className="text-lg font-bold text-warm-800">{myClaims.length}</div>
          <div className="text-xs text-warm-500">Recent Claims</div>
        </Link>
        <Link
          href="/messages"
          className="bg-white rounded-2xl p-4 border border-sand hover:border-terra/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-terra/5 transition-all group"
        >
          <MessageSquare size={20} className="text-yellow-600 mb-2" />
          <div className="text-lg font-bold text-warm-800">{metrics.unreadMessages}</div>
          <div className="text-xs text-warm-500">Unread Messages</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Appointments */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-sand">
          <div className="flex items-center justify-between p-5 border-b border-sand">
            <h2 className="text-base font-serif text-warm-800">
              My Appointments
            </h2>
            <Link
              href="/scheduling"
              className="text-xs font-semibold text-terra flex items-center gap-1 hover:gap-2 transition-all"
            >
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-sand/50">
            {todayApts.length === 0 && (
              <div className="p-8 text-center">
                <Calendar size={24} className="text-sand mx-auto mb-2" />
                <p className="text-sm text-warm-500">No appointments today</p>
                <Link href="/scheduling" className="text-xs text-terra font-semibold mt-1 inline-block">
                  Book one →
                </Link>
              </div>
            )}
            {todayApts.map((apt) => {
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
                        : "bg-sand"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-warm-800">
                        {physician?.full_name}
                      </span>
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
                      {apt.reason} &middot; {apt.duration_minutes}min
                      {apt.copay > 0 && ` · Est. copay $${apt.copay}`}
                    </p>
                  </div>
                  {apt.type === "telehealth" && (
                    <span className="text-[10px] font-bold text-soft-blue">VIRTUAL</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* My Medications */}
          <div className="bg-white rounded-2xl border border-sand">
            <div className="flex items-center gap-2 p-4 border-b border-sand">
              <Pill size={16} className="text-accent" />
              <h3 className="text-sm font-bold text-warm-800">
                My Medications ({myRx.length})
              </h3>
            </div>
            <div className="divide-y divide-sand/50">
              {myRx.slice(0, 4).map((rx) => (
                <div key={rx.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-warm-800">
                      {rx.medication_name} {rx.dosage}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold",
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
                  <p className="text-[10px] text-cloudy">{rx.frequency}</p>
                </div>
              ))}
            </div>
            <Link
              href="/prescriptions"
              className="block text-center py-2.5 border-t border-sand text-xs font-semibold text-terra hover:bg-cream/50 transition"
            >
              View all medications →
            </Link>
          </div>

          {/* Alerts */}
          {lowAdherenceRx.length > 0 && (
            <div className="bg-soft-red/5 rounded-2xl border border-soft-red/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-soft-red" />
                <span className="text-xs font-bold text-soft-red">Adherence Alert</span>
              </div>
              {lowAdherenceRx.map((rx) => (
                <p key={rx.id} className="text-xs text-warm-600 mt-1">
                  {rx.medication_name} — {rx.adherence_pct}% adherence
                </p>
              ))}
            </div>
          )}

          {/* Ask AI */}
          <Link
            href="/chat"
            className="block bg-terra/5 rounded-2xl border border-terra/10 p-4 hover:bg-terra/10 transition"
          >
            <div className="flex items-center gap-2 mb-1">
              <Bot size={16} className="text-terra" />
              <span className="text-sm font-bold text-warm-800">Need help?</span>
            </div>
            <p className="text-xs text-warm-500">
              Ask our AI team about appointments, medications, bills, or anything health-related.
            </p>
          </Link>
        </div>
      </div>

      {/* AI Agent Activity */}
      <div className="bg-white rounded-2xl border border-sand">
        <div className="flex items-center justify-between p-4 border-b border-sand">
          <div className="flex items-center gap-2">
            <Bot size={14} className="text-terra" />
            <h3 className="text-sm font-bold text-warm-800">Your AI Care Team</h3>
          </div>
          <Link
            href="/chat"
            className="text-xs font-semibold text-terra flex items-center gap-1 hover:gap-2 transition-all"
          >
            Talk to them <ArrowRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-sand/50">
          {[
            {
              icon: Send,
              color: "text-soft-blue",
              bg: "bg-soft-blue/5",
              action: "Appointment reminder sent",
              detail: "Tomorrow 8:30 AM — diabetes management review",
              agent: "Cal",
              time: "2 min ago",
            },
            {
              icon: Pill,
              color: "text-yellow-600",
              bg: "bg-yellow-50",
              action: "Refill processed",
              detail: "Atorvastatin 40mg — ready at Walgreens on 39th",
              agent: "Maya",
              time: "1 hr ago",
            },
            {
              icon: CheckCircle2,
              color: "text-accent",
              bg: "bg-accent/5",
              action: "Bill reviewed",
              detail: "Claim BCB-2026-44201 paid correctly — no action needed",
              agent: "Vera",
              time: "3 hrs ago",
            },
            {
              icon: Heart,
              color: "text-terra",
              bg: "bg-terra/5",
              action: "Screening reminder",
              detail: "Cholesterol check due — shall I book it?",
              agent: "Ivy",
              time: "Yesterday",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 hover:bg-cream/30 transition"
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
              <span className="text-[10px] text-cloudy shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
