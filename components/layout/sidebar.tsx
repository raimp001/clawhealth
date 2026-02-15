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
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/onboarding", label: "Get Started", icon: Heart },
  { href: "/scheduling", label: "My Appointments", icon: Calendar },
  { href: "/prescriptions", label: "My Medications", icon: Pill, matchAlso: ["/pharmacy"] },
  { href: "/drug-prices", label: "Drug Prices", icon: DollarSign },
  { href: "/billing", label: "My Bills", icon: Receipt },
  { href: "/providers", label: "Find a Doctor", icon: Stethoscope },
  { href: "/wallet", label: "Wallet", icon: WalletIcon },
  { href: "/earn", label: "Earn", icon: TrendingUp },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/chat", label: "Ask AI", icon: Bot },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

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
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sand">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-terra to-terra-dark flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 4v16M4 12h16"
              stroke="#060D1B"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold text-warm-800 font-serif tracking-wide">
            OpenRx
          </h1>
          <p className="text-[8px] font-semibold text-cloudy uppercase tracking-[2px]">
            Powered by OpenClaw
          </p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
          className="ml-auto lg:hidden p-1 rounded-lg hover:bg-pampas transition"
        >
          <X size={18} className="text-warm-600" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const matchAlso = (item as any).matchAlso as string[] | undefined
          const active =
            pathname === item.href ||
            pathname?.startsWith(item.href + "/") ||
            matchAlso?.some((m) => pathname === m || pathname?.startsWith(m + "/"))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all",
                active
                  ? "bg-terra/8 text-terra font-semibold"
                  : "text-warm-600 hover:text-warm-800 hover:bg-pampas"
              )}
            >
              <item.icon
                size={16}
                className={active ? "text-terra" : "text-warm-500"}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-sand">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-cloudy hover:text-terra hover:bg-terra/5 transition-all"
        >
          <ExternalLink size={13} />
          Home
        </Link>
        <div className="mt-2 mx-3 px-3 py-1.5 rounded-lg bg-terra/10 border border-terra/20">
          <p className="text-[9px] font-bold text-terra uppercase tracking-wider">
            Demo Account
          </p>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-pampas rounded-xl border border-sand shadow-sm hover:shadow-md transition"
        aria-label="Open navigation"
      >
        <Menu size={20} className="text-warm-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-[260px] border-r border-sand bg-pampas flex flex-col transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-[220px] border-r border-sand bg-pampas flex-col">
        {sidebarContent}
      </aside>
    </>
  )
}
