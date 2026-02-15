import { NextResponse } from "next/server"
import {
  getAgentWallets,
  getTotalPortfolioValue,
  getTotalEarnings,
  getActivePositions,
  getWalletTransactions,
} from "@/lib/wallet/agent-wallet"
import { BASE_APPS, YIELD_OPPORTUNITIES } from "@/lib/wallet/base-apps"

// GET /api/wallet — Returns full wallet overview
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const view = searchParams.get("view") // "overview" | "positions" | "transactions" | "opportunities" | "apps"
  const agentId = searchParams.get("agentId")

  switch (view) {
    case "positions":
      return NextResponse.json({
        positions: getActivePositions(),
      })

    case "transactions":
      return NextResponse.json({
        transactions: getWalletTransactions(agentId || undefined),
      })

    case "opportunities":
      const risk = searchParams.get("risk") as "low" | "medium" | "high" | null
      const token = searchParams.get("token")
      let opportunities = YIELD_OPPORTUNITIES
      if (risk) opportunities = opportunities.filter((o) => o.riskLevel === risk)
      if (token) opportunities = opportunities.filter((o) => o.tokenIn.includes(token))
      return NextResponse.json({ opportunities })

    case "apps":
      return NextResponse.json({ apps: BASE_APPS })

    default:
      // Full overview
      return NextResponse.json({
        wallets: getAgentWallets(),
        totalPortfolioValue: getTotalPortfolioValue(),
        totalEarnings: getTotalEarnings(),
        activePositions: getActivePositions(),
        recentTransactions: getWalletTransactions().slice(0, 10),
        availableApps: BASE_APPS.length,
        availableOpportunities: YIELD_OPPORTUNITIES.length,
      })
  }
}
