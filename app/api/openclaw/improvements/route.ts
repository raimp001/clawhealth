import { NextResponse } from "next/server"
import { OPENCLAW_CONFIG } from "@/lib/openclaw/config"

// GET: Return the self-improvement pipeline status
// (Server-side seed data — actual improvements tracked client-side in localStorage)
export async function GET() {
  const now = new Date()

  const improvements = [
    {
      id: "imp-api-001",
      suggestedBy: "devops",
      category: "performance",
      title: "Optimized API response caching",
      status: "deployed",
      votes: 3,
      createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
    },
    {
      id: "imp-api-002",
      suggestedBy: "billing",
      category: "feature",
      title: "Claim error pattern library",
      status: "deployed",
      votes: 4,
      createdAt: new Date(now.getTime() - 14 * 86400000).toISOString(),
    },
    {
      id: "imp-api-003",
      suggestedBy: "rx",
      category: "feature",
      title: "Smart refill coordination",
      status: "deployed",
      votes: 2,
      createdAt: new Date(now.getTime() - 21 * 86400000).toISOString(),
    },
    {
      id: "imp-api-004",
      suggestedBy: "wellness",
      category: "integration",
      title: "USPSTF screening engine v2",
      status: "approved",
      votes: 3,
      createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
    },
    {
      id: "imp-api-005",
      suggestedBy: "coordinator",
      category: "ux",
      title: "Multi-agent conversation threading",
      status: "in_progress",
      votes: 2,
      createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
    },
  ]

  const agentContributions = OPENCLAW_CONFIG.agents.map((agent) => ({
    agentId: agent.id,
    agentName: agent.name,
    suggestionsCount: improvements.filter((i) => i.suggestedBy === agent.id).length,
  }))

  return NextResponse.json({
    improvements,
    metrics: {
      totalSuggested: improvements.length,
      totalDeployed: improvements.filter((i) => i.status === "deployed").length,
      totalInProgress: improvements.filter((i) => i.status === "in_progress").length,
      totalApproved: improvements.filter((i) => i.status === "approved").length,
    },
    agentContributions,
    pipelineActive: true,
    nextCycleAt: new Date(now.getTime() + 3600000).toISOString(),
  })
}
