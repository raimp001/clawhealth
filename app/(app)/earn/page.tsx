"use client"

import { cn } from "@/lib/utils"
import {
  TrendingUp,
  Shield,
  Zap,
  ExternalLink,
  Bot,
  ArrowUpRight,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  BarChart3,
  Layers,
  Coins,
} from "lucide-react"
import { useAccount } from "wagmi"
import { useState } from "react"
import {
  BASE_APPS,
  YIELD_OPPORTUNITIES,
  type YieldOpportunity,
} from "@/lib/wallet/base-apps"
import {
  getAgentWallets,
  getActivePositions,
  getTotalEarnings,
  getTotalPortfolioValue,
  getWalletTransactions,
} from "@/lib/wallet/agent-wallet"

type RiskFilter = "all" | "low" | "medium" | "high"
type Tab = "opportunities" | "positions" | "apps"

export default function EarnPage() {
  const { isConnected } = useAccount()
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all")
  const [activeTab, setActiveTab] = useState<Tab>("opportunities")

  const agentWallets = getAgentWallets()
  const defiWallet = agentWallets.find((w) => w.agentId === "defi")
  const activePositions = getActivePositions()
  const totalEarnings = getTotalEarnings()
  const totalPortfolio = getTotalPortfolioValue()
  const recentTxns = getWalletTransactions("defi").slice(0, 5)

  const filteredOpportunities =
    riskFilter === "all"
      ? YIELD_OPPORTUNITIES
      : YIELD_OPPORTUNITIES.filter((o) => o.riskLevel === riskFilter)

  return (
    <div className="animate-slide-up space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-serif text-warm-800">Earn</h1>
        <p className="text-sm text-warm-500 mt-1">
          AI agents earn yield on your idle funds across Base DeFi protocols
        </p>
      </div>

      {!isConnected ? (
        <div className="bg-pampas rounded-2xl border border-sand p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-terra/10 flex items-center justify-center mx-auto mb-4">
            <TrendingUp size={28} className="text-terra" />
          </div>
          <h3 className="text-lg font-serif text-warm-800">
            Connect Wallet to Start Earning
          </h3>
          <p className="text-sm text-warm-500 mt-2 max-w-md mx-auto">
            Connect your Coinbase Smart Wallet and let Knox (your DeFi agent)
            put your idle healthcare funds to work on Base.
          </p>
          <p className="text-xs text-cloudy mt-4">
            Use the &ldquo;Connect&rdquo; button in the top right corner.
          </p>
        </div>
      ) : (
        <>
          {/* Portfolio Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-pampas rounded-2xl border border-sand p-4">
              <p className="text-[10px] font-bold text-cloudy uppercase tracking-wider">
                Total Portfolio
              </p>
              <p className="text-lg font-bold text-warm-800 mt-1">
                ${totalPortfolio.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-pampas rounded-2xl border border-sand p-4">
              <p className="text-[10px] font-bold text-cloudy uppercase tracking-wider">
                Total Earned
              </p>
              <p className="text-lg font-bold text-accent mt-1">
                +${totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-pampas rounded-2xl border border-sand p-4">
              <p className="text-[10px] font-bold text-cloudy uppercase tracking-wider">
                Active Positions
              </p>
              <p className="text-lg font-bold text-warm-800 mt-1">
                {activePositions.length}
              </p>
            </div>
            <div className="bg-pampas rounded-2xl border border-sand p-4">
              <p className="text-[10px] font-bold text-cloudy uppercase tracking-wider">
                Managed By
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <Bot size={16} className="text-terra" />
                <p className="text-sm font-bold text-warm-800">Knox</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-pampas rounded-xl border border-sand p-1">
            {(
              [
                { id: "opportunities", label: "Yield Opportunities", icon: TrendingUp },
                { id: "positions", label: "Active Positions", icon: Layers },
                { id: "apps", label: "Base Apps", icon: Coins },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition",
                  activeTab === tab.id
                    ? "bg-terra text-white"
                    : "text-warm-600 hover:text-warm-800"
                )}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Yield Opportunities */}
          {activeTab === "opportunities" && (
            <div className="space-y-4">
              {/* Risk Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-warm-500">Risk:</span>
                {(["all", "low", "medium", "high"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRiskFilter(r)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[11px] font-semibold transition",
                      riskFilter === r
                        ? "bg-terra text-white"
                        : "bg-sand/50 text-warm-600 hover:bg-sand"
                    )}
                  >
                    {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>

              {/* Opportunities Grid */}
              <div className="space-y-3">
                {filteredOpportunities.map((opp) => (
                  <OpportunityCard key={opp.id} opportunity={opp} />
                ))}
              </div>
            </div>
          )}

          {/* Tab: Active Positions */}
          {activeTab === "positions" && (
            <div className="space-y-3">
              {activePositions.length === 0 ? (
                <div className="bg-pampas rounded-2xl border border-sand p-8 text-center">
                  <p className="text-sm text-warm-500">
                    No active positions yet. Knox will find the best
                    opportunities for your funds.
                  </p>
                </div>
              ) : (
                activePositions.map((pos) => (
                  <div
                    key={pos.id}
                    className="bg-pampas rounded-2xl border border-sand p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-warm-800">
                            {pos.name}
                          </h3>
                          <span
                            className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                              pos.type === "vault"
                                ? "bg-terra/10 text-terra"
                                : pos.type === "lending"
                                ? "bg-accent/10 text-accent"
                                : "bg-soft-blue/10 text-soft-blue"
                            )}
                          >
                            {pos.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-cloudy mt-0.5">
                          via {pos.appName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-warm-800">
                          ${pos.currentValueUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] font-semibold text-accent">
                          +${pos.earnedUsd.toFixed(2)} earned
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[10px]">
                      <span className="text-warm-500">
                        Deposited:{" "}
                        {pos.depositedTokens
                          .map((t) => `${t.amount} ${t.symbol}`)
                          .join(" + ")}
                      </span>
                      <span className="text-warm-500">
                        APY:{" "}
                        <span className="font-bold text-accent">
                          {pos.apy}%
                        </span>
                      </span>
                      <span className="text-warm-500">
                        Since{" "}
                        {new Date(pos.enteredAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}

              {/* Recent Transactions */}
              {recentTxns.length > 0 && (
                <div className="bg-pampas rounded-2xl border border-sand p-5 mt-4">
                  <h3 className="text-sm font-bold text-warm-800 mb-3">
                    Recent Agent Transactions
                  </h3>
                  <div className="space-y-2">
                    {recentTxns.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between py-2 border-b border-sand/50 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center",
                              tx.type === "earn-deposit"
                                ? "bg-accent/10"
                                : tx.type === "claim-rewards"
                                ? "bg-terra/10"
                                : "bg-sand/50"
                            )}
                          >
                            {tx.type === "earn-deposit" ? (
                              <ArrowUpRight size={12} className="text-accent" />
                            ) : tx.type === "claim-rewards" ? (
                              <DollarSign size={12} className="text-terra" />
                            ) : (
                              <Zap size={12} className="text-warm-500" />
                            )}
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-warm-800">
                              {tx.description}
                            </p>
                            <p className="text-[9px] text-cloudy">
                              {new Date(tx.timestamp).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                }
                              )}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`https://basescan.org/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-terra hover:underline flex items-center gap-0.5"
                        >
                          View <ExternalLink size={8} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Base Apps */}
          {activeTab === "apps" && (
            <div className="space-y-3">
              {BASE_APPS.map((app) => (
                <div
                  key={app.id}
                  className="bg-pampas rounded-2xl border border-sand p-5"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          app.category === "earn"
                            ? "bg-terra/10"
                            : app.category === "lend"
                            ? "bg-accent/10"
                            : app.category === "swap"
                            ? "bg-soft-blue/10"
                            : "bg-sand/50"
                        )}
                      >
                        {app.category === "earn" ? (
                          <TrendingUp size={18} className="text-terra" />
                        ) : app.category === "lend" ? (
                          <BarChart3 size={18} className="text-accent" />
                        ) : (
                          <Zap size={18} className="text-soft-blue" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-warm-800">
                            {app.name}
                          </h3>
                          {app.audited && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-accent">
                              <CheckCircle2 size={10} /> Audited
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                              app.category === "earn"
                                ? "bg-terra/10 text-terra"
                                : app.category === "lend"
                                ? "bg-accent/10 text-accent"
                                : "bg-soft-blue/10 text-soft-blue"
                            )}
                          >
                            {app.category}
                          </span>
                          <span
                            className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                              app.riskLevel === "low"
                                ? "bg-accent/10 text-accent"
                                : app.riskLevel === "medium"
                                ? "bg-terra/10 text-terra"
                                : "bg-soft-red/10 text-soft-red"
                            )}
                          >
                            {app.riskLevel} risk
                          </span>
                          {app.agentCompatible && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-warm-500">
                              <Bot size={10} /> Agent Ready
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-terra hover:underline flex items-center gap-1"
                    >
                      Open <ExternalLink size={12} />
                    </a>
                  </div>
                  <p className="text-xs text-warm-500 mt-2">{app.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {app.supportedActions.map((action) => (
                      <span
                        key={action}
                        className="text-[9px] font-semibold text-warm-600 bg-sand/50 px-2 py-0.5 rounded-full"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* How Knox Earns */}
          <div className="bg-terra/5 rounded-2xl border border-terra/10 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bot size={16} className="text-terra" />
              <h3 className="text-sm font-bold text-warm-800">
                How Knox Earns for You
              </h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              {[
                {
                  step: "1",
                  title: "Evaluate",
                  desc: "Knox scans Base DeFi protocols for the best risk-adjusted yields.",
                },
                {
                  step: "2",
                  title: "Allocate",
                  desc: "Idle healthcare funds are allocated across vetted protocols like Bankr and Moonwell.",
                },
                {
                  step: "3",
                  title: "Compound",
                  desc: "Rewards are auto-claimed and reinvested for compound growth.",
                },
                {
                  step: "4",
                  title: "Protect",
                  desc: "Stop-losses trigger at -10%. Funds for upcoming payments are never risked.",
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

// ── Opportunity Card Component ─────────────────────────────

function OpportunityCard({ opportunity }: { opportunity: YieldOpportunity }) {
  const app = BASE_APPS.find((a) => a.id === opportunity.appId)
  return (
    <div className="bg-pampas rounded-2xl border border-sand p-5 hover:border-terra/20 transition">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-warm-800">
              {opportunity.name}
            </h3>
            <span
              className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                opportunity.riskLevel === "low"
                  ? "bg-accent/10 text-accent"
                  : opportunity.riskLevel === "medium"
                  ? "bg-terra/10 text-terra"
                  : "bg-soft-red/10 text-soft-red"
              )}
            >
              {opportunity.riskLevel}
            </span>
          </div>
          <p className="text-[10px] text-cloudy mt-0.5">
            via {app?.name} &middot; {opportunity.type}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-accent">{opportunity.apy}%</p>
          <p className="text-[9px] text-cloudy">APY</p>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-warm-500">
        <span>
          Tokens: {opportunity.tokenIn.join(" + ")}
        </span>
        <span>TVL: {opportunity.tvl}</span>
        <span>
          Min: ${opportunity.minDeposit}
        </span>
        {opportunity.autoCompound && (
          <span className="flex items-center gap-0.5 text-accent font-semibold">
            <Zap size={9} /> Auto-compound
          </span>
        )}
        {opportunity.lockPeriod === null && (
          <span className="text-warm-400">No lock</span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[9px] text-warm-400">
          Rewards: {opportunity.tokenReward.join(", ")}
        </span>
      </div>
    </div>
  )
}
