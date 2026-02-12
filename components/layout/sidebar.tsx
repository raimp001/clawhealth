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
} from "lucide-react"
import { cn } from "@/lib/utils"

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

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[240px] border-r border-sand bg-white flex flex-col">
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
            ClawHealth
          </h1>
          <p className="text-[9px] font-semibold text-cloudy uppercase tracking-[2px]">
            Powered by OpenClaw
          </p>
        </div>
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
    </aside>
  )
}
