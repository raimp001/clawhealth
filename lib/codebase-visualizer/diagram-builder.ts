import type {
  DiagramEdge,
  DiagramNode,
  DiagramPayload,
  DiagramType,
  VisualizerFocusArea,
  VisualizerRepositoryModel,
} from "@/lib/codebase-visualizer/types"

function nodeStyle(kind: "core" | "service" | "data" | "external" = "core"): Record<string, string> {
  if (kind === "service") return { background: "#162520", border: "1px solid #2b7d66", color: "#d2fff0" }
  if (kind === "data") return { background: "#1d1f2d", border: "1px solid #4f5fbd", color: "#e4e9ff" }
  if (kind === "external") return { background: "#2a1f17", border: "1px solid #a0623a", color: "#ffe8d8" }
  return { background: "#1b1f25", border: "1px solid #3f4a57", color: "#f0f6ff" }
}

function layoutNodes<T extends { id: string; label: string; insight: string; filePath?: string; snippet?: string; kind?: "core" | "service" | "data" | "external" }>(
  items: T[],
  options?: { columns?: number; xGap?: number; yGap?: number }
): DiagramNode[] {
  const columns = options?.columns || 4
  const xGap = options?.xGap || 280
  const yGap = options?.yGap || 170

  return items.map((item, index) => ({
    id: item.id,
    position: {
      x: (index % columns) * xGap,
      y: Math.floor(index / columns) * yGap,
    },
    data: {
      label: item.label,
      insight: item.insight,
      filePath: item.filePath,
      snippet: item.snippet,
    },
    style: nodeStyle(item.kind || "core"),
  }))
}

function edgesFromPairs(pairs: Array<{ source: string; target: string; label?: string }>): DiagramEdge[] {
  return pairs.map((pair, index) => ({
    id: `e-${index}-${pair.source}-${pair.target}`,
    source: pair.source,
    target: pair.target,
    label: pair.label,
    animated: false,
    markerEnd: { type: "arrowclosed" },
    style: { stroke: "#8aa3bd", strokeWidth: 1.3 },
  }))
}

function titleFor(type: DiagramType): string {
  switch (type) {
    case "architecture":
      return "High-level Architecture"
    case "agent_interaction":
      return "Agent Interaction Graph"
    case "communication_flow":
      return "Communication Flowchart"
    case "deployment_pipeline":
      return "Deployment Pipeline"
    case "file_dependency":
      return "File & Dependency Graph"
    case "data_flow":
      return "Data Flow"
    case "call_graph_hotspots":
      return "Call Graph Hotspots"
    case "security_posture":
      return "Security Posture Map"
  }
}

function describe(type: DiagramType): string {
  switch (type) {
    case "architecture":
      return "Core component hierarchy and cross-module boundaries."
    case "agent_interaction":
      return "Directed communication between agents/services with protocol hints."
    case "communication_flow":
      return "API, event, and async communication flow across major paths."
    case "deployment_pipeline":
      return "Build, test, deploy, and runtime environment flow."
    case "file_dependency":
      return "Zoomable file import/dependency graph by impact and fan-in/fan-out."
    case "data_flow":
      return "How data moves between request surfaces, services, and storage."
    case "call_graph_hotspots":
      return "Likely high-churn and high-fanout call graph hotspots."
    case "security_posture":
      return "Trust boundaries, auth surfaces, and sensitive-data touch points."
  }
}

