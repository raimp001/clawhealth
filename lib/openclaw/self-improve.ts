// ── Self-Improvement Engine ────────────────────────────────
// Agents can recursively suggest improvements to the app,
// track improvement history, and report on their status.
// Bolt (DevOps) coordinates the improvement pipeline.

import type { AgentId } from "./config"

export interface Improvement {
  id: string
  suggestedBy: AgentId
  category: "feature" | "bugfix" | "performance" | "ux" | "security" | "integration"
  title: string
  description: string
  priority: "low" | "medium" | "high" | "critical"
  status: "suggested" | "approved" | "in_progress" | "deployed" | "rejected"
  impact: string
  createdAt: string
  resolvedAt?: string
  votes: AgentId[]
}

export interface ImprovementMetrics {
  totalSuggested: number
  totalDeployed: number
  totalRejected: number
  averageResolutionDays: number
  topContributors: { agentId: AgentId; count: number }[]
  recentImprovements: Improvement[]
}

// ── In-memory store (persists to localStorage in browser) ──

const STORAGE_KEY = "openrx:improvements" as const

function loadImprovements(): Improvement[] {
  if (typeof window === "undefined") return getDefaultImprovements()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Improvement[]
  } catch { /* ignore */ }
  return getDefaultImprovements()
}

function persistImprovements(items: Improvement[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

let improvements: Improvement[] = loadImprovements()

function generateId(): string {
  return `imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

/** Suggest a new improvement */
export function suggestImprovement(params: {
  agentId: AgentId
  category: Improvement["category"]
  title: string
  description: string
  priority?: Improvement["priority"]
  impact: string
}): Improvement {
  const improvement: Improvement = {
    id: generateId(),
    suggestedBy: params.agentId,
    category: params.category,
    title: params.title,
    description: params.description,
    priority: params.priority || "medium",
    status: "suggested",
    impact: params.impact,
    createdAt: new Date().toISOString(),
    votes: [params.agentId],
  }

  improvements.push(improvement)
  persistImprovements(improvements)
  return improvement
}

/** Vote for an improvement (agents can endorse each other's suggestions) */
export function voteForImprovement(improvementId: string, agentId: AgentId): boolean {
  const imp = improvements.find((i) => i.id === improvementId)
  if (!imp || imp.votes.includes(agentId)) return false
  imp.votes.push(agentId)
  // Auto-approve if 3+ agents vote for it
  if (imp.votes.length >= 3 && imp.status === "suggested") {
    imp.status = "approved"
  }
  persistImprovements(improvements)
  return true
}

/** Update improvement status (typically by Bolt/DevOps) */
export function updateImprovementStatus(
  improvementId: string,
  status: Improvement["status"]
): Improvement | null {
  const imp = improvements.find((i) => i.id === improvementId)
  if (!imp) return null
  imp.status = status
  if (status === "deployed" || status === "rejected") {
    imp.resolvedAt = new Date().toISOString()
  }
  persistImprovements(improvements)
  return imp
}

/** Get all improvements */
export function getImprovements(filter?: {
  status?: Improvement["status"]
  category?: Improvement["category"]
  agentId?: AgentId
}): Improvement[] {
  let result = [...improvements]
  if (filter?.status) result = result.filter((i) => i.status === filter.status)
  if (filter?.category) result = result.filter((i) => i.category === filter.category)
  if (filter?.agentId) result = result.filter((i) => i.suggestedBy === filter.agentId)
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/** Get improvement metrics */
export function getImprovementMetrics(): ImprovementMetrics {
  const deployed = improvements.filter((i) => i.status === "deployed")
  const rejected = improvements.filter((i) => i.status === "rejected")

  // Calculate average resolution time
  const resolved = [...deployed, ...rejected].filter((i) => i.resolvedAt)
  const avgDays =
    resolved.length > 0
      ? resolved.reduce((sum, i) => {
          const created = new Date(i.createdAt).getTime()
          const resolvedAt = new Date(i.resolvedAt!).getTime()
          return sum + (resolvedAt - created) / 86400000
        }, 0) / resolved.length
      : 0

  // Top contributors
  const counts = new Map<string, number>()
  improvements.forEach((i) => {
    counts.set(i.suggestedBy, (counts.get(i.suggestedBy) || 0) + 1)
  })
  const topContributors = Array.from(counts.entries())
    .map(([agentId, count]) => ({ agentId: agentId as AgentId, count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalSuggested: improvements.length,
    totalDeployed: deployed.length,
    totalRejected: rejected.length,
    averageResolutionDays: Math.round(avgDays * 10) / 10,
    topContributors,
    recentImprovements: improvements.slice(-5).reverse(),
  }
}

/** Agents proactively generate improvements based on usage patterns */
export function runImprovementCycle(): Improvement[] {
  const newSuggestions: Improvement[] = []

  // Maya (Rx) suggests medication-related improvements
  const hasRxImprovement = improvements.some(
    (i) => i.suggestedBy === "rx" && i.status !== "deployed" && i.status !== "rejected"
  )
  if (!hasRxImprovement) {
    newSuggestions.push(
      suggestImprovement({
        agentId: "rx",
        category: "feature",
        title: "Drug interaction database expansion",
        description: "Add comprehensive FDA drug-drug interaction checking with severity levels and alternative suggestions.",
        impact: "Prevents adverse drug events for patients on multiple medications",
      })
    )
  }

  // Vera (Billing) suggests billing improvements
  const hasBillingImprovement = improvements.some(
    (i) => i.suggestedBy === "billing" && i.status !== "deployed" && i.status !== "rejected"
  )
  if (!hasBillingImprovement) {
    newSuggestions.push(
      suggestImprovement({
        agentId: "billing",
        category: "feature",
        title: "Automated denial pattern detection",
        description: "ML-based detection of claim denial patterns to preemptively fix submissions before they get denied.",
        impact: "Reduces claim denials by an estimated 40%",
      })
    )
  }

  // Cal (Scheduling) suggests scheduling improvements
  const hasCalImprovement = improvements.some(
    (i) => i.suggestedBy === "scheduling" && i.status !== "deployed" && i.status !== "rejected"
  )
  if (!hasCalImprovement) {
    newSuggestions.push(
      suggestImprovement({
        agentId: "scheduling",
        category: "ux",
        title: "Smart scheduling with travel time",
        description: "Factor in patient travel time and traffic patterns when suggesting appointment slots.",
        impact: "Reduces no-shows by accounting for commute difficulty",
      })
    )
  }

  // Ivy (Wellness) suggests preventive care improvements
  const hasWellnessImprovement = improvements.some(
    (i) => i.suggestedBy === "wellness" && i.status !== "deployed" && i.status !== "rejected"
  )
  if (!hasWellnessImprovement) {
    newSuggestions.push(
      suggestImprovement({
        agentId: "wellness",
        category: "integration",
        title: "Apple Health / Google Fit sync",
        description: "Real-time sync with patient wearables for continuous vitals monitoring and proactive alerts.",
        impact: "Enables early detection of health changes via continuous monitoring",
      })
    )
  }

  // Bolt (DevOps) suggests infrastructure improvements
  const hasDevOpsImprovement = improvements.some(
    (i) => i.suggestedBy === "devops" && i.status !== "deployed" && i.status !== "rejected"
  )
  if (!hasDevOpsImprovement) {
    newSuggestions.push(
      suggestImprovement({
        agentId: "devops",
        category: "performance",
        title: "Edge caching for drug prices",
        description: "Cache drug pricing API responses at the edge to reduce latency from 800ms to <50ms.",
        impact: "10x faster drug price lookups for patients",
      })
    )
  }

  // Nova (Triage) suggests triage improvements
  const hasTriageImprovement = improvements.some(
    (i) => i.suggestedBy === "triage" && i.status !== "deployed" && i.status !== "rejected"
  )
  if (!hasTriageImprovement) {
    newSuggestions.push(
      suggestImprovement({
        agentId: "triage",
        category: "feature",
        title: "Photo-based symptom assessment",
        description: "Allow patients to upload photos of rashes, wounds, or swelling for visual triage assessment.",
        impact: "More accurate remote triage for visible conditions",
      })
    )
  }

  // Rex (PA) suggests prior auth improvements
  const hasPAImprovement = improvements.some(
    (i) => i.suggestedBy === "prior-auth" && i.status !== "deployed" && i.status !== "rejected"
  )
  if (!hasPAImprovement) {
    newSuggestions.push(
      suggestImprovement({
        agentId: "prior-auth",
        category: "feature",
        title: "Predictive PA requirement detection",
        description: "Predict which orders will need prior auth before the physician submits, pre-filling forms proactively.",
        impact: "Eliminates PA-related delays by starting the process early",
      })
    )
  }

  return newSuggestions
}

// ── Default improvements (seeded) ──────────────────────────

function getDefaultImprovements(): Improvement[] {
  const now = new Date()
  return [
    {
      id: "imp-seed-001",
      suggestedBy: "devops" as AgentId,
      category: "performance",
      title: "Optimized API response caching",
      description: "Added edge caching for NPI registry and pharmacy search APIs to reduce latency.",
      priority: "high",
      status: "deployed",
      impact: "API response times reduced by 60%",
      createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
      resolvedAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
      votes: ["devops" as AgentId, "coordinator" as AgentId, "scheduling" as AgentId],
    },
    {
      id: "imp-seed-002",
      suggestedBy: "billing" as AgentId,
      category: "feature",
      title: "Claim error pattern library",
      description: "Built a library of 50+ common claim submission errors for pre-screening.",
      priority: "high",
      status: "deployed",
      impact: "Catches billing errors before submission, saving patients money",
      createdAt: new Date(now.getTime() - 14 * 86400000).toISOString(),
      resolvedAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
      votes: ["billing" as AgentId, "coordinator" as AgentId, "rx" as AgentId, "prior-auth" as AgentId],
    },
    {
      id: "imp-seed-003",
      suggestedBy: "rx" as AgentId,
      category: "feature",
      title: "Smart refill coordination",
      description: "Proactive refill requests 7 days before medication runs out with pharmacy confirmation.",
      priority: "medium",
      status: "deployed",
      impact: "Patients never miss a refill window",
      createdAt: new Date(now.getTime() - 21 * 86400000).toISOString(),
      resolvedAt: new Date(now.getTime() - 18 * 86400000).toISOString(),
      votes: ["rx" as AgentId, "coordinator" as AgentId],
    },
    {
      id: "imp-seed-004",
      suggestedBy: "wellness" as AgentId,
      category: "integration",
      title: "USPSTF screening engine v2",
      description: "Updated screening recommendations with 2026 USPSTF guidelines and risk-factor weighting.",
      priority: "medium",
      status: "approved",
      impact: "More accurate preventive care recommendations for all age groups",
      createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
      votes: ["wellness" as AgentId, "triage" as AgentId, "coordinator" as AgentId],
    },
    {
      id: "imp-seed-005",
      suggestedBy: "coordinator" as AgentId,
      category: "ux",
      title: "Multi-agent conversation threading",
      description: "Show patients which agents are collaborating on their request with real-time status.",
      priority: "high",
      status: "in_progress",
      impact: "Transparency into how the AI care team works together",
      createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
      votes: ["coordinator" as AgentId, "onboarding" as AgentId],
    },
  ]
}
