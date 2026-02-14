"use client"

import { Bell, Search, X } from "lucide-react"
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
  WalletDropdownLink,
} from "@coinbase/onchainkit/wallet"
import { Address, Avatar, Name, Identity } from "@coinbase/onchainkit/identity"
import { getMyClaims, getMyMessages } from "@/lib/current-user"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useState, useMemo, useRef, useEffect } from "react"

export default function Topbar() {
  const myMessages = getMyMessages()
  const unread = myMessages.filter((m) => !m.read).length
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const myClaims = getMyClaims()

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

    const matchedClaims = myClaims
      .filter(
        (c) =>
          c.claim_number.toLowerCase().includes(q) ||
          c.cpt_codes.some((code) => code.includes(q)) ||
          c.icd_codes.some((code) => code.toLowerCase().includes(q))
      )
      .slice(0, 5)

    const total = matchedClaims.length
    if (total === 0) return { claims: [], total: 0 }
    return { claims: matchedClaims, total }
  }, [query, myClaims])

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-sand bg-pampas/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6">
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
          placeholder="Search claims, codes..."
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
          <div className="absolute top-full left-0 right-0 mt-1 bg-pampas rounded-xl border border-sand shadow-lg overflow-hidden z-50 animate-fade-in">
            {results.total === 0 ? (
              <div className="px-4 py-3 text-xs text-warm-500">
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : (
              <>
                {results.claims.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 bg-cream/50 text-[10px] font-bold text-warm-500 uppercase tracking-wider">
                      My Claims
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

        {/* Wallet */}
        <div className="pl-4 border-l border-sand">
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
