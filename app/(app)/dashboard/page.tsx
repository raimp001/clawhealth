"use client"

import {
  Calendar,
  Receipt,
  Pill,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  Bot,
  Send,
  CheckCircle2,
  Heart,
} from "lucide-react"
import Link from "next/link"
import { getPhysician, priorAuths } from "@/lib/seed-data"
import { currentUser, getMyAppointments, getMyClaims, getMyPrescriptions, getMyMessages } from "@/lib/current-user"
import { cn, formatCurrency, formatTime, getStatusColor } from "@/lib/utils"

export default function DashboardPage() {
  const myApts = getMyAppointments().sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  )
  const upcomingApts = myApts.filter(
    (a) => new Date(a.scheduled_at) >= new Date() && a.status !== "completed" && a.status !== "no-show"
  )
  const myRx = getMyPrescriptions().filter((p) => p.status === "active")
  const myClaims = getMyClaims()
  const myMessages = getMyMessages()
  const unreadCount = myMessages.filter((m) => !m.read).length
  const lowAdherenceRx = myRx.filter((p) => p.adherence_pct < 80)
  const myPA = priorAuths.filter((p) => p.patient_id === currentUser.id)
  const pendingPA = myPA.filter((p) => p.status === "pending" || p.status === "submitted")
  const owedAmount = myClaims
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + c.patient_responsibility, 0)

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
          , {currentUser.full_name.split(" ")[0]}
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          Here&apos;s what&apos;s happening with your health.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          href="/scheduling"
          className="bg-pampas rounded-2xl p-4 border border-sand hover:border-terra/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-terra/5 transition-all"
        >
          <Calendar size={20} className="text-terra mb-2" />
          <div className="text-lg font-bold text-warm-800">{upcomingApts.length}</div>
          <div className="text-xs text-warm-500">Upcoming Visits</div>
        </Link>
        <Link
          href="/prescriptions"
          className="bg-pampas rounded-2xl p-4 border border-sand hover:border-terra/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-terra/5 transition-all"
        >
          <Pill size={20} className="text-accent mb-2" />
          <div className="text-lg font-bold text-warm-800">{myRx.length}</div>
          <div className="text-xs text-warm-500">Active Medications</div>
        </Link>
        <Link
          href="/billing"
          className="bg-pampas rounded-2xl p-4 border border-sand hover:border-terra/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-terra/5 transition-all"
        >
          <Receipt size={20} className="text-soft-blue mb-2" />
          <div className="text-lg font-bold text-warm-800">
            {owedAmount > 0 ? formatCurrency(owedAmount) : "$0"}
          </div>
          <div className="text-xs text-warm-500">Amount Owed</div>
        </Link>
        <Link
          href="/messages"
          className="bg-pampas rounded-2xl p-4 border border-sand hover:border-terra/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-terra/5 transition-all"
        >
          <MessageSquare size={20} className="text-yellow-400 mb-2" />
          <div className="text-lg font-bold text-warm-800">{unreadCount}</div>
          <div className="text-xs text-warm-500">Unread Messages</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Upcoming Appointments */}
        <div className="lg:col-span-2 bg-pampas rounded-2xl border border-sand">
          <div className="flex items-center justify-between p-5 border-b border-sand">
            <h2 className="text-base font-serif text-warm-800">My Upcoming Visits</h2>
            <Link
              href="/scheduling"
              className="text-xs font-semibold text-terra flex items-center gap-1 hover:gap-2 transition-all"
            >
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-sand/50">
            {upcomingApts.length === 0 && (
              <div className="p-8 text-center">
                <Calendar size={24} className="text-sand mx-auto mb-2" />
                <p className="text-sm text-warm-500">No upcoming appointments</p>
                <Link href="/providers" className="text-xs text-terra font-semibold mt-1 inline-block">
                  Find a doctor →
                </Link>
              </div>
            )}
            {upcomingApts.slice(0, 5).map((apt) => {
              const physician = getPhysician(apt.physician_id)
              return (
                <div
                  key={apt.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-sand/30 transition"
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
                      {apt.reason}
                      {apt.copay > 0 ? ` · Est. copay $${apt.copay}` : " · $0 copay"}
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
          <div className="bg-pampas rounded-2xl border border-sand">
            <div className="flex items-center gap-2 p-4 border-b border-sand">
              <Pill size={16} className="text-accent" />
              <h3 className="text-sm font-bold text-warm-800">My Medications</h3>
            </div>
            <div className="divide-y divide-sand/50">
              {myRx.length === 0 && (
                <div className="p-6 text-center text-xs text-warm-500">No active medications</div>
              )}
              {myRx.map((rx) => (
                <div key={rx.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-warm-800">
                      {rx.medication_name} {rx.dosage}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold",
                        rx.adherence_pct >= 90 ? "text-accent" : rx.adherence_pct >= 80 ? "text-warm-600" : "text-soft-red"
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
              className="block text-center py-2.5 border-t border-sand text-xs font-semibold text-terra hover:bg-sand/30 transition"
            >
              View all →
            </Link>
          </div>

          {/* Alerts */}
          {lowAdherenceRx.length > 0 && (
            <div className="bg-soft-red/5 rounded-2xl border border-soft-red/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-soft-red" />
                <span className="text-xs font-bold text-soft-red">Medication Alert</span>
              </div>
              {lowAdherenceRx.map((rx) => (
                <p key={rx.id} className="text-xs text-warm-600 mt-1">
                  Your {rx.medication_name} adherence is at {rx.adherence_pct}% — try setting a daily reminder.
                </p>
              ))}
            </div>
          )}

          {/* Pending Prior Auths */}
          {pendingPA.length > 0 && (
            <div className="bg-yellow-900/20 rounded-2xl border border-yellow-700/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={14} className="text-yellow-400" />
                <span className="text-xs font-bold text-yellow-400">Pending Approvals</span>
              </div>
              {pendingPA.map((pa) => (
                <p key={pa.id} className="text-xs text-warm-600 mt-1">
                  {pa.procedure_name} — waiting on {pa.insurance_provider}
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
              Ask your AI care team about appointments, medications, bills, or anything health-related.
            </p>
          </Link>
        </div>
      </div>

      {/* AI Care Team Activity */}
      <div className="bg-pampas rounded-2xl border border-sand">
        <div className="flex items-center justify-between p-4 border-b border-sand">
          <div className="flex items-center gap-2">
            <Bot size={14} className="text-terra" />
            <h3 className="text-sm font-bold text-warm-800">Your AI Care Team</h3>
          </div>
          <Link href="/chat" className="text-xs font-semibold text-terra flex items-center gap-1 hover:gap-2 transition-all">
            Talk to them <ArrowRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-sand/50">
          {[
            { icon: Send, color: "text-soft-blue", bg: "bg-soft-blue/5", action: "Appointment reminder sent", detail: "Your diabetes check is coming up", agent: "Cal", time: "2 min ago" },
            { icon: Pill, color: "text-yellow-400", bg: "bg-yellow-900/20", action: "Refill checked", detail: "Atorvastatin refill needed soon — 2 refills remaining", agent: "Maya", time: "1 hr ago" },
            { icon: CheckCircle2, color: "text-accent", bg: "bg-accent/5", action: "Bill reviewed", detail: "Your latest claim was paid correctly — no action needed", agent: "Vera", time: "3 hrs ago" },
            { icon: Heart, color: "text-terra", bg: "bg-terra/5", action: "Screening reminder", detail: "Your cholesterol check is due — want me to book it?", agent: "Ivy", time: "Yesterday" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-sand/20 transition">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", item.bg)}>
                <item.icon size={14} className={item.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-warm-800">{item.action}</span>
                  <span className="text-[9px] font-bold text-terra bg-terra/10 px-1.5 py-0.5 rounded">{item.agent}</span>
                </div>
                <p className="text-[11px] text-warm-500 mt-0.5 truncate">{item.detail}</p>
              </div>
              <span className="text-[10px] text-cloudy shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
