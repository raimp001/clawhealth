import crypto from "node:crypto"
import type {
  DiagramPayload,
  VisualizerAskResponse,
  VisualizerCost,
  VisualizerFocusArea,
  VisualizerMapInput,
  VisualizerMappingResponse,
  VisualizerRepositoryModel,
} from "@/lib/codebase-visualizer/types"
import {
  buildVisualizerCacheKey,
  consumeVisualizerRateLimit,
  getVisualizerCacheByKey,
  getVisualizerContextByMappingId,
  recordVisualizerCost,
  saveVisualizerMapping,
} from "@/lib/codebase-visualizer/cache"
import { buildHeuristicDiagrams } from "@/lib/codebase-visualizer/diagram-builder"
import { ingestRepositoryForVisualization, removeTempRoot } from "@/lib/codebase-visualizer/ingest"
import { askMapperAgent, refineDiagramsWithMapperAgent } from "@/lib/codebase-visualizer/mapper-agent"
import { VISUALIZER_FOCUS_AREAS } from "@/lib/codebase-visualizer/constants"

function normalizeFocusAreas(focusAreas: VisualizerFocusArea[]): VisualizerFocusArea[] {
  const allowed = new Set(VISUALIZER_FOCUS_AREAS.map((item) => item.id))
  return Array.from(new Set(focusAreas.filter((item) => allowed.has(item)))).slice(0, 6)
}

function summarizeModel(model: VisualizerRepositoryModel): string {
  const topModules = model.topLevelModules
    .slice(0, 10)
    .map((module) => `${module.name} (${module.fileCount} files)`)
    .join(", ")
  const routeSample = model.apiRoutes.slice(0, 10).join(", ") || "none"
  const agentSample = model.agentLinks
    .slice(0, 20)
    .map((link) => `${link.source}->${link.target} (${link.protocol})`)
    .join(", ")

  return [
    `Repository: ${model.repoName}`,
    `Commit: ${model.commitSha}`,
    `Languages: ${model.languages.join(", ") || "unknown"}`,
    `Frameworks: ${model.frameworks.join(", ") || "unknown"}`,
    `Files analyzed: ${model.files.length}`,
    `Top modules: ${topModules || "none"}`,
    `API routes: ${routeSample}`,
    `Agent links: ${agentSample || "none"}`,
    `Deployment signals: ${model.deploymentSignals.join(", ") || "none"}`,
  ].join("\n")
}

function buildMappingSummary(model: VisualizerRepositoryModel, source: "github" | "upload") {
  return {
    repoName: model.repoName,
    commitSha: model.commitSha,
    source,
    frameworks: model.frameworks,
    languages: model.languages,
    fileCount: model.files.length,
    routeCount: model.apiRoutes.length,
    agentCount: new Set(model.agentLinks.flatMap((entry) => [entry.source, entry.target])).size,
    generatedAt: new Date().toISOString(),
  }
}

function mergeCost(base: VisualizerCost, next: VisualizerCost): VisualizerCost {
  return {
    promptTokens: base.promptTokens + next.promptTokens,
    completionTokens: base.completionTokens + next.completionTokens,
    estimatedUsd: Number((base.estimatedUsd + next.estimatedUsd).toFixed(6)),
  }
}

function keywordScore(diagram: DiagramPayload, question: string): number {
  const haystack = [
    diagram.title,
    diagram.description,
    ...diagram.insights,
    ...diagram.reactFlowData.nodes.map((node) => node.data.label),
    ...diagram.reactFlowData.nodes.map((node) => node.data.insight),
  ]
    .join(" ")
    .toLowerCase()

  return question
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0)
}

function selectRelevantDiagrams(diagrams: DiagramPayload[], question: string): DiagramPayload[] {
  const ranked = diagrams
    .map((diagram) => ({ diagram, score: keywordScore(diagram, question) }))
    .sort((a, b) => b.score - a.score)

  const best = ranked.filter((entry) => entry.score > 0).slice(0, 3).map((entry) => entry.diagram)
  return best.length > 0 ? best : diagrams.slice(0, 2)
}

function improveDiagramHeuristically(diagram: DiagramPayload, instruction: string): DiagramPayload {
  const term = instruction.trim() || "critical flow"
  const normalized = term.toLowerCase()

  const nodes = diagram.reactFlowData.nodes.map((node) => {
    const hit = `${node.data.label} ${node.data.insight}`.toLowerCase().includes(normalized)
    return {
      ...node,
      style: {
        ...(node.style || {}),
        border: hit ? "1.5px solid #2f9b72" : (node.style?.border as string) || "1px solid #3f4a57",
        boxShadow: hit ? "0 0 0 2px rgba(47,155,114,0.24)" : "none",
      },
      data: {
        ...node.data,
        insight: hit
          ? `${node.data.insight} Focused for query: ${term}.`
          : node.data.insight,
      },
    }
  })

  const insights = Array.from(
    new Set([
      `Refined by mapper with focus: ${term}.`,
      ...diagram.insights,
    ])
  ).slice(0, 8)

  return {
    ...diagram,
    title: `${diagram.title} (Refined)`,
    reactFlowData: {
      nodes,
      edges: diagram.reactFlowData.edges,
    },
    insights,
  }
}

