import {
  createAdminReviewToken,
  type AdminReviewDecision,
} from "@/lib/admin-review-token"
import type { NetworkApplication } from "@/lib/provider-applications"
import { fetchWithTimeout } from "@/lib/fetch-with-timeout"

function resolveAdminRecipients(): string[] {
  const configured = process.env.OPENRX_ADMIN_EMAILS || ""
  const recipients = configured
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

  if (recipients.length > 0) return recipients
  if (process.env.NODE_ENV === "production") {
    throw new Error("OPENRX_ADMIN_EMAILS is required in production.")
  }
  return []
}

function resolveBaseUrl(origin?: string): string {
  if (origin) return origin
  if (process.env.OPENRX_APP_BASE_URL) return process.env.OPENRX_APP_BASE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (process.env.NODE_ENV === "production") {
    throw new Error("OPENRX_APP_BASE_URL is required in production when origin is unavailable.")
  }
  return "http://localhost:3000"
}

function buildActionUrl(params: {
  decision: AdminReviewDecision
  applicationId: string
  baseUrl: string
}): string {
  const token = createAdminReviewToken({
    applicationId: params.applicationId,
    decision: params.decision,
  })
  const url = new URL("/api/admin/applications/action", params.baseUrl)
  url.searchParams.set("token", token)
  return url.toString()
}

function buildMessage(params: {
  application: NetworkApplication
  approveUrl: string
  rejectUrl: string
}) {
  const { application, approveUrl, rejectUrl } = params
  const subject = `OpenRx application review: ${application.fullName} (${application.role})`
  const text = [
    `A new ${application.role} application requires review.`,
    "",
    `Applicant: ${application.fullName}`,
    `Email: ${application.email}`,
    `Phone: ${application.phone}`,
    `NPI: ${application.npi || "N/A"}`,
    `License: ${application.licenseNumber || "N/A"}`,
    `Specialty/Role: ${application.specialtyOrRole}`,
    `Location: ${application.city}, ${application.state} ${application.zip}`,
    `Summary: ${application.servicesSummary}`,
    "",
    `Application ID: ${application.id}`,
    "",
    `Approve: ${approveUrl}`,
    `Reject: ${rejectUrl}`,
  ].join("\n")

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #1f2937;">
  <h2 style="margin: 0 0 12px;">OpenRx application review required</h2>
  <p style="margin: 0 0 16px;">A new <strong>${application.role}</strong> application has been submitted.</p>
  <table cellpadding="6" cellspacing="0" style="border-collapse: collapse; font-size: 14px;">
    <tr><td><strong>Applicant</strong></td><td>${application.fullName}</td></tr>
    <tr><td><strong>Email</strong></td><td>${application.email}</td></tr>
    <tr><td><strong>Phone</strong></td><td>${application.phone}</td></tr>
    <tr><td><strong>NPI</strong></td><td>${application.npi || "N/A"}</td></tr>
    <tr><td><strong>License</strong></td><td>${application.licenseNumber || "N/A"}</td></tr>
    <tr><td><strong>Specialty / Role</strong></td><td>${application.specialtyOrRole}</td></tr>
    <tr><td><strong>Location</strong></td><td>${application.city}, ${application.state} ${application.zip}</td></tr>
    <tr><td><strong>Summary</strong></td><td>${application.servicesSummary}</td></tr>
    <tr><td><strong>Application ID</strong></td><td><code>${application.id}</code></td></tr>
  </table>
  <div style="margin-top: 20px;">
    <a href="${approveUrl}" style="display:inline-block; padding:10px 14px; background:#047857; color:#fff; text-decoration:none; border-radius:8px; margin-right:8px;">Approve</a>
    <a href="${rejectUrl}" style="display:inline-block; padding:10px 14px; background:#b91c1c; color:#fff; text-decoration:none; border-radius:8px;">Reject</a>
  </div>
</div>
`.trim()

  return { subject, text, html }
}

async function sendWithResend(params: {
  recipients: string[]
  subject: string
  text: string
  html: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.OPENRX_EMAIL_FROM
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and OPENRX_EMAIL_FROM are required for email delivery.")
  }

  const response = await fetchWithTimeout(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: params.recipients,
        subject: params.subject,
        text: params.text,
        html: params.html,
      }),
      cache: "no-store",
    },
    12000
  )

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Resend delivery failed (${response.status}): ${details || "unknown error"}`)
  }
}

export async function sendAdminApplicationEmail(params: {
  application: NetworkApplication
  origin?: string
}) {
  const recipients = resolveAdminRecipients()
  if (recipients.length === 0) {
    if (process.env.NODE_ENV !== "production") return
    throw new Error("No admin recipients configured.")
  }

  const baseUrl = resolveBaseUrl(params.origin)
  const approveUrl = buildActionUrl({
    decision: "approved",
    applicationId: params.application.id,
    baseUrl,
  })
  const rejectUrl = buildActionUrl({
    decision: "rejected",
    applicationId: params.application.id,
    baseUrl,
  })

  const message = buildMessage({
    application: params.application,
    approveUrl,
    rejectUrl,
  })

  await sendWithResend({
    recipients,
    subject: message.subject,
    text: message.text,
    html: message.html,
  })
}
