// ── Agent Wallet Management ────────────────────────────────
// Utilities for managing agent-controlled wallets on Base.
// Agents get delegated wallets with spending limits and
// restricted permissions for DeFi interactions.

import { AGENT_WALLET_CONFIGS, type AgentWalletConfig, type WalletPermission } from "./config"
import { BASE_APPS, YIELD_OPPORTUNITIES, type YieldOpportunity } from "./base-apps"

// ── Types ──────────────────────────────────────────────────

export interface AgentWallet {
  agentId: string
  address: `0x${string}`
  label: string
  balances: TokenBalance[]
  positions: DeFiPosition[]
  totalValueUsd: number
  totalEarningsUsd: number
  permissions: WalletPermission[]
  config: AgentWalletConfig
}

export interface TokenBalance {
  symbol: string
  name: string
  balance: string
  balanceUsd: number
  address: `0x${string}`
}

export interface DeFiPosition {
  id: string
  appId: string
  appName: string
  opportunityId: string
  name: string
  type: "lending" | "liquidity" | "staking" | "vault" | "rewards"
  depositedTokens: { symbol: string; amount: string }[]
  currentValueUsd: number
  depositedValueUsd: number
  earnedUsd: number
  apy: number
  status: "active" | "pending" | "withdrawn"
  enteredAt: string
}

export interface WalletTransaction {
  id: string
  agentId: string
  type: "deposit" | "withdraw" | "swap" | "earn-deposit" | "earn-withdraw" | "claim-rewards" | "transfer"
  description: string
  tokens: { symbol: string; amount: string; direction: "in" | "out" }[]
  appId?: string
  txHash: `0x${string}`
  status: "confirmed" | "pending" | "failed"
  timestamp: string
  gasUsed: string
  gasCostUsd: number
}

// ── Demo Agent Wallets ─────────────────────────────────────
// Simulated wallet data for demo mode