export function enforceVisualizerRateLimit(input: {
  ip: string
  action: "map" | "ask" | "improve"
}): { allowed: boolean; retryAfterMs?: number } {
  if (!input.ip) return { allowed: true }
  if (input.action === "map") {
    return consumeVisualizerRateLimit({ ip: input.ip, action: "map", limit: 8, windowMs: 15 * 60 * 1000 })
  }
  if (input.action === "ask") {
    return consumeVisualizerRateLimit({ ip: input.ip, action: "ask", limit: 30, windowMs: 15 * 60 * 1000 })
  }
  return consumeVisualizerRateLimit({ ip: input.ip, action: "improve", limit: 20, windowMs: 15 * 60 * 1000 })
}

export async function mapCodebaseWithAiAgent(input: VisualizerMapInput): Promise<VisualizerMappingResponse> {
  const focusAreas = normalizeFocusAreas(input.focusAreas)
  const progressLogs: string[] = []
  let tempRoot = ""

  const log = (message: string) => {
    progressLogs.push(message)
  }

  let model: VisualizerRepositoryModel | null = null

  try {
    const ingest = await ingestRepositoryForVisualization({
      mapInput: { ...input, focusAreas },
      progress: log,
    })
    model = ingest.model
    tempRoot = ingest.tempRoot

    const cacheKey = buildVisualizerCacheKey({
      commitSha: model.commitSha,
      repoName: model.repoName,
      focusAreas,
    })

    const cached = getVisualizerCacheByKey(cacheKey)
    if (cached) {
      return {
        ...cached,
        cacheHit: true,
        progressLogs: [...progressLogs, "Loaded cached mapping for unchanged commit SHA."],
      }
    }

    log("Building interaction graph and architecture model...")
    const heuristicDiagrams = buildHeuristicDiagrams(model, focusAreas)
    const summaryText = summarizeModel(model)

    log("Generating Mermaid + React-Flow diagrams...")
    const llmInitial = await refineDiagramsWithMapperAgent({
      model,
      diagrams: heuristicDiagrams,
      focusAreas,
      summaryText,
      mode: "initial",
    })

    let finalDiagrams = llmInitial.diagrams
    let finalCost = llmInitial.cost

    if ((process.env.OPENRX_MAPPER_SELF_CRITIQUE || "true") !== "false") {
      log("Refining for clarity with self-critique pass...")
      const llmFollowup = await refineDiagramsWithMapperAgent({
        model,
        diagrams: finalDiagrams,
        focusAreas,
        summaryText,
        mode: "followup",
      })
      finalDiagrams = llmFollowup.diagrams
      finalCost = mergeCost(finalCost, llmFollowup.cost)
    }

    const mappingId = crypto.randomUUID()
    const response: VisualizerMappingResponse = {
      mappingId,
      cacheKey,
      cacheHit: false,
      progressLogs,
      summary: buildMappingSummary(model, model.source),
      diagrams: finalDiagrams,
      cost: finalCost,
    }

    saveVisualizerMapping({
      cacheKey,
      commitSha: model.commitSha,
      repoName: model.repoName,
      focusAreas,
      response,
      summaryText,
    })
    recordVisualizerCost(finalCost)

    return response
  } finally {
    if (tempRoot) {
      await removeTempRoot(tempRoot)
    }
  }
}

export async function getMappingById(mappingId: string): Promise<VisualizerMappingResponse | null> {
  return getVisualizerContextByMappingId(mappingId)?.response || null
}

export async function askMapper(input: {
  mappingId: string
  question: string
}): Promise<VisualizerAskResponse> {
  const context = getVisualizerContextByMappingId(input.mappingId)
  if (!context) {
    throw new Error("Mapping session not found or expired. Please remap the codebase.")
  }

  const relevant = selectRelevantDiagrams(context.response.diagrams, input.question)
  const relevantIds = relevant.map((diagram) => diagram.id)

  const answer = await askMapperAgent({
    question: input.question,
    context: [
      context.summaryText,
      `Relevant diagrams: ${relevantIds.join(", ")}`,
      JSON.stringify(relevant, null, 2),
    ].join("\n\n"),
  })

  recordVisualizerCost(answer.cost)

  const wantsFocus = /focus|regenerat|refine|deep dive|drill|payment flow|auth flow|data flow/i.test(
    input.question
  )

  return {
    answer: `${answer.answer}\n\nMost relevant diagrams: ${relevantIds.join(", ")}.`,
    regeneratedDiagrams: wantsFocus ? relevant.map((diagram) => improveDiagramHeuristically(diagram, input.question)) : undefined,
    citations: answer.citations,
  }
}

export async function improveDiagram(input: {
  mappingId: string
  diagramId: string
  instruction?: string
}): Promise<DiagramPayload> {
  const context = getVisualizerContextByMappingId(input.mappingId)
  if (!context) {
    throw new Error("Mapping session not found or expired. Please remap the codebase.")
  }

  const diagram = context.response.diagrams.find((item) => item.id === input.diagramId)
  if (!diagram) {
    throw new Error("Diagram not found in this mapping session.")
  }

  const instruction = input.instruction || "clarity and readability"
  return improveDiagramHeuristically(diagram, instruction)
}
