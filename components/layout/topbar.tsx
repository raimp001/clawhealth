"use client"

import { Bell, Search } from "lucide-react"
import { messages } from "@/lib/seed-data"

export default function Topbar() {
  const unread = messages.filter((m) => !m.read).length

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-sand bg-white/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6">
      {/* Search */}
      <div className="relative w-full max-w-xs lg:max-w-sm ml-10 lg:ml-0">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-cloudy"
        />
        <input
          type="text"
          placeholder="Search patients, appointments, claims..."
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-sand bg-cream/50 text-sm text-warm-800 placeholder:text-cloudy focus:outline-none focus:border-terra/40 focus:ring-1 focus:ring-terra/20 transition"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button aria-label="Notifications" className="relative p-2 rounded-xl hover:bg-pampas transition">
          <Bell size={18} className="text-warm-600" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-terra text-white text-[9px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
              {unread}
            </span>
          )}
        </button>

        {/* User */}
        <div className="flex items-center gap-3 pl-4 border-l border-sand">
          <div className="text-right">
            <p className="text-sm font-semibold text-warm-800">
              Dr. Rai
            </p>
            <p className="text-[10px] text-cloudy">Internal Medicine</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-terra to-terra-dark flex items-center justify-center text-cream text-sm font-bold font-serif">
            MR
          </div>
        </div>
      </div>
    </header>
  )
}