function mermaidFromFlow(nodes: DiagramNode[], edges: DiagramEdge[], direction: "LR" | "TD" = "LR"): string {
  const lines = [`flowchart ${direction}`]
  nodes.forEach((node) => {
    const safeLabel = node.data.label.replace(/"/g, "'")
    lines.push(`  ${node.id}["${safeLabel}"]`)
  })
  edges.forEach((edge) => {
    const label = edge.label ? `|${edge.label.replace(/\|/g, "/")}|` : ""
    lines.push(`  ${edge.source} -->${label} ${edge.target}`)
  })
  return lines.join("\n")
}

function architectureDiagram(model: VisualizerRepositoryModel): DiagramPayload {
  const nodes = layoutNodes(
    model.topLevelModules
      .slice(0, 24)
      .map((module) => ({
        id: `mod-${module.name.replace(/[^a-z0-9]/gi, "-")}`,
        label: `${module.name} (${module.fileCount})`,
        insight: `${module.fileCount} files mapped in this module.`,
        filePath: module.sampleFile,
        snippet: module.sampleFile ? model.files.find((file) => file.path === module.sampleFile)?.snippet : undefined,
      })),
    { columns: 4 }
  )

  const edges = edgesFromPairs(
    model.files
      .flatMap((file) =>
        file.imports
          .filter((target) => target.startsWith("@/") || target.startsWith("./") || target.startsWith("../"))
          .map((target) => {
            const fromModule = file.path.split("/")[0] || "root"
            const normalized = target
              .replace(/^@\//, "")
              .replace(/^\.\//, "")
              .replace(/^\.\.\//, "")
            const toModule = normalized.split("/")[0] || "root"
            return {
              source: `mod-${fromModule.replace(/[^a-z0-9]/gi, "-")}`,
              target: `mod-${toModule.replace(/[^a-z0-9]/gi, "-")}`,
            }
          })
      )
      .filter((edge) => edge.source !== edge.target)
      .slice(0, 80)
  )

  return {
    id: "architecture",
    type: "architecture",
    title: titleFor("architecture"),
    description: describe("architecture"),
    mermaid: mermaidFromFlow(nodes, edges, "LR"),
    reactFlowData: { nodes, edges },
    insights: [
      `${model.topLevelModules.length} top-level modules detected.`,
      `${model.files.length} source/config files contributed to this map.`,
      "Use node drill-down to inspect representative snippets by module.",
    ],
  }
}

function agentDiagram(model: VisualizerRepositoryModel): DiagramPayload {
  const links = model.agentLinks
  const uniqueAgents = Array.from(new Set(links.flatMap((link) => [link.source, link.target])))

  const nodes = layoutNodes(
    uniqueAgents.map((agent) => ({
      id: `agent-${agent}`,
      label: agent,
      insight: "Specialized agent role in orchestration graph.",
      kind: "service" as const,
      filePath: "lib/openclaw/config.ts",
      snippet: model.files.find((file) => file.path.includes("openclaw/config.ts"))?.snippet,
    })),
    { columns: 5, xGap: 240, yGap: 140 }
  )

  const edges = edgesFromPairs(
    links.map((link) => ({
      source: `agent-${link.source}`,
      target: `agent-${link.target}`,
      label: link.protocol,
    }))
  )

  const fallbackNodes =
    nodes.length > 0
      ? nodes
      : layoutNodes(
          [
            { id: "agent-coordinator", label: "coordinator", insight: "Routes requests to specialized agents.", kind: "service" as const },
            { id: "agent-screening", label: "screening", insight: "Clinical screening and risk stratification.", kind: "service" as const },
            { id: "agent-billing", label: "billing", insight: "Payments, claims, and compliance ledger paths.", kind: "service" as const },
            { id: "agent-scheduling", label: "scheduling", insight: "Appointment and referral orchestration.", kind: "service" as const },
          ],
          { columns: 4, xGap: 260 }
        )

  const fallbackEdges =
    edges.length > 0
      ? edges
      : edgesFromPairs([
          { source: "agent-coordinator", target: "agent-screening", label: "task-route" },
          { source: "agent-coordinator", target: "agent-billing", label: "task-route" },
          { source: "agent-screening", target: "agent-scheduling", label: "handoff" },
        ])

  return {
    id: "agent-interaction",
    type: "agent_interaction",
    title: titleFor("agent_interaction"),
    description: describe("agent_interaction"),
    mermaid: mermaidFromFlow(fallbackNodes, fallbackEdges, "LR"),
    reactFlowData: { nodes: fallbackNodes, edges: fallbackEdges },
    insights: [
      `${Math.max(uniqueAgents.length, 4)} agents/services represented.`,
      "Edge labels describe protocol or handoff semantics.",
      "Look for high out-degree nodes to find orchestration bottlenecks.",
    ],
  }
}

function communicationDiagram(model: VisualizerRepositoryModel): DiagramPayload {
  const nodes = layoutNodes(
    [
      {
        id: "comm-user",
        label: "Client UI",
        insight: "Natural-language requests originate from app pages/components.",
        kind: "external" as const,
      },
      {
        id: "comm-api",
        label: `API Routes (${model.apiRoutes.length})`,
        insight: "Server routes coordinate parsing, orchestration, and validation.",
        kind: "service" as const,
      },
      {
        id: "comm-core",
        label: "Core Services",
        insight: "Domain logic in lib/* handles mapping and care workflows.",
        kind: "core" as const,
      },
      {
        id: "comm-nppes",
        label: "External APIs",
        insight: "NPI Registry and LLM provider integrations.",
        kind: "external" as const,
      },
      {
        id: "comm-db",
        label: "Persistence",
        insight: "Prisma + local compliance/cache stores.",
        kind: "data" as const,
      },
    ],
    { columns: 3, xGap: 300 }
  )

  const edges = edgesFromPairs([
    { source: "comm-user", target: "comm-api", label: "HTTP / websocket" },
    { source: "comm-api", target: "comm-core", label: "orchestration" },
    { source: "comm-core", target: "comm-nppes", label: "REST / events" },
    { source: "comm-core", target: "comm-db", label: "read/write" },
    { source: "comm-core", target: "comm-api", label: "response payload" },
    { source: "comm-api", target: "comm-user", label: "JSON + streamed status" },
  ])

  return {
    id: "communication-flow",
    type: "communication_flow",
    title: titleFor("communication_flow"),
    description: describe("communication_flow"),
    mermaid: mermaidFromFlow(nodes, edges, "TD"),
    reactFlowData: { nodes, edges },
    insights: [
      "Communication flow highlights request/response plus external API hops.",
      "Use this graph to audit timeouts, retries, and error propagation paths.",
    ],
  }
}

function deploymentDiagram(model: VisualizerRepositoryModel): DiagramPayload {
  const nodes = layoutNodes(
    [
      {
        id: "dep-source",
        label: "GitHub Repo",
        insight: "Source of truth for application code and infrastructure config.",
        kind: "external" as const,
      },
      {
        id: "dep-ci",
        label: "CI Build",
        insight: "Runs install, lint, type checks, and production build.",
        kind: "service" as const,
      },
      {
        id: "dep-artifact",
        label: "Build Artifacts",
        insight: "Compiled Next.js output and serverless handlers.",
        kind: "data" as const,
      },
      {
        id: "dep-runtime",
        label: "Runtime (Vercel)",
        insight: "Serves app routes and API endpoints at scale.",
        kind: "service" as const,
      },
      {
        id: "dep-observe",
        label: "Observability",
        insight: "Readiness checks, logs, and cost telemetry.",
        kind: "core" as const,
      },
    ],
    { columns: 5, xGap: 240 }
  )

  const edges = edgesFromPairs([
    { source: "dep-source", target: "dep-ci", label: "push / merge" },
    { source: "dep-ci", target: "dep-artifact", label: "build" },
    { source: "dep-artifact", target: "dep-runtime", label: "deploy" },
    { source: "dep-runtime", target: "dep-observe", label: "metrics + logs" },
    { source: "dep-observe", target: "dep-source", label: "feedback loop" },
  ])

  const signalNote = model.deploymentSignals.length
    ? `Signals: ${model.deploymentSignals.join("; ")}`
    : "Signals inferred from scripts and runtime conventions."

  return {
    id: "deployment-pipeline",
    type: "deployment_pipeline",
    title: titleFor("deployment_pipeline"),
    description: describe("deployment_pipeline"),
    mermaid: mermaidFromFlow(nodes, edges, "LR"),
    reactFlowData: { nodes, edges },
    insights: [signalNote, "Pipeline supports incremental refinement and verification before release."],
  }
}

function dependencyDiagram(model: VisualizerRepositoryModel): DiagramPayload {
  const filesByDegree = model.files
    .map((file) => ({
      file,
      degree: file.imports.length,
    }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 40)

  const nodes = layoutNodes(
    filesByDegree.map((entry) => ({
      id: `file-${entry.file.path.replace(/[^a-z0-9]/gi, "-")}`,
      label: entry.file.path,
      insight: `${entry.degree} direct import references detected.`,
      filePath: entry.file.path,
      snippet: entry.file.snippet,
      kind: entry.file.path.startsWith("app/api/") ? ("service" as const) : ("core" as const),
    })),
    { columns: 5, xGap: 280, yGap: 160 }
  )

  const knownIds = new Set(nodes.map((node) => node.id))
  const edges = edgesFromPairs(
    filesByDegree
      .flatMap((entry) =>
        entry.file.imports.map((imp) => {
          const normalized = imp
            .replace(/^@\//, "")
            .replace(/^\.\//, "")
            .replace(/^\.\.\//, "")
          const source = `file-${entry.file.path.replace(/[^a-z0-9]/gi, "-")}`
          const target = `file-${normalized.replace(/[^a-z0-9]/gi, "-")}`
          return { source, target, label: "import" }
        })
      )
      .filter((edge) => knownIds.has(edge.source) && knownIds.has(edge.target))
      .slice(0, 120)
  )

  return {
    id: "file-dependency",
    type: "file_dependency",
    title: titleFor("file_dependency"),
    description: describe("file_dependency"),
    mermaid: mermaidFromFlow(nodes, edges, "LR"),
    reactFlowData: { nodes, edges },
    insights: [
      "Use search to isolate files and identify fan-in / fan-out hotspots.",
      "High-degree nodes are good candidates for optimization and modularization.",
    ],
  }
}

function optionalDataFlow(model: VisualizerRepositoryModel): DiagramPayload {
  const nodes = layoutNodes(
    [
      {
        id: "data-ui",
        label: "Input Surfaces",
        insight: "Forms, chat, and wallet-linked user actions.",
        kind: "external" as const,
      },
      {
        id: "data-api",
        label: "Validation + API",
        insight: "Normalizes and validates incoming payloads.",
        kind: "service" as const,
      },
      {
        id: "data-domain",
        label: "Domain Logic",
        insight: "Screening, provider search, payments, orchestration.",
        kind: "core" as const,
      },
      {
        id: "data-store",
        label: "Datastores",
        insight: "Prisma DB + compliance and visualizer cache stores.",
        kind: "data" as const,
      },
    ],
    { columns: 4, xGap: 280 }
  )

  const edges = edgesFromPairs([
    { source: "data-ui", target: "data-api", label: "request" },
    { source: "data-api", target: "data-domain", label: "validated payload" },
    { source: "data-domain", target: "data-store", label: "persist" },
    { source: "data-store", target: "data-domain", label: "hydrate" },
    { source: "data-domain", target: "data-api", label: "response model" },
  ])

  return {
    id: "data-flow",
    type: "data_flow",
    title: titleFor("data_flow"),
    description: describe("data_flow"),
    mermaid: mermaidFromFlow(nodes, edges, "LR"),
    reactFlowData: { nodes, edges },
    insights: [`${model.routes.length} route views and ${model.apiRoutes.length} API routes influence this path.`],
  }
}

function optionalSecurity(model: VisualizerRepositoryModel): DiagramPayload {
  const nodes = layoutNodes(
    [
      {
        id: "sec-client",
        label: "Client Boundary",
        insight: "Untrusted user input boundary.",
        kind: "external" as const,
      },
      {
        id: "sec-auth",
        label: "Auth + Wallet Identity",
        insight: "Identity context for sensitive actions.",
        kind: "service" as const,
      },
      {
        id: "sec-api",
        label: "Protected API Surface",
        insight: "Input validation + rate limiting controls.",
        kind: "service" as const,
      },
      {
        id: "sec-secrets",
        label: "Secrets + External APIs",
        insight: "API keys/tokens and outbound integrations.",
        kind: "data" as const,
      },
      {
        id: "sec-ledger",
        label: "Compliance Ledger",
        insight: "Audit-friendly payment and attestation trail.",
        kind: "data" as const,
      },
    ],
    { columns: 5, xGap: 260 }
  )

  const edges = edgesFromPairs([
    { source: "sec-client", target: "sec-auth", label: "identity" },
    { source: "sec-auth", target: "sec-api", label: "authorized call" },
    { source: "sec-api", target: "sec-secrets", label: "signed outbound" },
    { source: "sec-api", target: "sec-ledger", label: "audit event" },
  ])

  return {
    id: "security-posture",
    type: "security_posture",
    title: titleFor("security_posture"),
    description: describe("security_posture"),
    mermaid: mermaidFromFlow(nodes, edges, "LR"),
    reactFlowData: { nodes, edges },
    insights: [
      "Review outbound integration nodes for least-privilege secrets handling.",
      "Rate limiting is applied at visualizer endpoints to cap abuse risk.",
      `Model source includes ${model.apiRoutes.length} API routes requiring boundary checks.`,
    ],
  }
}

function optionalCallGraph(model: VisualizerRepositoryModel): DiagramPayload {
  const hotspots = model.files
    .map((file) => ({
      file,
      score: file.imports.length + (file.path.includes("app/api/") ? 6 : 0) + (file.path.includes("lib/") ? 3 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 18)

  const nodes = layoutNodes(
    hotspots.map((entry) => ({
      id: `hot-${entry.file.path.replace(/[^a-z0-9]/gi, "-")}`,
      label: entry.file.path,
      insight: `Composite hotspot score: ${entry.score}.`,
      filePath: entry.file.path,
      snippet: entry.file.snippet,
      kind: "core" as const,
    })),
    { columns: 3, xGap: 320, yGap: 150 }
  )

  const edges = edgesFromPairs(
    hotspots
      .flatMap((entry) =>
        entry.file.imports.slice(0, 4).map((imp) => {
          const source = `hot-${entry.file.path.replace(/[^a-z0-9]/gi, "-")}`
          const target = `hot-${imp.replace(/^@\//, "").replace(/[^a-z0-9]/gi, "-")}`
          return { source, target, label: "calls" }
        })
      )
      .filter((edge) => nodes.some((node) => node.id === edge.source) && nodes.some((node) => node.id === edge.target))
      .slice(0, 50)
  )

  return {
    id: "call-graph-hotspots",
    type: "call_graph_hotspots",
    title: titleFor("call_graph_hotspots"),
    description: describe("call_graph_hotspots"),
    mermaid: mermaidFromFlow(nodes, edges, "TD"),
    reactFlowData: { nodes, edges },
    insights: [
      "Hotspot score blends import fanout and API criticality.",
      "Target these nodes first for profiling and architectural decomposition.",
    ],
  }
}

export function buildHeuristicDiagrams(model: VisualizerRepositoryModel, focusAreas: VisualizerFocusArea[]): DiagramPayload[] {
  const diagrams: DiagramPayload[] = [
    architectureDiagram(model),
    agentDiagram(model),
    communicationDiagram(model),
    deploymentDiagram(model),
    dependencyDiagram(model),
  ]

  if (focusAreas.includes("data_flow")) diagrams.push(optionalDataFlow(model))
  if (focusAreas.includes("security_privacy")) diagrams.push(optionalSecurity(model))
  if (focusAreas.includes("performance_bottlenecks")) diagrams.push(optionalCallGraph(model))

  return diagrams
}
