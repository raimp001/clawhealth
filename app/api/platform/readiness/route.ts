import { NextResponse } from "next/server"
import { assessHealthScreening } from "@/lib/basehealth"
import { getLedgerSnapshot } from "@/lib/payments-ledger"
import {
  OPENRX_ADMIN_ID,
  listAdminNotifications,
  listNetworkApplications,
} from "@/lib/provider-applications"

type ReadinessStatus = "ready" | "attention"

function toStatus(ok: boolean): ReadinessStatus {
  return ok ? "ready" : "attention"
}

export async function GET() {
  const applications = listNetworkApplications()
  const notifications = listAdminNotifications(OPENRX_ADMIN_ID)
  const ledger = getLedgerSnapshot()
  const screening = assessHealthScreening()

  const pendingApplications = applications.filter((item) => item.status === "pending").length
  const approvedApplications = applications.filter((item) => item.status === "approved").length
  const rejectedApplications = applications.filter((item) => item.status === "rejected").length
  const unreadNotifications = notifications.filter((item) => !item.isRead).length

  const checks = [
    {
      id: "nl-care-search",
      title: "Natural-language care search",
      description: "Provider/caregiver/lab/radiology search with NPI readiness gating.",
      status: toStatus(true),
      metric: "Enabled",
      href: "/providers",
    },
    {
      id: "network-onboarding",
      title: "Provider/caregiver onboarding",
      description: "Applicant intake, admin queue, review decisions, and release notifications.",
      status: toStatus(true),
      metric: `${applications.length} applications`,
      href: "/admin-review",
    },
    {
      id: "screening-routing",
      title: "Personalized screening routing",
      description: "Risk-based recommendations and nearby network routing from patient history.",
      status: toStatus(screening.recommendedScreenings.length > 0),
      metric: `${screening.recommendedScreenings.length} recommendations`,
      href: "/screening",
    },
    {
      id: "payments-ledger",
      title: "Payments compliance ledger",
      description: "Verification, receipts, attestations, refunds, and accounting trail.",
      status: toStatus(true),
      metric: `${ledger.summary.receiptCount} receipts`,
      href: "/compliance-ledger",
    },
  ]

  const readyCount = checks.filter((item) => item.status === "ready").length
  const readinessScore = Math.round((readyCount / checks.length) * 100)

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    readinessScore,
    checks,
    operations: {
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      unreadNotifications,
      pendingVerification: ledger.summary.pendingVerificationCount,
      openRefunds: ledger.summary.openRefundCount,
      verifiedVolume: ledger.summary.verifiedVolume,
      refundedVolume: ledger.summary.refundedVolume,
    },
  })
}
