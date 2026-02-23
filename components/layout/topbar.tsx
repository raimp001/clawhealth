"use client"

import { Bell, Search, X, UserCircle, Sparkles, Pill, Calendar, Receipt, Command } from "lucide-react"
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
  WalletDropdownLink,
} from "@coinbase/onchainkit/wallet"
import { Address, Avatar, Name, Identity } from "@coinbase/onchainkit/identity"
import { useWalletIdentity } from "@/lib/wallet-context"
import { getPatientClaims, getPatientMessages, getPatientPrescriptions, getPatientAppointments, getPhysician } from "@/lib/seed-data"
import { cn, formatDate, formatTime } from "@/lib/utils"
import Link from "next/link"
import { useState, useMemo, useRef, useEffect, useCallback } from "react"

export default function Topbar() {
  const { isConnected, profile, currentPatient, isNewUser } = useWalletIdentity()
  const myMessages = getPatientMessages(currentPatient.id)
  const unread = myMessages.filter((m) => !m.read).length
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const myClaims = getPatientClaims(currentPatient.id)
  const myPrescriptions = getPatientPrescriptions(currentPatient.id)
  const myAppointments = getPatientAppointments(currentPatient.id)

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

  // Keyboard shortcut: "/" or Ctrl+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isEditable = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable
      if ((e.key === "/" && !isEditable) || ((e.ctrlKey || e.metaKey) && e.key === "k")) {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
      if (e.key === "Escape") {
        inputRef.current?.blur()
        setIsOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const results = useMemo(() => {
    if (!query || query.length < 2) return null
    const q = query.toLowerCase()

    const matchedClaims = myClaims
      .filter(
        (c) =>
          c.claim_number.toLowerCase().includes(q) ||
          c.cpt_codes.some((code) => code.includes(q)) ||
          c.icd_codes.some((code) => code.toLowerCase().includes(q))
      )
      .slice(0, 3)

    const matchedRx = myPrescriptions
      .filter(
        (rx) =>
          rx.medication_name.toLowerCase().includes(q) ||
          rx.dosage.toLowerCase().includes(q) ||
          rx.pharmacy.toLowerCase().includes(q)
      )
      .slice(0, 3)

    const matchedApts = myAppointments
      .filter((apt) => {
        const physician = getPhysician(apt.physician_id)
        return (
          apt.reason.toLowerCase().includes(q) ||
          apt.type.toLowerCase().includes(q) ||
          physician?.full_name.toLowerCase().includes(q) ||
          physician?.specialty.toLowerCase().includes(q)
        )
      })
      .slice(0, 3)

    const total = matchedClaims.length + matchedRx.length + matchedApts.length
    if (total === 0) return { claims: [], rx: [], apts: [], total: 0 }
    return { claims: matchedClaims, rx: matchedRx, apts: matchedApts, total }
  }, [query, myClaims, myPrescriptions, myAppointments])

  const closeSearch = useCallback(() => {
    setIsOpen(false)
    setQuery("")
  }, [])

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-sand bg-pampas/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6">
      {/* Search */}
      <div ref={searchRef} className="relative w-full max-w-xs lg:max-w-sm ml-10 lg:ml-0">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-cloudy"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder="Search anything..."
          className="w-full pl-10 pr-16 py-2 rounded-xl border border-sand bg-sand/20 text-sm text-warm-800 placeholder:text-cloudy focus:outline-none focus:border-terra/40 focus:ring-1 focus:ring-terra/20 transition"
        />
        {query ? (
          <button
            onClick={() => {
              setQuery("")
              setIsOpen(false)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cloudy hover:text-warm-600"
          >
            <X size={14} />
          </button>
        ) : (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-0.5 text-[10px] text-cloudy border border-sand/60 rounded px-1 py-0.5 select-none pointer-events-none">
            <Command size={9} /> K
          </span>
        )}

        {/* Search Results Dropdown */}
        {isOpen && results && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-pampas rounded-xl border border-sand shadow-lg overflow-hidden z-50 animate-fade-in max-h-[420px] overflow-y-auto">
            {results.total === 0 ? (
              <div className="px-4 py-3 text-xs text-warm-500">
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : (
              <>
                {results.apts.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 bg-sand/20 text-[10px] font-bold text-warm-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar size={10} /> Appointments
                    </div>
                    {results.apts.map((apt) => {
                      const physician = getPhysician(apt.physician_id)
                      return (
                        <Link
                          key={apt.id}
                          href="/scheduling"
                          onClick={closeSearch}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-sand/30 transition"
                        >
                          <div className="text-xs">
                            <p className="font-semibold text-warm-800">{apt.reason}</p>
                            <p className="text-[10px] text-cloudy">
                              {physician?.full_name} &middot; {formatDate(apt.scheduled_at)} {formatTime(apt.scheduled_at)}
                            </p>
                          </div>
                        </Link>
                      )
                    })}
                  </>
                )}

                {results.rx.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 bg-sand/20 text-[10px] font-bold text-warm-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Pill size={10} /> Medications
                    </div>
                    {results.rx.map((rx) => (
                      <Link
                        key={rx.id}
                        href="/prescriptions"
                        onClick={closeSearch}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-sand/30 transition"
                      >
                        <div className="text-xs">
                          <p className="font-semibold text-warm-800">
                            {rx.medication_name} {rx.dosage}
                          </p>
                          <p className="text-[10px] text-cloudy">
                            {rx.frequency} &middot; {rx.pharmacy} &middot;{" "}
                            <span
                              className={cn(
                                "font-bold uppercase",
                                rx.status === "active" ? "text-accent" : "text-warm-500"
                              )}
                            >
                              {rx.status}
                            </span>
                          </p>
                        </div>
                      </Link>
                    ))}
                  </>
                )}

                {results.claims.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 bg-sand/20 text-[10px] font-bold text-warm-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Receipt size={10} /> Claims
                    </div>
                    {results.claims.map((c) => (
                      <Link
                        key={c.id}
                        href="/billing"
                        onClick={closeSearch}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-sand/30 transition"
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
      <div className="flex items-center gap-3">
        {/* Wallet-linked identity badge */}
        {isConnected && profile && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/5 border border-accent/10">
            <UserCircle size={14} className="text-accent" />
            <span className="text-[10px] font-semibold text-accent">
              {profile.onboardingComplete
                ? profile.fullName || "Profile Active"
                : "Wallet Linked"}
            </span>
          </div>
        )}

        {/* New user nudge */}
        {isConnected && isNewUser && (
          <Link
            href="/onboarding"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-terra/10 border border-terra/20 text-[10px] font-semibold text-terra hover:bg-terra/15 transition animate-fade-in"
          >
            <Sparkles size={10} />
            Complete Setup
          </Link>
        )}

        {/* Notifications */}
        <Link href="/messages" aria-label="Notifications" className="relative p-2 rounded-xl hover:bg-pampas transition">
          <Bell size={18} className="text-warm-600" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-terra text-white text-[9px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
              {unread}
            </span>
          )}
        </Link>

        {/* Wallet */}
        <div className="pl-3 border-l border-sand">
          <Wallet>
            <ConnectWallet className="!bg-terra !text-white !rounded-xl !text-xs !font-semibold !py-2 !px-3 hover:!bg-terra-dark !transition">
              <Avatar className="h-5 w-5" />
              <Name className="text-xs" />
            </ConnectWallet>
            <WalletDropdown className="!bg-pampas !border-sand !rounded-xl">
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                <Avatar />
                <Name className="text-warm-800 font-semibold" />
                <Address className="text-cloudy text-[10px]" />
              </Identity>
              <WalletDropdownLink
                icon="wallet"
                href="/wallet"
                className="!text-warm-700 hover:!bg-sand/50"
              >
                My Wallet
              </WalletDropdownLink>
              <WalletDropdownDisconnect className="!text-soft-red" />
            </WalletDropdown>
          </Wallet>
        </div>
      </div>
    </header>
  )
}
