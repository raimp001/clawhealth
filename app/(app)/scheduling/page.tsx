"use client"

import { getMyAppointments } from "@/lib/current-user"
import { getPhysician } from "@/lib/seed-data"
import { cn, formatTime, formatDate, getStatusColor } from "@/lib/utils"
import { Video, AlertTriangle } from "lucide-react"
import { useState, useMemo } from "react"
import AIAction from "@/components/ai-action"

type ViewMode = "today" | "upcoming" | "past"

export default function SchedulingPage() {
  const [view, setView] = useState<ViewMode>("today")

  const myAppointments = getMyAppointments()
  const today = new Date().toDateString()

  const { todayApts, upcomingApts, pastApts } = useMemo(() => {
    const now = new Date()
    const sorted = [...myAppointments].sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    )

    return {
      todayApts: sorted.filter((a) => new Date(a.scheduled_at).toDateString() === today),
      upcomingApts: sorted.filter(
        (a) => new Date(a.scheduled_at) > now && new Date(a.scheduled_at).toDateString() !== today
      ),
      pastApts: sorted
        .filter((a) => new Date(a.scheduled_at) < now && new Date(a.scheduled_at).toDateString() !== today)
        .reverse(),
    }
  }, [today, myAppointments])

  const activeList = view === "today" ? todayApts : view === "upcoming" ? upcomingApts : pastApts

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    todayApts.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1
    })
    return counts
  }, [todayApts])

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-warm-800">My Appointments</h1>
          <p className="text-sm text-warm-500 mt-1">
            {todayApts.length} appointments today &middot; {upcomingApts.length}{" "}
            upcoming
          </p>
        </div>
        <div className="flex gap-2">
          <AIAction
            agentId="scheduling"
            label="Find Open Slots"
            prompt="Check physician availability for the next 7 days and suggest appointment slots that work for me. Consider my insurance network and copay estimates."
            context={`Today's appointments: ${todayApts.length}, Upcoming: ${upcomingApts.length}`}
          />
          <AIAction
            agentId="scheduling"
            label="Send Me Reminders"
            prompt="Send me reminders for my upcoming appointments. Include time, physician name, location, and copay estimate."
            variant="inline"
          />
        </div>
      </div>

      {/* Today Status Summary */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div
            key={status}
            className={cn(
              "text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide",
              getStatusColor(status)
            )}
          >
            {count} {status}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex bg-pampas border border-sand rounded-xl overflow-hidden">
          {(["today", "upcoming", "past"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-4 py-2 text-sm font-semibold transition-all capitalize",
                view === v
                  ? "bg-terra text-white"
                  : "text-warm-600 hover:text-warm-800 hover:bg-sand/30"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Appointment List */}
      <div className="bg-pampas rounded-2xl border border-sand divide-y divide-sand/50">
        {activeList.length === 0 && (
          <div className="text-center py-12 text-sm text-warm-500">
            No appointments to display.
          </div>
        )}
        {activeList.map((apt) => {
          const physician = getPhysician(apt.physician_id)
          return (
            <div
              key={apt.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-sand/20 transition"
            >
              {/* Time */}
              <div className="w-20 shrink-0 text-center">
                <div className="text-sm font-bold text-warm-800">
                  {formatTime(apt.scheduled_at)}
                </div>
                <div className="text-[10px] text-cloudy">
                  {apt.duration_minutes}min
                </div>
              </div>

              {/* Status bar */}
              <div
                className={cn(
                  "w-1.5 h-10 rounded-full shrink-0",
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

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                      getStatusColor(apt.status)
                    )}
                  >
                    {apt.status}
                  </span>
                  {apt.type === "urgent" && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-soft-red">
                      <AlertTriangle size={10} />
                      URGENT
                    </span>
                  )}
                  {apt.type === "telehealth" && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-soft-blue">
                      <Video size={10} />
                      TELEHEALTH
                    </span>
                  )}
                  {apt.type === "new-patient" && (
                    <span className="text-[10px] font-bold text-accent">NEW</span>
                  )}
                </div>
                <p className="text-xs text-warm-500 mt-0.5 truncate">
                  {apt.reason}
                </p>
                {apt.notes && (
                  <p className="text-[10px] text-cloudy mt-0.5 truncate italic">
                    {apt.notes}
                  </p>
                )}
              </div>

              {/* Physician */}
              <div className="text-right shrink-0">
                <p className="text-xs font-medium text-warm-700">
                  {physician?.full_name}
                </p>
                <p className="text-[10px] text-cloudy">{physician?.specialty}</p>
              </div>

              {/* Date (for non-today) */}
              {view !== "today" && (
                <div className="text-xs text-warm-500 shrink-0 w-24 text-right">
                  {formatDate(apt.scheduled_at)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
