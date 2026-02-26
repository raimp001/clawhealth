"use client"

import {
  Calendar, Pill, MessageSquare, AlertTriangle, Receipt,
  ArrowRight, Bot, Send, CheckCircle2, Heart, ShieldCheck,
  FlaskConical, Activity, Syringe, ArrowRightCircle,
  AlertCircle, Search,
} from "lucide-react"
import Link from "next/link"
import { cn, formatTime, formatDate, getStatusColor } from "@/lib/utils"
import PlatformReadiness from "@/components/platform-readiness"
import { useLiveSnapshot } from "@/lib/hooks/use-live-snapshot"

export default function DashboardPage() {
  const { snapshot, getPhysician } = useLiveSnapshot()
  const patientName = snapshot.patient?.full_name || "there"
  const patientId = snapshot.patient?.id || ""

  const myApts = [...snapshot.appointments].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  )
  const upcomingApts = myApts.filter(
    (a) => new Date(a.scheduled_at) >= new Date() && a.status !== "completed" && a.status !== "no-show"
  )
  const myRx = snapshot.prescriptions.filter((p) => p.status === "active")
  const myMessages = snapshot.messages
  const unreadCount = myMessages.filter((m) => !m.read).length
  const lowAdherenceRx = myRx.filter((p) => p.adherence_pct < 80)
  const myPA = snapshot.priorAuths.filter((p) => p.patient_id === patientId)
  const pendingPA = myPA.filter((p) => p.status === "pending" || p.status === "submitted")
  // New healthcare data
  const myLabs = snapshot.labResults
  const resultedLabs = myLabs.filter((l) => l.status !== "pending")
  const pendingLabs = myLabs.filter((l) => l.status === "pending")
  const abnormalLabCount = resultedLabs
    .reduce((count, lab) => count + lab.results.filter((r) => r.flag !== "normal").length, 0)
  const myVitals = snapshot.vitals
  const latestVital = myVitals[0]
  const myVaccinations = snapshot.vaccinations
  const dueVaccines = myVaccinations.filter((v) => v.status === "due" || v.status === "overdue")
  const myReferrals = snapshot.referrals
  const pendingReferrals = myReferrals.filter((r) => r.status === "pending" || r.status === "scheduled")

  // Health engagement score (0-100) based on adherence, lab alerts, pending items
  const avgAdherence = myRx.length > 0
    ? Math.round(myRx.reduce((s, rx) => s + rx.adherence_pct, 0) / myRx.length)
    : 100
  const deductions = (abnormalLabCount * 5) + (dueVaccines.filter(v => v.status === "overdue").length * 8) + (lowAdherenceRx.length * 10)
  const healthScore = Math.max(0, Math.min(100, avgAdherence - deductions))
  const healthScoreLabel = healthScore >= 80 ? "Good" : healthScore >= 60 ? "Fair" : "Needs Attention"
  const healthScoreColor = healthScore >= 80 ? "text-accent" : healthScore >= 60 ? "text-yellow-600" : "text-soft-red"
  const healthScoreBg = healthScore >= 80 ? "bg-accent" : healthScore >= 60 ? "bg-yellow-400" : "bg-soft-red"

  function formatActivityTime(value: string): string {
    const then = new Date(value).getTime()
    if (!Number.isFinite(then)) return ""
    const diff = Date.now() - then
    if (diff < 0) return "Upcoming"
    if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.round(diff / (60 * 1000)))} min ago`
    if (diff < 24 * 60 * 60 * 1000) return `${Math.max(1, Math.round(diff / (60 * 60 * 1000)))} hr ago`
    return new Date(value).toLocaleDateString()
  }

  const careTeamActivity = [
    ...resultedLabs.slice(0, 1).map((lab) => ({
      icon: FlaskConical,
      color: "text-soft-blue",
      bg: "bg-soft-blue/5",
      action: "Lab result posted",
      detail: `${lab.test_name} is available for review`,
      source: "Labs",
      time: formatActivityTime(lab.resulted_at || lab.ordered_at),
    })),
    ...upcomingApts.slice(0, 1).map((appointment) => ({
      icon: Send,
      color: "text-soft-blue",
      bg: "bg-soft-blue/5",
      action: "Upcoming appointment",
      detail: `${appointment.reason || "Consultation"} on ${formatDate(appointment.scheduled_at)} at ${formatTime(appointment.scheduled_at)}`,
      source: "Scheduling",
      time: formatActivityTime(appointment.scheduled_at),
    })),
    ...lowAdherenceRx.slice(0, 1).map((rx) => ({
      icon: Pill,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      action: "Adherence follow-up",
      detail: `${rx.medication_name} adherence is ${rx.adherence_pct}%`,
      source: "Medication",
      time: formatActivityTime(rx.last_filled),
    })),
    ...snapshot.claims.filter((claim) => claim.status === "denied").slice(0, 1).map((claim) => ({
      icon: CheckCircle2,
      color: "text-terra",
      bg: "bg-terra/10",
      action: "Claim needs review",
      detail: `${claim.claim_number} was denied${claim.denial_reason ? ` (${claim.denial_reason})` : ""}`,
      source: "Billing",
      time: formatActivityTime(claim.submitted_at),
    })),
    ...dueVaccines.slice(0, 1).map((vaccine) => ({
      icon: Syringe,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      action: "Vaccination due",
      detail: `${vaccine.vaccine_name} is marked as ${vaccine.status}`,
      source: "Preventive",
      time: vaccine.next_due ? formatActivityTime(vaccine.next_due) : "Due",
    })),
    ...pendingReferrals.slice(0, 1).map((referral) => ({
      icon: Heart,
      color: "text-terra",
      bg: "bg-terra/5",
      action: "Referral update",
      detail: `${referral.specialist_specialty} referral is ${referral.status}`,
      source: "Referrals",
      time: formatActivityTime(referral.created_at),
    })),
  ].slice(0, 6)

  return (
    <div className="animate-slide-up space-y-6">
      <section className="surface-card overflow-hidden">
        <div className="px-5 py-5 lg:px-6 lg:py-6">
          <h1 className="text-3xl text-warm-800">
            Good{" "}
            {new Date().getHours() < 12
            ? "morning"
            : new Date().getHours() < 17
              ? "afternoon"
              : "evening"}
            , {patientName.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-warm-500">
            Your care plan is organized and ready. Use natural language to book, search, and resolve tasks quickly.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-sand bg-cream/60 px-3 py-1.5 text-warm-600">
              Try: &ldquo;Find a lab near me for A1C this week&rdquo;
            </span>
            <span className="rounded-full border border-sand bg-cream/60 px-3 py-1.5 text-warm-600">
              Try: &ldquo;Show claims with denied status&rdquo;
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 border-t border-sand/70 bg-cream/60 p-3 sm:grid-cols-3">
          <Link href="/providers" className="surface-muted flex items-center gap-2 px-3 py-2 text-xs font-semibold text-warm-700 hover:border-terra/25 hover:text-terra transition">
            <Search size={13} className="text-terra" />
            Find Care Near Me
          </Link>
          <Link href="/screening" className="surface-muted flex items-center gap-2 px-3 py-2 text-xs font-semibold text-warm-700 hover:border-terra/25 hover:text-terra transition">
            <Heart size={13} className="text-terra" />
            Personalized Screening
          </Link>
          <Link href="/billing" className="surface-muted flex items-center gap-2 px-3 py-2 text-xs font-semibold text-warm-700 hover:border-terra/25 hover:text-terra transition">
            <Receipt size={13} className="text-terra" />
            Review Billing & Receipts
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link
          href="/scheduling"
          className="surface-card p-4 transition-all hover:-translate-y-0.5 hover:border-terra/30"
        >
          <Calendar size={20} className="text-terra mb-2" />
          <div className="text-lg font-bold text-warm-800">{upcomingApts.length}</div>
          <div className="text-xs text-warm-500">Upcoming Visits</div>
        </Link>
        <Link
          href="/prescriptions"
          className="surface-card p-4 transition-all hover:-translate-y-0.5 hover:border-terra/30"
        >
          <Pill size={20} className="text-accent mb-2" />
          <div className="text-lg font-bold text-warm-800">{myRx.length}</div>
          <div className="text-xs text-warm-500">Active Medications</div>
        </Link>
        <Link
          href="/lab-results"
          className="surface-card p-4 transition-all hover:-translate-y-0.5 hover:border-terra/30"
        >
          <FlaskConical size={20} className="text-soft-blue mb-2" />
          <div className="text-lg font-bold text-warm-800">{myLabs.length}</div>
          <div className="text-xs text-warm-500">
            Lab Tests{pendingLabs.length > 0 ? ` (${pendingLabs.length} pending)` : ""}
          </div>
        </Link>
        <Link
          href="/messages"
          className="surface-card p-4 transition-all hover:-translate-y-0.5 hover:border-terra/30"
        >
          <MessageSquare size={20} className="text-yellow-600 mb-2" />
          <div className="text-lg font-bold text-warm-800">{unreadCount}</div>
          <div className="text-xs text-warm-500">Unread Messages</div>
        </Link>
      </div>

      {/* Precision Care Tools */}
      <PlatformReadiness />

      {/* Precision Care Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Link
          href="/screening"
          className="surface-card p-4 hover:border-terra/30 transition"
        >
          <div className="flex items-center gap-2 mb-1">
            <Heart size={14} className="text-terra" />
            <span className="text-xs font-bold text-warm-800">AI Screening</span>
          </div>
          <p className="text-xs text-warm-500">
            Preventive risk scoring based on your labs, vitals, and conditions.
          </p>
        </Link>
        <Link
          href="/second-opinion"
          className="surface-card p-4 hover:border-terra/30 transition"
        >
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={14} className="text-terra" />
            <span className="text-xs font-bold text-warm-800">Second Opinion</span>
          </div>
          <p className="text-xs text-warm-500">
            Structured plan review with key clinician questions and safety flags.
          </p>
        </Link>
        <Link
          href="/clinical-trials"
          className="surface-card p-4 hover:border-terra/30 transition"
        >
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical size={14} className="text-soft-blue" />
            <span className="text-xs font-bold text-warm-800">Clinical Trials</span>
          </div>
          <p className="text-xs text-warm-500">
            Discover recruiting studies that align with your risk profile.
          </p>
        </Link>
      </div>

      {/* Health Engagement Score */}
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-terra" />
            <span className="text-xs font-bold text-warm-800">Health Engagement Score</span>
          </div>
          <span className={cn("text-xs font-bold", healthScoreColor)}>{healthScoreLabel}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="w-full h-2 bg-sand/40 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700", healthScoreBg)}
                style={{ width: `${healthScore}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-cloudy">Based on adherence, labs & vaccines</span>
              <span className={cn("text-sm font-bold", healthScoreColor)}>{healthScore}/100</span>
            </div>
          </div>
          <div className="flex gap-3 shrink-0 text-center">
            <div>
              <p className={cn("text-base font-bold", avgAdherence >= 80 ? "text-accent" : "text-soft-red")}>{avgAdherence}%</p>
              <p className="text-[9px] text-cloudy">Adherence</p>
            </div>
            {myVaccinations.length > 0 && (
              <div>
                <p className={cn("text-base font-bold", dueVaccines.length === 0 ? "text-accent" : "text-yellow-600")}>
                  {myVaccinations.length - dueVaccines.length}/{myVaccinations.length}
                </p>
                <p className="text-[9px] text-cloudy">Vaccines</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Urgent Alerts Row */}
      {(abnormalLabCount > 0 || dueVaccines.length > 0 || pendingReferrals.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {abnormalLabCount > 0 && (
            <Link href="/lab-results" className="bg-soft-red/5 rounded-2xl border border-soft-red/10 p-4 hover:border-soft-red/20 transition">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-soft-red" />
                <span className="text-xs font-bold text-soft-red">Lab Alert</span>
              </div>
              <p className="text-xs text-warm-600">{abnormalLabCount} abnormal lab value{abnormalLabCount !== 1 ? "s" : ""} found</p>
            </Link>
          )}
          {dueVaccines.length > 0 && (
            <Link href="/vaccinations" className="bg-yellow-50 rounded-2xl border border-yellow-200/50 p-4 hover:border-yellow-300/50 transition">
              <div className="flex items-center gap-2 mb-1">
                <Syringe size={14} className="text-yellow-600" />
                <span className="text-xs font-bold text-yellow-700">Vaccines Due</span>
              </div>
              <p className="text-xs text-warm-600">{dueVaccines.map((v) => v.vaccine_name).join(", ")}</p>
            </Link>
          )}
          {pendingReferrals.length > 0 && (
            <Link href="/referrals" className="bg-soft-blue/5 rounded-2xl border border-soft-blue/10 p-4 hover:border-soft-blue/20 transition">
              <div className="flex items-center gap-2 mb-1">
                <ArrowRightCircle size={14} className="text-soft-blue" />
                <span className="text-xs font-bold text-soft-blue">Referrals</span>
              </div>
              <p className="text-xs text-warm-600">{pendingReferrals.length} specialist visit{pendingReferrals.length !== 1 ? "s" : ""} to schedule or attend</p>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Upcoming Appointments */}
        <div className="lg:col-span-2 surface-card">
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
                  Find a doctor &rarr;
                </Link>
              </div>
            )}
            {upcomingApts.slice(0, 5).map((apt) => {
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
                      {apt.reason}
                      {apt.copay > 0 ? ` \u00b7 Est. copay $${apt.copay}` : " \u00b7 $0 copay"}
                    </p>
                    <p className="text-[10px] text-cloudy mt-0.5">{formatDate(apt.scheduled_at)}</p>
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
          {/* Latest Vitals */}
          {latestVital && (
            <Link href="/vitals" className="block surface-card p-4 hover:border-terra/30 transition">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className="text-accent" />
                <span className="text-xs font-bold text-warm-800">Latest Vitals</span>
                <span className="text-[9px] text-cloudy ml-auto">
                  {new Date(latestVital.recorded_at).toLocaleDateString()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {latestVital.systolic && (
                  <div>
                    <p className={cn("text-sm font-bold", latestVital.systolic >= 140 ? "text-soft-red" : "text-warm-800")}>
                      {latestVital.systolic}/{latestVital.diastolic}
                    </p>
                    <p className="text-[9px] text-cloudy">Blood Pressure</p>
                  </div>
                )}
                {latestVital.heart_rate && (
                  <div>
                    <p className="text-sm font-bold text-warm-800">{latestVital.heart_rate} bpm</p>
                    <p className="text-[9px] text-cloudy">Heart Rate</p>
                  </div>
                )}
                {latestVital.blood_glucose && (
                  <div>
                    <p className={cn("text-sm font-bold", latestVital.blood_glucose > 130 ? "text-yellow-600" : "text-warm-800")}>
                      {latestVital.blood_glucose}
                    </p>
                    <p className="text-[9px] text-cloudy">Glucose mg/dL</p>
                  </div>
                )}
                {latestVital.weight_lbs && (
                  <div>
                    <p className="text-sm font-bold text-warm-800">{latestVital.weight_lbs} lbs</p>
                    <p className="text-[9px] text-cloudy">Weight</p>
                  </div>
                )}
              </div>
            </Link>
          )}

          {/* My Medications */}
          <div className="surface-card">
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
              className="block text-center py-2.5 border-t border-sand text-xs font-semibold text-terra hover:bg-cream/50 transition"
            >
              View all &rarr;
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
            <div className="bg-yellow-50 rounded-2xl border border-yellow-200/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={14} className="text-yellow-600" />
                <span className="text-xs font-bold text-yellow-700">Pending Approvals</span>
              </div>
              {pendingPA.map((pa) => (
                <p key={pa.id} className="text-xs text-warm-600 mt-1">
                  {pa.procedure_name} — waiting on {pa.insurance_provider}
                </p>
              ))}
            </div>
          )}

          {/* Emergency Card */}
          <Link
            href="/emergency-card"
            className="block bg-soft-red/5 rounded-2xl border border-soft-red/10 p-4 hover:bg-soft-red/10 transition"
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={14} className="text-soft-red" />
              <span className="text-xs font-bold text-warm-800">Emergency Card</span>
            </div>
            <p className="text-[10px] text-warm-500">
              Quick-access card with your allergies, meds, and emergency contacts.
            </p>
          </Link>

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
      <div className="surface-card">
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
          {careTeamActivity.length > 0 ? careTeamActivity.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-cream/30 transition">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", item.bg)}>
                <item.icon size={14} className={item.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-warm-800">{item.action}</span>
                  <span className="text-[9px] font-bold text-terra bg-terra/10 px-1.5 py-0.5 rounded">{item.source}</span>
                </div>
                <p className="text-[11px] text-warm-500 mt-0.5 truncate">{item.detail}</p>
              </div>
              <span className="text-[10px] text-cloudy shrink-0">{item.time}</span>
            </div>
          )) : (
            <div className="p-6 text-center text-xs text-warm-500">
              Live care-team activity will appear here as appointments, labs, and messages update.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
