"use client"

import { cn } from "@/lib/utils"
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  ExternalLink,
  Bot,
  Shield,
  Zap,
  DollarSign,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Layers,
} from "lucide-react"
import { useAccount } from "wagmi"
import { PLATFORM_WALLET, DEVELOPER_WALLET } from "@/app/providers"
import { useState } from "react"
import Link from "next/link"
import {
  getAgentWallets,
  getActivePositions,
  getTotalEarnings,
  getTotalPortfolioValue,
} from "@/lib/wallet/agent-wallet"

export default function WalletPage() {
  const { address, isConnected } = useAccount()
  const [copied, setCopied] = useState(false)

  const agentWallets = getAgentWallets()
  const totalEarnings = getTotalEarnings()
  const totalPortfolio = getTotalPortfolioValue()
  const activePositions = getActivePositions()

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="animate-slide-up space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-serif text-warm-800">My Wallet</h1>
        <p className="text-sm text-warm-500 mt-1">
          Manage funds, payments, and agent transactions on Base
        </p>
      </div>

      {!isConnected ? (
        <div className="bg-pampas rounded-2xl border border-sand p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-terra/10 flex items-center justify-center mx-auto mb-4">
            <WalletIcon size={28} className="text-terra" />
          </div>
          <h3 className="text-lg font-serif text-warm-800">
            Connect Your Wallet
          </h3>
          <p className="text-sm text-warm-500 mt-2 max-w-md mx-auto">
            Connect your Coinbase Smart Wallet to manage payments,
            fund your account, and enable AI agent transactions on Base.
          </p>
          <p className="text-xs text-cloudy mt-4">
            Use the &ldquo;Connect&rdquo; button in the top right corner.
          </p>
        </div>
      ) : (
        <>
          {/* Wallet Overview */}
          <div className="bg-pampas rounded-2xl border border-sand p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-terra/10 flex items-center justify-center">
                  <WalletIcon size={20} className="text-terra" />
                </div>
                <div>
                  <p className="text-sm font-bold text-warm-800">Connected Wallet</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cloudy">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                    <button
                      onClick={copyAddress}
                      aria-label="Copy address"
                      className="text-cloudy hover:text-terra transition"
                    >
                      {copied ? (
                        <CheckCircle2 size={12} className="text-accent" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                    <a
                      href={`https://basescan.org/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cloudy hover:text-terra transition"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-[10px] font-semibold text-accent">
                  Base Network
                </span>
              </div>
            </div>

            {/* Fund Button */}
            <div className="mt-4">
              <a
                href="https://www.coinbase.com/onramp"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-3 bg-terra text-white rounded-xl text-sm font-semibold hover:bg-terra-dark transition"
              >
                Fund Wallet
              </a>
            </div>
          </div>

          {/* Earnings Summary — links to Earn page */}
          <div className="bg-accent/5 rounded-2xl border border-accent/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-accent" />
                <h3 className="text-sm font-bold text-warm-800">
                  DeFi Earnings
                </h3>
              </div>
              <Link
                href="/earn"
                className="text-xs text-terra font-semibold hover:underline flex items-center gap-1"
              >
                View All <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] font-bold text-cloudy uppercase tracking-wider">
                  Portfolio
                </p>
                <p className="text-sm font-bold text-warm-800">
                  ${totalPortfolio.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-cloudy uppercase tracking-wider">
                  Earned
                </p>
                <p className="text-sm font-bold text-accent">
                  +${totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-cloudy uppercase tracking-wider">
                  Positions
                </p>
                <p className="text-sm font-bold text-warm-800">
                  {activePositions.length} active
                </p>
              </div>
            </div>
          </div>

          {/* Agent Wallets */}
          <div className="bg-pampas rounded-2xl border border-sand p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bot size={16} className="text-terra" />
              <h3 className="text-sm font-bold text-warm-800">
                Agent Wallets
              </h3>
            </div>
            <div className="space-y-3">
              {agentWallets.map((wallet) => (
                <div
                  key={wallet.agentId}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-sand/30 border border-sand"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        wallet.agentId === "defi"
                          ? "bg-terra/10"
                          : wallet.agentId === "billing"
                          ? "bg-accent/10"
                          : "bg-soft-blue/10"
                      )}
                    >
                      {wallet.agentId === "defi" ? (
                        <TrendingUp size={14} className="text-terra" />
                      ) : wallet.agentId === "billing" ? (
                        <BarChart3 size={14} className="text-accent" />
                      ) : (
                        <Layers size={14} className="text-soft-blue" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-warm-800">
                        {wallet.label}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-cloudy">
                          {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                        </span>
                        <div className="flex gap-1">
                          {wallet.permissions.slice(0, 3).map((p) => (
                            <span
                              key={p}
                              className="text-[8px] font-bold text-warm-400 bg-sand/50 px-1 py-0.5 rounded"
                            >
                              {p}
                            </span>
                          ))}
                          {wallet.permissions.length > 3 && (
                            <span className="text-[8px] text-warm-400">
                              +{wallet.permissions.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-warm-800">
                      ${wallet.totalValueUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    {wallet.totalEarningsUsd > 0 && (
                      <p className="text-[9px] font-semibold text-accent">
                        +${wallet.totalEarningsUsd.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pay for Services */}
            <div className="bg-pampas rounded-2xl border border-sand p-5">
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpRight size={16} className="text-terra" />
                <h3 className="text-sm font-bold text-warm-800">
                  Pay for Healthcare
                </h3>
              </div>
              <p className="text-xs text-warm-500 mb-4">
                Pay copays, lab fees, and services directly in USDC on Base.
                No bank middlemen, instant settlement.
              </p>
              <div className="space-y-2">
                {[
                  { label: "Pay Copay ($40)", amount: "40" },
                  { label: "Lab Work ($85)", amount: "85" },
                  { label: "Prescription ($25)", amount: "25" },
                ].map((item) => (
                  <button
                    key={item.label}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-sand/50 border border-sand text-xs font-semibold text-warm-800 hover:border-terra/30 transition"
                  >
                    <span>{item.label}</span>
                    <span className="text-terra">${item.amount} USDC</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Agent Payments */}
            <div className="bg-pampas rounded-2xl border border-sand p-5">
              <div className="flex items-center gap-2 mb-3">
                <Bot size={16} className="text-terra" />
                <h3 className="text-sm font-bold text-warm-800">
                  AI Agent Payments
                </h3>
              </div>
              <p className="text-xs text-warm-500 mb-4">
                AI agents can use your wallet (with approval) for automated
                payments — refill prescriptions, pay copays, settle bills.
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-accent/5 border border-accent/10">
                  <div>
                    <span className="text-xs font-semibold text-warm-800">
                      Agent Auto-Pay
                    </span>
                    <p className="text-[10px] text-warm-500">
                      Allow AI to pay copays under $50
                    </p>
                  </div>
                  <div className="w-10 h-5 bg-accent rounded-full relative cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-sand/50 border border-sand">
                  <div>
                    <span className="text-xs font-semibold text-warm-800">
                      Agent Rx Payments
                    </span>
                    <p className="text-[10px] text-warm-500">
                      Auto-pay prescription refills
                    </p>
                  </div>
                  <div className="w-10 h-5 bg-sand rounded-full relative cursor-pointer">
                    <div className="w-4 h-4 bg-cloudy rounded-full absolute left-0.5 top-0.5" />
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-accent/5 border border-accent/10">
                  <div>
                    <span className="text-xs font-semibold text-warm-800">
                      Knox DeFi Earning
                    </span>
                    <p className="text-[10px] text-warm-500">
                      Allow Knox to deploy idle funds to earn yield
                    </p>
                  </div>
                  <div className="w-10 h-5 bg-accent rounded-full relative cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Wallet Info */}
          <div className="bg-pampas rounded-2xl border border-sand p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} className="text-terra" />
              <h3 className="text-sm font-bold text-warm-800">
                OpenRx Platform
              </h3>
            </div>
            <p className="text-xs text-warm-500 mb-3">
              Platform fees and agent development payments are collected on Base.
              Transparent, onchain, verifiable.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-sand/50 border border-sand">
                <span className="text-xs text-warm-600">Platform Wallet</span>
                <a
                  href={`https://basescan.org/address/${PLATFORM_WALLET}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-terra flex items-center gap-1 hover:underline"
                >
                  {PLATFORM_WALLET.slice(0, 8)}...{PLATFORM_WALLET.slice(-6)}
                  <ExternalLink size={10} />
                </a>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-sand/50 border border-sand">
                <span className="text-xs text-warm-600">Developer Wallet</span>
                <a
                  href={`https://basescan.org/address/${DEVELOPER_WALLET}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-terra flex items-center gap-1 hover:underline"
                >
                  {DEVELOPER_WALLET.slice(0, 8)}...{DEVELOPER_WALLET.slice(-6)}
                  <ExternalLink size={10} />
                </a>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-sand/50 border border-sand">
                <span className="text-xs text-warm-600">Network</span>
                <span className="text-[10px] font-semibold text-accent">
                  Base (L2)
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-sand/50 border border-sand">
                <span className="text-xs text-warm-600">Currency</span>
                <span className="text-[10px] font-semibold text-warm-800">
                  USDC / ETH
                </span>
              </div>
            </div>
          </div>

          {/* How Agent Payments Work */}
          <div className="bg-terra/5 rounded-2xl border border-terra/10 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-terra" />
              <h3 className="text-sm font-bold text-warm-800">
                How Agent Payments Work
              </h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {[
                {
                  step: "1",
                  title: "Agents Request",
                  desc: "AI agents (Maya, Cal, Vera, Knox) identify a payment or earning opportunity.",
                },
                {
                  step: "2",
                  title: "You Approve",
                  desc: "Payments under your threshold auto-execute. Larger ones require your wallet signature.",
                },
                {
                  step: "3",
                  title: "Settled on Base",
                  desc: "USDC payment settles in seconds on Base. No banks, no chargebacks, full transparency.",
                },
              ].map((s) => (
                <div key={s.step} className="text-center">
                  <div className="w-8 h-8 rounded-full bg-terra/10 flex items-center justify-center mx-auto mb-2 text-xs font-bold text-terra">
                    {s.step}
                  </div>
                  <p className="text-xs font-bold text-warm-800">{s.title}</p>
                  <p className="text-[10px] text-warm-500 mt-1">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
