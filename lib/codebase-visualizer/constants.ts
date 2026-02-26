import type { VisualizerFocusArea } from "@/lib/codebase-visualizer/types"

export const VISUALIZER_SYSTEM_PROMPT =
  "You are an elite software architect in 2026. Given a full codebase, produce clean, professional, production-grade diagrams that a senior engineer would be proud to present to the team. Prioritize clarity over completeness. Use standard shapes/colors. Add concise AI insights on every major node."

export const VISUALIZER_FOCUS_AREAS: Array<{
  id: VisualizerFocusArea
  label: string
  description: string
}> = [
  {
    id: "agent_interactions",
    label: "Agent Interactions",
    description: "How agents/services collaborate and hand off work.",
  },
  {
    id: "communication_protocols",
    label: "Communication Protocols",
    description: "HTTP, events, pub/sub, webhooks, and queue paths.",
  },
  {
    id: "deployment_pipeline",
    label: "Deployment Pipeline",
    description: "CI/CD flow, environments, runtime and infrastructure path.",
  },
  {
    id: "data_flow",
    label: "Data Flow",
    description: "Request, storage, and derived data movement paths.",
  },
  {
    id: "security_privacy",
    label: "Security / Privacy",
    description: "Auth boundaries, secrets, PII handling, and exposure risks.",
  },
  {
    id: "performance_bottlenecks",
    label: "Performance Bottlenecks",
    description: "Hot paths and likely latency/throughput bottlenecks.",
  },
]

export const SUPPORTED_CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".cs",
  ".rb",
  ".php",
  ".sql",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".md",
  ".sh",
  ".Dockerfile",
])

export const IGNORE_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "tmp",
  "temp",
  ".turbo",
  ".vercel",
])

export const MAX_FILE_BYTES = 300_000
export const MAX_ANALYZED_FILES = 700
export const CACHE_TTL_MS = 1000 * 60 * 60 * 24
