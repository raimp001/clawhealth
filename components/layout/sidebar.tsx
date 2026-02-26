"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Calendar,
  Receipt,
  Pill,
  DollarSign,
  Wallet as WalletIcon,
  MessageSquare,
  Bot,
  ExternalLink,
  Menu,
  X,
  Stethoscope,
  Heart,
  FlaskConical,
  Activity,
  Syringe,
  ArrowRightCircle,
  AlertCircle,
  ShieldCheck,
  UserPlus,
  ClipboardCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useLiveSnapshot } from "@/lib/hooks/use-live-snapshot"

const navSections = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Home", icon: LayoutDashboard },
      { href: "/onboarding", label: "Get Started", icon: Heart },
    ],
  },
  {
    label: "Health",
    items: [
      { href: "/scheduling", label: "Appointments", icon: Calendar },
      { href: "/screening", label: "AI Screening", icon: Heart },
      { href: "/prescriptions", label: "Medications", icon: Pill, matchAlso: ["/pharmacy"], badgeKey: "pendingRefills" as const },
      { href: "/lab-results", label: "Lab Results", icon: FlaskConical, badgeKey: "pendingLabs" as const },
      { href: "/vitals", label: "Vital Signs", icon: Activity },
      { href: "/vaccinations", label: "Vaccinations", icon: Syringe },
      { href: "/referrals", label: "Referrals", icon: ArrowRightCircle },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/billing", label: "Bills & Claims", icon: Receipt },
      { href: "/compliance-ledger", label: "Compliance Ledger", icon: ShieldCheck },
      { href: "/drug-prices", label: "Drug Prices", icon: DollarSign },
      { href: "/prior-auth", label: "Prior Auth", icon: ShieldCheck, badgeKey: "pendingPA" as const },
      { href: "/wallet", label: "Wallet", icon: WalletIcon },
    ],
  },
  {
    label: "More",
    items: [
      { href: "/providers", label: "Care Network", icon: Stethoscope },
      { href: "/join-network", label: "Join Network", icon: UserPlus },
      { href: "/admin-review", label: "Admin Review", icon: ClipboardCheck },
      { href: "/second-opinion", label: "Second Opinion", icon: ShieldCheck },
      { href: "/clinical-trials", label: "Clinical Trials", icon: FlaskConical },
      { href: "/messages", label: "Messages", icon: MessageSquare, badgeKey: "unreadMessages" as const },
      { href: "/emergency-card", label: "Emergency Card", icon: AlertCircle },
      { href: "/chat", label: "Ask AI", icon: Bot },
    ],
  },
]

type BadgeKey = "unreadMessages" | "pendingRefills" | "pendingPA" | "pendingLabs"

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { snapshot } = useLiveSnapshot()
  const badges = {
    unreadMessages: snapshot.messages.filter((message) => !message.read).length,
    pendingRefills: snapshot.prescriptions.filter((prescription) => prescription.status === "pending-refill").length,
    pendingPA: snapshot.priorAuths.filter(
      (priorAuth) => priorAuth.status === "pending" || priorAuth.status === "submitted"
    ).length,
    pendingLabs: snapshot.labResults.filter((lab) => lab.status === "pending").length,
  }

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  const sidebarContent = (
    <>
      <div className="border-b border-sand/70 px-4 pb-3 pt-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-terra via-terra-light to-accent shadow-lg shadow-terra/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 4v16M4 12h16" stroke="#11221D" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-warm-800">OpenRx Care OS</h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cloudy">patient-first command center</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="ml-auto rounded-lg p-1 text-warm-500 transition hover:bg-cream lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-sand/80 bg-cream/60 px-3 py-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-cloudy">Signed in</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-warm-800">
            {snapshot.patient?.full_name || "Connect wallet to load profile"}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Main navigation">
        {navSections.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-4" : ""}>
            {section.label && <p className="section-title px-3 pb-1">{section.label}</p>}
            <div className="space-y-1">
              {section.items.map((item) => {
                const matchAlso = "matchAlso" in item ? (item.matchAlso as string[]) : undefined
                const active =
                  pathname === item.href ||
                  pathname?.startsWith(item.href + "/") ||
                  matchAlso?.some((m) => pathname === m || pathname?.startsWith(m + "/"))
                const badgeKey = "badgeKey" in item ? (item.badgeKey as BadgeKey) : undefined
                const badgeCount = badgeKey ? badges[badgeKey] : 0

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl border px-3 py-2 text-[12px] font-medium transition-all",
                      active
                        ? "border-terra/25 bg-terra/10 text-terra shadow-sm"
                        : "border-transparent text-warm-600 hover:border-sand/70 hover:bg-pampas hover:text-warm-800"
                    )}
                  >
                    <item.icon size={15} className={cn("shrink-0", active ? "text-terra" : "text-warm-500 group-hover:text-warm-700")} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badgeCount > 0 && (
                      <span
                        className={cn(
                          "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold",
                          active ? "bg-terra text-white" : "bg-terra/15 text-terra"
                        )}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sand/70 px-3 py-3">
        <Link
          href="/chat"
          className="flex items-center justify-between rounded-xl border border-terra/20 bg-terra/10 px-3 py-2 text-xs font-semibold text-terra transition hover:bg-terra/15"
        >
          AI Concierge
          <Bot size={13} />
        </Link>
        <Link
          href="/"
          className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-cloudy transition hover:bg-cream hover:text-warm-700"
        >
          <ExternalLink size={13} />
          Open Marketing Site
        </Link>
      </div>
    </>
  )

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-xl border border-sand bg-pampas p-2 text-warm-700 shadow-soft-card transition hover:bg-cream lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0d1e18]/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-[286px] flex-col border-r border-sand/80 bg-pampas/95 shadow-2xl backdrop-blur-sm transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[248px] flex-col border-r border-sand/70 bg-pampas/90 backdrop-blur-md lg:flex">
        {sidebarContent}
      </aside>
    </>
  )
}
