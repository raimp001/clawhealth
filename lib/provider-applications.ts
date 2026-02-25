import fs from "node:fs"
import path from "node:path"

export const OPENRX_ADMIN_ID = "admin-openrx" as const

export type ApplicantRole = "provider" | "caregiver"
export type ApplicationStatus = "pending" | "approved" | "rejected"

export interface NetworkApplication {
  id: string
  role: ApplicantRole
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
  status: ApplicationStatus
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  reviewNotes?: string
}

export interface AdminNotification {
  id: string
  adminId: string
  title: string
  message: string
  applicationId: string
  type: "application_submitted" | "application_reviewed"
  isRead: boolean
  createdAt: string
}

interface ApplicationStore {
  applications: NetworkApplication[]
  notifications: AdminNotification[]
}

const STORE_PATH =
  process.env.OPENRX_APPLICATIONS_PATH || path.join(process.cwd(), ".openrx-applications.json")

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function loadStore(): ApplicationStore {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return { applications: [], notifications: [] }
    }
    const raw = fs.readFileSync(STORE_PATH, "utf8")
    const parsed = JSON.parse(raw) as Partial<ApplicationStore>
    return {
      applications: parsed.applications || [],
      notifications: parsed.notifications || [],
    }
  } catch {
    return { applications: [], notifications: [] }
  }
}

function saveStore(store: ApplicationStore): void {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8")
  } catch {
    // Ignore persistence failures in demo mode.
  }
}

function addAdminNotification(
  store: ApplicationStore,
  params: Omit<AdminNotification, "id" | "createdAt" | "isRead">
): AdminNotification {
  const notification: AdminNotification = {
    id: createId("ntf"),
    createdAt: new Date().toISOString(),
    isRead: false,
    ...params,
  }
  store.notifications.unshift(notification)
  return notification
}

export function submitNetworkApplication(input: {
  role: ApplicantRole
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
}): NetworkApplication {
  const store = loadStore()
  const application: NetworkApplication = {
    id: createId("app"),
    role: input.role,
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    phone: input.phone,
    npi: input.npi,
    licenseNumber: input.licenseNumber,
    specialtyOrRole: input.specialtyOrRole,
    servicesSummary: input.servicesSummary,
    city: input.city,
    state: input.state.toUpperCase(),
    zip: input.zip,
    status: "pending",
    submittedAt: new Date().toISOString(),
  }
  store.applications.unshift(application)

  addAdminNotification(store, {
    adminId: OPENRX_ADMIN_ID,
    applicationId: application.id,
    type: "application_submitted",
    title: `New ${application.role} application`,
    message: `${application.fullName} applied as ${application.specialtyOrRole} in ${application.city}, ${application.state}.`,
  })

  saveStore(store)
  return application
}

export function listNetworkApplications(params?: {
  status?: ApplicationStatus
  role?: ApplicantRole
}): NetworkApplication[] {
  const store = loadStore()
  let items = [...store.applications]
  if (params?.status) items = items.filter((item) => item.status === params.status)
  if (params?.role) items = items.filter((item) => item.role === params.role)
  return items
}

export function reviewNetworkApplication(input: {
  applicationId: string
  decision: "approved" | "rejected"
  reviewer: string
  notes?: string
}): NetworkApplication {
  const store = loadStore()
  const application = store.applications.find((item) => item.id === input.applicationId)
  if (!application) throw new Error("Application not found.")

  application.status = input.decision
  application.reviewedAt = new Date().toISOString()
  application.reviewedBy = input.reviewer
  application.reviewNotes = input.notes

  addAdminNotification(store, {
    adminId: OPENRX_ADMIN_ID,
    applicationId: application.id,
    type: "application_reviewed",
    title: `Application ${input.decision}`,
    message: `${application.fullName} was ${input.decision} by ${input.reviewer}.`,
  })

  saveStore(store)
  return application
}

export function listAdminNotifications(adminId: string = OPENRX_ADMIN_ID): AdminNotification[] {
  const store = loadStore()
  return store.notifications.filter((item) => item.adminId === adminId)
}

export function markAdminNotificationRead(notificationId: string): AdminNotification {
  const store = loadStore()
  const notification = store.notifications.find((item) => item.id === notificationId)
  if (!notification) throw new Error("Notification not found.")
  notification.isRead = true
  saveStore(store)
  return notification
}
