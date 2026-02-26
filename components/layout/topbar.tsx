"use client"

import { Bell, Search, X, UserCircle, Sparkles, Pill, Calendar, Receipt, Command, type LucideIcon } from "lucide-react"
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
  WalletDropdownLink,
} from "@coinbase/onchainkit/wallet"
import { Address, Avatar, Name, Identity } from "@coinbase/onchainkit/identity"
import { useWalletIdentity } from "@/lib/wallet-context"
import { cn, formatDate, formatTime } from "@/lib/utils"
import Link from "next/link"
import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { useLiveSnapshot } from "@/lib/hooks/use-live-snapshot"

export default function Topbar() {
  const { isConnected, profile, isNewUser } = useWalletIdentity()
  const { snapshot, getPhysician } = useLiveSnapshot()
  const myMessages = snapshot.messages
  const unread = myMessages.filter((m) => !m.read).length
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const myClaims = snapshot.claims
  const myPrescriptions = snapshot.prescriptions
  const myAppointments = snapshot.appointments

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

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
  }, [query, myClaims, myPrescriptions, myAppointments, getPhysician])

  const closeSearch = useCallback(() => {
    setIsOpen(false)
    setQuery("")
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-sand/70 bg-pampas/85 shadow-topbar backdrop-blur-lg">
      <div className="flex h-[72px] items-center justify-between gap-3 px-4 lg:px-8">
        <div ref={searchRef} className="relative ml-10 w-full max-w-xl lg:ml-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cloudy" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => query.length >= 2 && setIsOpen(true)}
            placeholder={'Ask in plain language (e.g. "book cardiology near me next week")'}
            className="w-full rounded-2xl border border-sand/80 bg-cream/80 py-2.5 pl-10 pr-16 text-sm text-warm-800 placeholder:text-cloudy/95 transition focus:border-terra/35 focus:bg-white"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery("")
                setIsOpen(false)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cloudy transition hover:text-warm-700"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-sand/80 bg-pampas px-1.5 py-0.5 text-[10px] text-cloudy lg:flex">
              <Command size={9} />K
            </span>
          )}

          {isOpen && results && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[440px] overflow-y-auto rounded-2xl border border-sand bg-pampas shadow-soft-card animate-fade-in">
              {results.total === 0 ? (
                <div className="px-4 py-3 text-xs text-warm-500">No results for &ldquo;{query}&rdquo;</div>
              ) : (
                <>
                  {results.apts.length > 0 && (
                    <>
                      <div className="flex items-center gap-1.5 border-y border-sand/60 bg-cream/70 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-warm-500">
                        <Calendar size={10} /> Appointments
                      </div>
                      {results.apts.map((apt) => {
                        const physician = getPhysician(apt.physician_id)
                        return (
                          <Link
                            key={apt.id}
                            href="/scheduling"
                            onClick={closeSearch}
                            className="block px-4 py-2.5 transition hover:bg-cream/70"
                          >
                            <p className="text-xs font-semibold text-warm-800">{apt.reason}</p>
                            <p className="text-[11px] text-cloudy">
                              {physician?.full_name} · {formatDate(apt.scheduled_at)} {formatTime(apt.scheduled_at)}
                            </p>
                          </Link>
                        )
                      })}
                    </>
                  )}

                  {results.rx.length > 0 && (
                    <>
                      <div className="flex items-center gap-1.5 border-y border-sand/60 bg-cream/70 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-warm-500">
                        <Pill size={10} /> Medications
                      </div>
                      {results.rx.map((rx) => (
                        <Link
                          key={rx.id}
                          href="/prescriptions"
                          onClick={closeSearch}
                          className="block px-4 py-2.5 transition hover:bg-cream/70"
                        >
                          <p className="text-xs font-semibold text-warm-800">
                            {rx.medication_name} {rx.dosage}
                          </p>
                          <p className="text-[11px] text-cloudy">
                            {rx.frequency} · {rx.pharmacy} ·{" "}
                            <span className={cn("font-bold uppercase", rx.status === "active" ? "text-accent" : "text-warm-500")}>
                              {rx.status}
                            </span>
                          </p>
                        </Link>
                      ))}
                    </>
                  )}

                  {results.claims.length > 0 && (
                    <>
                      <div className="flex items-center gap-1.5 border-y border-sand/60 bg-cream/70 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-warm-500">
                        <Receipt size={10} /> Claims
                      </div>
                      {results.claims.map((c) => (
                        <Link
                          key={c.id}
                          href="/billing"
                          onClick={closeSearch}
                          className="block px-4 py-2.5 transition hover:bg-cream/70"
                        >
                          <p className="text-xs font-semibold text-warm-800">{c.claim_number}</p>
                          <p className="text-[11px] text-cloudy">
                            CPT: {c.cpt_codes.join(", ")} ·{" "}
                            <span
                              className={cn(
                                "font-bold uppercase",
                                c.status === "denied" ? "text-soft-red" : c.status === "paid" ? "text-accent" : "text-warm-500"
                              )}
                            >
                              {c.status}
                            </span>
                          </p>
                        </Link>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-1 rounded-xl border border-sand/70 bg-cream/60 p-1 xl:flex">
          <QuickAction href="/scheduling" icon={Calendar} label="Book" />
          <QuickAction href="/billing" icon={Receipt} label="Bills" />
          <QuickAction href="/prescriptions" icon={Pill} label="Meds" />
        </div>

        <div className="flex items-center gap-2">
          {isConnected && profile && (
            <div className="hidden items-center gap-1.5 rounded-xl border border-accent/20 bg-accent/10 px-2.5 py-1.5 lg:flex">
              <UserCircle size={13} className="text-accent" />
              <span className="text-[11px] font-semibold text-accent">
                {profile.onboardingComplete ? profile.fullName || "Profile Active" : "Wallet Linked"}
              </span>
            </div>
          )}

          {isConnected && isNewUser && (
            <Link
              href="/onboarding"
              className="hidden items-center gap-1.5 rounded-xl border border-terra/25 bg-terra/12 px-3 py-1.5 text-[11px] font-semibold text-terra transition hover:bg-terra/18 lg:flex"
            >
              <Sparkles size={10} /> Complete Setup
            </Link>
          )}

          <Link
            href="/messages"
            aria-label="Notifications"
            className="relative rounded-xl border border-transparent p-2 transition hover:border-sand/80 hover:bg-cream/70"
          >
            <Bell size={18} className="text-warm-600" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-terra px-1 text-[9px] font-bold text-white">
                {unread}
              </span>
            )}
          </Link>

          <div className="border-l border-sand/80 pl-3">
            <Wallet>
              <ConnectWallet className="!rounded-xl !bg-terra !px-3 !py-2 !text-xs !font-semibold !text-white !transition hover:!bg-terra-dark">
                <Avatar className="h-5 w-5" />
                <Name className="text-xs" />
              </ConnectWallet>
              <WalletDropdown className="!rounded-xl !border-sand !bg-pampas">
                <Identity className="px-4 pb-2 pt-3" hasCopyAddressOnClick>
                  <Avatar />
                  <Name className="font-semibold text-warm-800" />
                  <Address className="text-[10px] text-cloudy" />
                </Identity>
                <WalletDropdownLink icon="wallet" href="/wallet" className="!text-warm-700 hover:!bg-sand/40">
                  My Wallet
                </WalletDropdownLink>
                <WalletDropdownDisconnect className="!text-soft-red" />
              </WalletDropdown>
            </Wallet>
          </div>
        </div>
      </div>
    </header>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: LucideIcon
  label: string
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-warm-600 transition hover:bg-pampas hover:text-warm-800"
    >
      <Icon size={12} className="text-terra" />
      {label}
    </Link>
  )
}
