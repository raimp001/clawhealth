export type VisualizerFocusArea =
  | "agent_interactions"
  | "communication_protocols"
  | "deployment_pipeline"
  | "data_flow"
  | "security_privacy"
  | "performance_bottlenecks"

export type DiagramType =
  | "architecture"
  | "agent_interaction"
  | "communication_flow"
  | "deployment_pipeline"
  | "file_dependency"
  | "data_flow"
  | "call_graph_hotspots"
  | "security_posture"

export interface DiagramNodeData {
  label: string
  insight: string
  filePath?: string
  snippet?: string
  tags?: string[]
}

export interface DiagramNode {
  id: string
  position: { x: number; y: number }
  data: DiagramNodeData
  type?: string
  style?: Record<string, string | number>
}

export interface DiagramEdge {
  id: string
  source: string
  target: string
  label?: string
  animated?: boolean
  style?: Record<string, string | number>
  markerEnd?: { type: string }
}

export interface DiagramPayload {
  id: string
  type: DiagramType
  title: string
  description: string
  mermaid: string
  reactFlowData: {
    nodes: DiagramNode[]
    edges: DiagramEdge[]
  }
  insights: string[]
}

export interface VisualizerCost {
  promptTokens: number
  completionTokens: number
  estimatedUsd: number
}

export interface VisualizerMappingSummary {
  repoName: string
  commitSha: string
  source: "github" | "upload"
  frameworks: string[]
  languages: string[]
  fileCount: number
  routeCount: number
  agentCount: number
  generatedAt: string
}

export interface VisualizerMappingResponse {
  mappingId: string
  cacheKey: string
  cacheHit: boolean
  progressLogs: string[]
  summary: VisualizerMappingSummary
  diagrams: DiagramPayload[]
  cost: VisualizerCost
}

export interface VisualizerMapInput {
  repoUrl?: string
  githubToken?: string
  zipFileName?: string
  zipFileBuffer?: Buffer
  focusAreas: VisualizerFocusArea[]
  requestedByIp?: string
}

export interface VisualizerAskResponse {
  answer: string
  regeneratedDiagrams?: DiagramPayload[]
  citations: string[]
}

export interface VisualizerRepositoryModel {
  repoName: string
  source: "github" | "upload"
  commitSha: string
  defaultBranch?: string
  rootPath: string
  files: Array<{
    path: string
    ext: string
    language: string
    size: number
    imports: string[]
    snippet: string
  }>
  frameworks: string[]
  languages: string[]
  routes: string[]
  apiRoutes: string[]
  topLevelModules: Array<{
    name: string
    fileCount: number
    sampleFile?: string
  }>
  agentLinks: Array<{
    source: string
    target: string
    protocol: string
  }>
  deploymentSignals: string[]
}

export interface VisualizerCachedEntry {
  cacheKey: string
  mappingId: string
  createdAt: number
  commitSha: string
  repoName: string
  focusAreas: VisualizerFocusArea[]
  response: VisualizerMappingResponse
}

export interface VisualizerCachedContext {
  mappingId: string
  createdAt: number
  summaryText: string
  focusAreas: VisualizerFocusArea[]
  response: VisualizerMappingResponse
}
