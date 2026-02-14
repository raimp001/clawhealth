"use client"

import { Bell, Search, X, User } from "lucide-react"
import { messages, patients, appointments, claims } from "@/lib/seed-data"
import { cn, formatDate, getInitials } from "@/lib/utils"
import Link from "next/link"
import { useState, useMemo, useRef, useEffect } from "react"

export default function Topbar() {
  const unread = messages.filter((m) => !m.read).length
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const results = useMemo(() => {
    if (!query || query.length < 2) return null
    const q = query.toLowerCase()

    const matchedPatients = patients
      .filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.insurance_id.toLowerCase().includes(q) ||
          p.phone.includes(q)
      )
      .slice(0, 4)

    const matchedClaims = claims
      .filter(
        (c) =>
          c.claim_number.toLowerCase().includes(q) ||
          c.cpt_codes.some((code) => code.includes(q)) ||
          c.icd_codes.some((code) => code.toLowerCase().includes(q))
      )
      .slice(0, 3)

    const total = matchedPatients.length + matchedClaims.length
    if (total === 0) return { patients: [], claims: [], total: 0 }
    return { patients: matchedPatients, claims: matchedClaims, total }
  }, [query])

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-sand bg-white/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6">
      {/* Search */}
      <div ref={searchRef} className="relative w-full max-w-xs lg:max-w-sm ml-10 lg:ml-0">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-cloudy"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder="Search patients, claims, codes..."
          className="w-full pl-10 pr-8 py-2 rounded-xl border border-sand bg-cream/50 text-sm text-warm-800 placeholder:text-cloudy focus:outline-none focus:border-terra/40 focus:ring-1 focus:ring-terra/20 transition"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("")
              setIsOpen(false)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cloudy hover:text-warm-600"
          >
            <X size={14} />
          </button>
        )}

        {/* Search Results Dropdown */}
        {isOpen && results && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-sand shadow-lg overflow-hidden z-50 animate-fade-in">
            {results.total === 0 ? (
              <div className="px-4 py-3 text-xs text-warm-500">
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : (
              <>
                {results.patients.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 bg-cream/50 text-[10px] font-bold text-warm-500 uppercase tracking-wider">
                      Patients
                    </div>
                    {results.patients.map((p) => (
                      <Link
                        key={p.id}
                        href={`/patients/${p.id}`}
                        onClick={() => {
                          setIsOpen(false)
                          setQuery("")
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-cream/50 transition"
                      >
                        <div className="w-7 h-7 rounded-lg bg-terra/5 flex items-center justify-center text-terra text-[9px] font-bold font-serif">
                          {getInitials(p.full_name)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-warm-800">
                            {p.full_name}
                          </p>
                          <p className="text-[10px] text-cloudy">
                            {p.insurance_provider} &middot; {p.insurance_id}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </>
                )}
                {results.claims.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 bg-cream/50 text-[10px] font-bold text-warm-500 uppercase tracking-wider">
                      Claims
                    </div>
                    {results.claims.map((c) => (
                      <Link
                        key={c.id}
                        href="/billing"
                        onClick={() => {
                          setIsOpen(false)
                          setQuery("")
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-cream/50 transition"
                      >
                        <div className="text-xs">
                          <p className="font-semibold text-warm-800">
                            {c.claim_number}
                          </p>
                          <p className="text-[10px] text-cloudy">
                            CPT: {c.cpt_codes.join(", ")} &middot;{" "}
                            <span
                              className={cn(
                                "font-bold uppercase",
                                c.status === "denied"
                                  ? "text-soft-red"
                                  : c.status === "paid"
                                  ? "text-accent"
                                  : "text-warm-500"
                              )}
                            >
                              {c.status}
                            </span>
                          </p>
                        </div>
                      </Link>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Link href="/messages" aria-label="Notifications" className="relative p-2 rounded-xl hover:bg-pampas transition">
          <Bell size={18} className="text-warm-600" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-terra text-white text-[9px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
              {unread}
            </span>
          )}
        </Link>

        {/* User */}
        <div className="flex items-center gap-3 pl-4 border-l border-sand">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-warm-800">
              My Account
            </p>
            <p className="text-[10px] text-cloudy">Patient Portal</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-terra to-terra-dark flex items-center justify-center text-cream text-sm font-bold font-serif">
            <User size={16} />
          </div>
        </div>
      </div>
    </header>
  )
}
