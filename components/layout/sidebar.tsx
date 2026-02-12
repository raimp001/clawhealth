"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Calendar,
  Receipt,
  Pill,
  ShieldCheck,
  MessageSquare,
  Bot,
  ExternalLink,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/scheduling", label: "Scheduling", icon: Calendar },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/prescriptions", label: "Prescriptions", icon: Pill },
  { href: "/prior-auth", label: "Prior Auth", icon: ShieldCheck },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/chat", label: "AI Agent", icon: Bot },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Close on escape key
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
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-terra to-terra-dark flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 4v16M4 12h16"
              stroke="#F4F3EE"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-warm-800 font-serif">
            OpenRx
          </h1>
          <p className="text-[9px] font-semibold text-cloudy uppercase tracking-[2px]">
            Powered by OpenClaw
          </p>
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
          className="ml-auto lg:hidden p-1 rounded-lg hover:bg-pampas transition"
        >
          <X size={18} className="text-warm-600" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-terra/8 text-terra font-semibold"
                  : "text-warm-600 hover:text-warm-800 hover:bg-pampas"
              )}
            >
              <item.icon
                size={18}
                className={active ? "text-terra" : "text-warm-500"}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-sand">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-cloudy hover:text-terra hover:bg-terra/5 transition-all"
        >
          <ExternalLink size={14} />
          View Pitch Deck
        </Link>
        <div className="mt-3 mx-3 px-3 py-2 rounded-lg bg-terra/5 border border-terra/10">
          <p className="text-[10px] font-bold text-terra uppercase tracking-wider">
            Demo Mode
          </p>
          <p className="text-[10px] text-warm-500 mt-0.5">
            Using sample clinic data
          </p>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-white rounded-xl border border-sand shadow-sm hover:shadow-md transition"
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
          "fixed left-0 top-0 z-50 h-screen w-[280px] border-r border-sand bg-white flex flex-col transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-[240px] border-r border-sand bg-white flex-col">
        {sidebarContent}
      </aside>
    </>
  )
}
