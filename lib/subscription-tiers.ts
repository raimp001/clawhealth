export type OpenRxPlanId = "starter" | "pro" | "team" | "enterprise"

export interface OpenRxPlan {
  id: OpenRxPlanId
  name: string
  monthlyUsdPerSeat: number | null
  description: string
  badges: string[]
  agentSessionsPerMonth: number | "unlimited"
  features: string[]
}

export const OPENRX_PLANS: OpenRxPlan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyUsdPerSeat: 0,
    description: "Core care coordination for individuals getting started.",
    badges: ["Wallet identity", "Natural language search"],
    agentSessionsPerMonth: 200,
    features: [
      "Natural-language provider and pharmacy search",
      "Basic scheduling, messaging, and records views",
      "Core AI agent assistance",
      "Standard support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyUsdPerSeat: 39,
    description: "Higher automation and deeper agent capabilities for active care users.",
    badges: ["Priority model access", "Advanced workflows"],
    agentSessionsPerMonth: 2000,
    features: [
      "Advanced screening and second-opinion workflows",
      "Priority AI queue and faster responses",
      "Compliance ledger tools and export access",
      "Priority support",
    ],
  },
  {
    id: "team",
    name: "Team",
    monthlyUsdPerSeat: 99,
    description: "Operational controls for caregiver teams and organizations.",
    badges: ["Team controls", "Shared governance"],
    agentSessionsPerMonth: "unlimited",
    features: [
      "Shared team workspaces and role controls",
      "Team-level analytics and audit visibility",
      "API integrations and automation webhooks",
      "SLA-backed support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyUsdPerSeat: null,
    description: "Large-scale deployments with security and compliance customization.",
    badges: ["Custom security", "Dedicated success"],
    agentSessionsPerMonth: "unlimited",
    features: [
      "Custom legal/compliance configuration",
      "Dedicated deployment architecture",
      "Advanced identity and access controls",
      "Dedicated support and onboarding",
    ],
  },
]

export function getOpenRxPlan(planId?: string | null): OpenRxPlan {
  return OPENRX_PLANS.find((plan) => plan.id === planId) || OPENRX_PLANS[0]
}