const DEMO_AGENT_WALLETS: AgentWallet[] = [
  {
    agentId: "defi",
    address: "0x7a3B8c9D2E1F0a4B5C6D7E8F9a0b1C2D3E4F5a6B",
    label: "Knox (DeFi Agent)",
    balances: [
      { symbol: "USDC", name: "USD Coin", balance: "2,450.00", balanceUsd: 2450, address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
      { symbol: "ETH", name: "Ethereum", balance: "0.85", balanceUsd: 2125, address: "0x0000000000000000000000000000000000000000" },
      { symbol: "AERO", name: "Aerodrome", balance: "340.00", balanceUsd: 272, address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631" },
    ],
    positions: [
      {
        id: "pos-1",
        appId: "bankr",
        appName: "Bankr",
        opportunityId: "bankr-auto-earn",
        name: "Bankr Auto-Earn USDC",
        type: "vault",
        depositedTokens: [{ symbol: "USDC", amount: "1,500.00" }],
        currentValueUsd: 1563.40,
        depositedValueUsd: 1500,
        earnedUsd: 63.40,
        apy: 8.4,
        status: "active",
        enteredAt: "2025-12-15T10:30:00Z",
      },
      {
        id: "pos-2",
        appId: "moonwell",
        appName: "Moonwell",
        opportunityId: "moonwell-usdc-supply",
        name: "Moonwell USDC Supply",
        type: "lending",
        depositedTokens: [{ symbol: "USDC", amount: "800.00" }],
        currentValueUsd: 819.20,
        depositedValueUsd: 800,
        earnedUsd: 19.20,
        apy: 4.8,
        status: "active",
        enteredAt: "2026-01-03T14:15:00Z",
      },
      {
        id: "pos-3",
        appId: "aerodrome",
        appName: "Aerodrome",
        opportunityId: "aerodrome-usdc-eth",
        name: "Aerodrome USDC/ETH LP",
        type: "liquidity",
        depositedTokens: [
          { symbol: "USDC", amount: "500.00" },
          { symbol: "ETH", amount: "0.20" },
        ],
        currentValueUsd: 1048.50,
        depositedValueUsd: 1000,
        earnedUsd: 48.50,
        apy: 18.7,
        status: "active",
        enteredAt: "2026-01-20T09:00:00Z",
      },
    ],
    totalValueUsd: 8278.10,
    totalEarningsUsd: 131.10,
    permissions: ["send", "receive", "swap", "stake", "lend", "earn"],
    config: AGENT_WALLET_CONFIGS.find((c) => c.agentId === "defi")!,
  },
  {
    agentId: "billing",
    address: "0x3C4D5E6F7a8B9c0D1e2F3a4B5c6D7E8F9a0B1c2D",
    label: "Vera (Billing)",
    balances: [
      { symbol: "USDC", name: "USD Coin", balance: "320.00", balanceUsd: 320, address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
      { symbol: "ETH", name: "Ethereum", balance: "0.02", balanceUsd: 50, address: "0x0000000000000000000000000000000000000000" },
    ],
    positions: [],
    totalValueUsd: 370,
    totalEarningsUsd: 0,
    permissions: ["send", "receive"],
    config: AGENT_WALLET_CONFIGS.find((c) => c.agentId === "billing")!,
  },
  {
    agentId: "rx",
    address: "0x9a0B1c2D3e4F5a6B7c8D9e0F1a2B3c4D5e6F7a8B",
    label: "Maya (Rx Manager)",
    balances: [
      { symbol: "USDC", name: "USD Coin", balance: "150.00", balanceUsd: 150, address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
      { symbol: "ETH", name: "Ethereum", balance: "0.01", balanceUsd: 25, address: "0x0000000000000000000000000000000000000000" },
    ],
    positions: [],
    totalValueUsd: 175,
    totalEarningsUsd: 0,
    permissions: ["send", "receive"],
    config: AGENT_WALLET_CONFIGS.find((c) => c.agentId === "rx")!,
  },
]

// ── Demo Transaction History ───────────────────────────────

const DEMO_TRANSACTIONS: WalletTransaction[] = [
  {
    id: "tx-1",
    agentId: "defi",
    type: "earn-deposit",
    description: "Knox deposited 1,500 USDC into Bankr Auto-Earn vault",
    tokens: [{ symbol: "USDC", amount: "1,500.00", direction: "out" }],
    appId: "bankr",
    txHash: "0xa1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
    status: "confirmed",
    timestamp: "2025-12-15T10:30:00Z",
    gasUsed: "142,300",
    gasCostUsd: 0.08,
  },
  {
    id: "tx-2",
    agentId: "defi",
    type: "earn-deposit",
    description: "Knox supplied 800 USDC to Moonwell lending pool",
    tokens: [{ symbol: "USDC", amount: "800.00", direction: "out" }],
    appId: "moonwell",
    txHash: "0xb2c3d4e5f67890123456789012345678901234567890abcdef1234567890abcd",
    status: "confirmed",
    timestamp: "2026-01-03T14:15:00Z",
    gasUsed: "198,500",
    gasCostUsd: 0.11,
  },
  {
    id: "tx-3",
    agentId: "defi",
    type: "earn-deposit",
    description: "Knox added liquidity to Aerodrome USDC/ETH pool",
    tokens: [
      { symbol: "USDC", amount: "500.00", direction: "out" },
      { symbol: "ETH", amount: "0.20", direction: "out" },
    ],
    appId: "aerodrome",
    txHash: "0xc3d4e5f678901234567890123456789012345678901234567890abcdef123456",
    status: "confirmed",
    timestamp: "2026-01-20T09:00:00Z",
    gasUsed: "256,800",
    gasCostUsd: 0.14,
  },
  {
    id: "tx-4",
    agentId: "defi",
    type: "claim-rewards",
    description: "Knox claimed 45 AERO rewards from Aerodrome LP",
    tokens: [{ symbol: "AERO", amount: "45.00", direction: "in" }],
    appId: "aerodrome",
    txHash: "0xd4e5f6789012345678901234567890123456789012345678901234567890abcd",
    status: "confirmed",
    timestamp: "2026-02-10T16:45:00Z",
    gasUsed: "89,200",
    gasCostUsd: 0.05,
  },
  {
    id: "tx-5",
    agentId: "billing",
    type: "transfer",
    description: "Vera paid $40 copay for Dr. Chen visit",
    tokens: [{ symbol: "USDC", amount: "40.00", direction: "out" }],
    txHash: "0xe5f67890123456789012345678901234567890123456789012345678901234ef",
    status: "confirmed",
    timestamp: "2026-02-08T11:20:00Z",
    gasUsed: "65,400",
    gasCostUsd: 0.03,
  },
  {
    id: "tx-6",
    agentId: "rx",
    type: "transfer",
    description: "Maya paid $25 prescription refill at CVS",
    tokens: [{ symbol: "USDC", amount: "25.00", direction: "out" }],
    txHash: "0xf678901234567890123456789012345678901234567890123456789012345678",
    status: "confirmed",
    timestamp: "2026-02-12T09:10:00Z",
    gasUsed: "65,100",
    gasCostUsd: 0.03,
  },
  {
    id: "tx-7",
    agentId: "defi",
    type: "swap",
    description: "Knox swapped 200 USDC for 0.08 ETH on Aerodrome",
    tokens: [
      { symbol: "USDC", amount: "200.00", direction: "out" },
      { symbol: "ETH", amount: "0.08", direction: "in" },
    ],
    appId: "aerodrome",
    txHash: "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    status: "confirmed",
    timestamp: "2026-02-14T13:30:00Z",
    gasUsed: "145,600",
    gasCostUsd: 0.07,
  },
]

// ── Public API ─────────────────────────────────────────────

export function getAgentWallets(): AgentWallet[] {
  return DEMO_AGENT_WALLETS
}

export function getAgentWallet(agentId: string): AgentWallet | undefined {
  return DEMO_AGENT_WALLETS.find((w) => w.agentId === agentId)
}

export function getWalletTransactions(agentId?: string): WalletTransaction[] {
  if (agentId) return DEMO_TRANSACTIONS.filter((t) => t.agentId === agentId)
  return DEMO_TRANSACTIONS
}

export function getTotalPortfolioValue(): number {
  return DEMO_AGENT_WALLETS.reduce((sum, w) => sum + w.totalValueUsd, 0)
}

export function getTotalEarnings(): number {
  return DEMO_AGENT_WALLETS.reduce((sum, w) => sum + w.totalEarningsUsd, 0)
}

export function getActivePositions(): DeFiPosition[] {
  return DEMO_AGENT_WALLETS.flatMap((w) => w.positions).filter((p) => p.status === "active")
}

export function canAgentPerform(agentId: string, permission: WalletPermission): boolean {
  const config = AGENT_WALLET_CONFIGS.find((c) => c.agentId === agentId)
  return config?.permissions.includes(permission) ?? false
}

export function canAgentUseApp(agentId: string, appId: string): boolean {
  const config = AGENT_WALLET_CONFIGS.find((c) => c.agentId === agentId)
  return config?.allowedApps.includes(appId) ?? false
}

export function getRecommendedStrategies(riskTolerance: "conservative" | "balanced" | "aggressive"): YieldOpportunity[] {
  const riskMap = {
    conservative: ["low"],
    balanced: ["low", "medium"],
    aggressive: ["low", "medium", "high"],
  }
  const allowedRisks = riskMap[riskTolerance]
  return YIELD_OPPORTUNITIES.filter((o) => allowedRisks.includes(o.riskLevel))
    .sort((a, b) => b.apy - a.apy)
}
