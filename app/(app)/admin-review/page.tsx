"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bell,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

const OPENRX_ADMIN_ID = "admin-openrx"

interface Application {
  id: string
  role: "provider" | "caregiver"
  fullName: string
  email: string
  phone: string
  npi?: string
  licenseNumber?: string
  specialtyOrRole: string
  servicesSummary: string
  city: string
  state: string
  zip: string
  status: "pending" | "approved" | "rejected"
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  reviewNotes?: string
}

interface AdminNotification {
  id: string
  title: string
  message: string
  applicationId: string
  type: "application_submitted" | "application_reviewed"
  isRead: boolean
  createdAt: string
}

export default function AdminReviewPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [reviewer, setReviewer] = useState(OPENRX_ADMIN_ID)
  const [statusFilter, setStatusFilter] = useState<"all" | Application["status"]>("all")
  const [roleFilter, setRoleFilter] = useState<"all" | Application["role"]>("all")
  const [search, setSearch] = useState("")
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})

  const pendingCount = useMemo(
    () => applications.filter((item) => item.status === "pending").length,
    [applications]
  )

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  )

  const filteredApplications = useMemo(() => {
    let items = [...applications]
    if (statusFilter !== "all") items = items.filter((item) => item.status === statusFilter)
    if (roleFilter !== "all") items = items.filter((item) => item.role === roleFilter)
    const q = search.trim().toLowerCase()
    if (q) {
      items = items.filter((item) => {
        return (
          item.fullName.toLowerCase().includes(q) ||
          item.specialtyOrRole.toLowerCase().includes(q) ||
          item.city.toLowerCase().includes(q) ||
          item.state.toLowerCase().includes(q) ||
          item.zip.includes(q) ||
          item.id.toLowerCase().includes(q)
        )
      })
    }
    return items
  }, [applications, roleFilter, search, statusFilter])

  async function loadData(refresh?: boolean) {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    setError("")
    try {
      const [applicationsRes, notificationsRes] = await Promise.all([
        fetch("/api/admin/applications"),
        fetch(`/api/admin/notifications?adminId=${encodeURIComponent(OPENRX_ADMIN_ID)}`),
      ])
      const applicationsData = (await applicationsRes.json()) as {
        applications: Application[]
      }
      const notificationsData = (await notificationsRes.json()) as {
        notifications: AdminNotification[]
      }
      setApplications(applicationsData.applications || [])
      setNotifications(notificationsData.notifications || [])
    } catch {
      setError("Failed to load admin review data.")
    } finally {
      if (refresh) setRefreshing(false)
      else setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function review(
    applicationId: string,
    decision: "approved" | "rejected"
  ) {
    setBusyId(applicationId)
    setError("")
    try {
      const response = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          decision,
          reviewer,
          notes:
            reviewNotes[applicationId]?.trim() ||
            (decision === "approved"
              ? "Approved for network release."
              : "Rejected pending additional verification."),
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok || data.error) {
        throw new Error(data.error || "Review update failed.")
      }
      await loadData()
      setReviewNotes((prev) => ({ ...prev, [applicationId]: "" }))
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Review update failed.")
    } finally {
      setBusyId(null)
    }
  }

  async function markNotificationRead(notificationId: string) {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      })
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, isRead: true } : item
        )
      )
    } catch {
      // ignore best-effort update
    }
  }

  if (loading) {
    return (
      <div className="bg-pampas rounded-2xl border border-sand p-8 text-center text-sm text-cloudy">
        <Loader2 size={16} className="animate-spin inline mr-2" />
        Loading admin review queue...
      </div>
    )
  }

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif text-warm-800">Admin Application Review</h1>
          <p className="text-sm text-warm-500 mt-1">
            Review provider/caregiver applications and release approved applicants.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-sand text-[11px] font-semibold text-warm-700 hover:border-terra/30 transition disabled:opacity-60"
          >
            {refreshing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCcw size={11} />}
            Refresh
          </button>
          <div className="text-xs font-semibold text-terra bg-terra/10 border border-terra/20 rounded-full px-3 py-1">
            Pending: {pendingCount}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-soft-red/20 bg-soft-red/5 p-3 text-xs text-soft-red">
          {error}
        </div>
      )}

      <div className="bg-pampas rounded-2xl border border-sand p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="text-xs text-warm-500">
            Reviewer ID
            <input
              value={reviewer}
              onChange={(event) => setReviewer(event.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-sand bg-cream/30 text-sm text-warm-800 focus:outline-none focus:border-terra/40"
            />
          </label>
          <label className="text-xs text-warm-500">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | Application["status"])}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-sand bg-cream/30 text-sm text-warm-800 focus:outline-none focus:border-terra/40"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="text-xs text-warm-500">
            Role
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as "all" | Application["role"])}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-sand bg-cream/30 text-sm text-warm-800 focus:outline-none focus:border-terra/40"
            >
              <option value="all">All</option>
              <option value="provider">Provider</option>
              <option value="caregiver">Caregiver</option>
            </select>
          </label>
          <label className="text-xs text-warm-500">
            Search
            <div className="relative mt-1">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cloudy" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, city, ID..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-sand bg-cream/30 text-sm text-warm-800 focus:outline-none focus:border-terra/40"
              />
            </div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-pampas rounded-2xl border border-sand p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={14} className="text-terra" />
            <h2 className="text-sm font-bold text-warm-800">Applications</h2>
          </div>
          <div className="space-y-3">
            {filteredApplications.map((application) => (
              <div key={application.id} className="rounded-xl border border-sand/70 bg-cream/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-warm-800">
                    {application.fullName} · {application.role}
                  </p>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full uppercase font-bold",
                      application.status === "approved"
                        ? "bg-accent/10 text-accent"
                        : application.status === "rejected"
                        ? "bg-soft-red/10 text-soft-red"
                        : "bg-yellow-100/20 text-yellow-500"
                    )}
                  >
                    {application.status}
                  </span>
                </div>
                <p className="text-xs text-warm-500 mt-1">
                  {application.specialtyOrRole} · {application.city}, {application.state} {application.zip}
                </p>
                <p className="text-xs text-warm-600 mt-2">{application.servicesSummary}</p>
                {(application.npi || application.licenseNumber) && (
                  <p className="text-[10px] text-cloudy mt-1">
                    {application.npi ? `NPI ${application.npi}` : ""}
                    {application.npi && application.licenseNumber ? " · " : ""}
                    {application.licenseNumber ? `License ${application.licenseNumber}` : ""}
                  </p>
                )}
                <p className="text-[10px] text-cloudy mt-2 font-mono">{application.id}</p>
                {application.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={reviewNotes[application.id] || ""}
                      onChange={(event) =>
                        setReviewNotes((prev) => ({
                          ...prev,
                          [application.id]: event.target.value,
                        }))
                      }
                      placeholder="Optional review note"
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-sand bg-pampas text-[11px] text-warm-800 focus:outline-none focus:border-terra/40"
                    />
                    <button
                      onClick={() => void review(application.id, "approved")}
                      disabled={busyId === application.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-60"
                    >
                      <CheckCircle2 size={12} />
                      Approve
                    </button>
                    <button
                      onClick={() => void review(application.id, "rejected")}
                      disabled={busyId === application.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-soft-red text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-60"
                    >
                      <XCircle size={12} />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
            {filteredApplications.length === 0 && (
              <p className="text-xs text-cloudy">No applications match the current filters.</p>
            )}
          </div>
        </div>

        <div className="bg-pampas rounded-2xl border border-sand p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={14} className="text-terra" />
            <h2 className="text-sm font-bold text-warm-800">Admin Notifications</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-terra/10 text-terra">
              Unread {unreadCount}
            </span>
          </div>
          <div className="space-y-2">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => void markNotificationRead(notification.id)}
                className={cn(
                  "w-full text-left rounded-xl border p-3 transition",
                  notification.isRead
                    ? "bg-cream/20 border-sand/50"
                    : "bg-terra/10 border-terra/20"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-warm-800">{notification.title}</p>
                  {!notification.isRead && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-terra text-white">
                      NEW
                    </span>
                  )}
                </div>
                <p className="text-xs text-warm-500 mt-1">{notification.message}</p>
                <p className="text-[10px] text-cloudy mt-1">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </button>
            ))}
            {notifications.length === 0 && (
              <p className="text-xs text-cloudy">No admin notifications yet.</p>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-sand/70 bg-cream/30 p-3 text-[11px] text-warm-500">
            <ShieldCheck size={12} className="inline mr-1 text-terra" />
            Review actions create a release audit trail in notifications.
          </div>
        </div>
      </div>
    </div>
  )
}
