import { VISUALIZER_SYSTEM_PROMPT } from "@/lib/codebase-visualizer/constants"
import type { DiagramPayload, VisualizerCost, VisualizerRepositoryModel } from "@/lib/codebase-visualizer/types"

interface AnthropicMessageResponse {
  content?: Array<{ type: string; text?: string }>
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
}

function parseJsonBlock(text: string): unknown {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    return JSON.parse(fenced[1])
  }

  const braceStart = text.indexOf("{")
  const braceEnd = text.lastIndexOf("}")
  if (braceStart >= 0 && braceEnd > braceStart) {
    return JSON.parse(text.slice(braceStart, braceEnd + 1))
  }

  throw new Error("Mapper agent returned invalid JSON.")
}

function estimateUsd(inputTokens: number, outputTokens: number): number {
  // Approximate Claude Sonnet-style pricing per 1M tokens.
  const inputUsdPerM = Number.parseFloat(process.env.OPENRX_MAPPER_INPUT_USD_PER_M || "3")
  const outputUsdPerM = Number.parseFloat(process.env.OPENRX_MAPPER_OUTPUT_USD_PER_M || "15")
  return (inputTokens / 1_000_000) * inputUsdPerM + (outputTokens / 1_000_000) * outputUsdPerM
}

function sanitizeDiagram(diagram: DiagramPayload): DiagramPayload {
  return {
    ...diagram,
    mermaid: diagram.mermaid || "flowchart LR\n  A[Unavailable] --> B[Mapper returned incomplete data]",
    insights: Array.isArray(diagram.insights) ? diagram.insights.slice(0, 8) : [],
    reactFlowData: {
      nodes: Array.isArray(diagram.reactFlowData?.nodes) ? diagram.reactFlowData.nodes : [],
      edges: Array.isArray(diagram.reactFlowData?.edges) ? diagram.reactFlowData.edges : [],
    },
  }
}

export async function refineDiagramsWithMapperAgent(input: {
  model: VisualizerRepositoryModel
  diagrams: DiagramPayload[]
  focusAreas: string[]
  summaryText: string
  mode?: "initial" | "followup"
}): Promise<{ diagrams: DiagramPayload[]; cost: VisualizerCost }> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENRX_MAPPER_ANTHROPIC_API_KEY
  if (!apiKey) {
    return {
      diagrams: input.diagrams,
      cost: { promptTokens: 0, completionTokens: 0, estimatedUsd: 0 },
    }
  }

  const modelName = process.env.OPENRX_MAPPER_MODEL || "claude-sonnet-4-20250514"
  const userPrompt = [
    `Repository: ${input.model.repoName}`,
    `Commit: ${input.model.commitSha}`,
    `Focus Areas: ${input.focusAreas.join(", ") || "none"}`,
    "",
    "Repository summary:",
    input.summaryText,
    "",
    "Current diagram payloads (JSON):",
    JSON.stringify(input.diagrams, null, 2),
    "",
    "Return STRICT JSON with shape: { \"diagrams\": DiagramPayload[] }.",
    "Keep diagram ids stable where possible and improve clarity/readability.",
  ].join("\n")

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 5000,
      system: VISUALIZER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  })

  if (!response.ok) {
    return {
      diagrams: input.diagrams,
      cost: { promptTokens: 0, completionTokens: 0, estimatedUsd: 0 },
    }
  }

  const payload = (await response.json()) as AnthropicMessageResponse
  const text = payload.content?.find((item) => item.type === "text")?.text || ""

  try {
    const parsed = parseJsonBlock(text) as { diagrams?: DiagramPayload[] }
    const diagrams = Array.isArray(parsed.diagrams)
      ? parsed.diagrams.map(sanitizeDiagram)
      : input.diagrams

    const promptTokens = payload.usage?.input_tokens || 0
    const completionTokens = payload.usage?.output_tokens || 0

    return {
      diagrams,
      cost: {
        promptTokens,
        completionTokens,
        estimatedUsd: estimateUsd(promptTokens, completionTokens),
      },
    }
  } catch {
    return {
      diagrams: input.diagrams,
      cost: { promptTokens: 0, completionTokens: 0, estimatedUsd: 0 },
    }
  }
}

export async function askMapperAgent(input: {
  question: string
  context: string
}): Promise<{ answer: string; citations: string[]; cost: VisualizerCost }> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENRX_MAPPER_ANTHROPIC_API_KEY
  if (!apiKey) {
    return {
      answer:
        "Mapper context loaded. I can trace this path from the generated diagrams, but no live LLM key is configured for deeper semantic regeneration.",
      citations: [],
      cost: { promptTokens: 0, completionTokens: 0, estimatedUsd: 0 },
    }
  }

  const modelName = process.env.OPENRX_MAPPER_MODEL || "claude-sonnet-4-20250514"
  const prompt = [
    "Answer the user question about the codebase map using the provided context.",
    "If user asks to focus/regenerate a path, identify the most relevant diagram ids.",
    "Return strict JSON: { \"answer\": string, \"citations\": string[] }.",
    "",
    `Question: ${input.question}`,
    "",
    "Context:",
    input.context,
  ].join("\n")

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 1400,
      system: VISUALIZER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!response.ok) {
    return {
      answer: "I could not reach the mapper model right now. Try again.",
      citations: [],
      cost: { promptTokens: 0, completionTokens: 0, estimatedUsd: 0 },
    }
  }

  const payload = (await response.json()) as AnthropicMessageResponse
  const text = payload.content?.find((item) => item.type === "text")?.text || ""

  try {
    const parsed = parseJsonBlock(text) as { answer?: string; citations?: string[] }
    const promptTokens = payload.usage?.input_tokens || 0
    const completionTokens = payload.usage?.output_tokens || 0

    return {
      answer: parsed.answer || "No mapper answer produced.",
      citations: Array.isArray(parsed.citations) ? parsed.citations : [],
      cost: {
        promptTokens,
        completionTokens,
        estimatedUsd: estimateUsd(promptTokens, completionTokens),
      },
    }
  } catch {
    return {
      answer: "The mapper returned an invalid response format.",
      citations: [],
      cost: { promptTokens: 0, completionTokens: 0, estimatedUsd: 0 },
    }
  }
}
