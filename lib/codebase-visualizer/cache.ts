import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { CACHE_TTL_MS } from "@/lib/codebase-visualizer/constants"
import type {
  VisualizerCachedContext,
  VisualizerCachedEntry,
  VisualizerCost,
  VisualizerFocusArea,
  VisualizerMappingResponse,
} from "@/lib/codebase-visualizer/types"

interface RateLimitBucket {
  startedAt: number
  count: number
}

interface CostUsageBucket {
  requests: number
  promptTokens: number
  completionTokens: number
  estimatedUsd: number
}

interface VisualizerStore {
  entries: VisualizerCachedEntry[]
  contexts: VisualizerCachedContext[]
  rateLimits: Record<string, RateLimitBucket>
  costLedger: {
    total: VisualizerCost
    byDate: Record<string, CostUsageBucket>
  }
}

function resolveStorePath(): string {
  const configured = process.env.OPENRX_VISUALIZER_CACHE_PATH
  if (configured) return configured
  return path.join(process.cwd(), ".openrx-visualizer-cache.json")
}

function defaultStore(): VisualizerStore {
  return {
    entries: [],
    contexts: [],
    rateLimits: {},
    costLedger: {
      total: { promptTokens: 0, completionTokens: 0, estimatedUsd: 0 },
      byDate: {},
    },
  }
}

function loadStore(): VisualizerStore {
  const storePath = resolveStorePath()
  try {
    if (!fs.existsSync(storePath)) return defaultStore()
    const parsed = JSON.parse(fs.readFileSync(storePath, "utf8")) as VisualizerStore
    if (!parsed || typeof parsed !== "object") return defaultStore()
    return {
      entries: parsed.entries || [],
      contexts: parsed.contexts || [],
      rateLimits: parsed.rateLimits || {},
      costLedger: parsed.costLedger || defaultStore().costLedger,
    }
  } catch {
    return defaultStore()
  }
}

function saveStore(store: VisualizerStore): void {
  const storePath = resolveStorePath()
  const storeDir = path.dirname(storePath)
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true })
  }
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8")
}

function pruneExpired(store: VisualizerStore): VisualizerStore {
  const now = Date.now()
  store.entries = store.entries.filter((entry) => now - entry.createdAt <= CACHE_TTL_MS)
  const validIds = new Set(store.entries.map((entry) => entry.mappingId))
  store.contexts = store.contexts.filter(
    (context) => validIds.has(context.mappingId) && now - context.createdAt <= CACHE_TTL_MS
  )
  return store
}

export function buildVisualizerCacheKey(input: {
  commitSha: string
  repoName: string
  focusAreas: VisualizerFocusArea[]
}): string {
  const normalized = JSON.stringify({
    commitSha: input.commitSha,
    repoName: input.repoName.toLowerCase(),
    focusAreas: [...input.focusAreas].sort(),
  })
  return crypto.createHash("sha256").update(normalized).digest("hex")
}

export function getVisualizerCacheByKey(cacheKey: string): VisualizerMappingResponse | null {
  const store = pruneExpired(loadStore())
  saveStore(store)
  return store.entries.find((entry) => entry.cacheKey === cacheKey)?.response || null
}

export function getVisualizerContextByMappingId(mappingId: string): VisualizerCachedContext | null {
  const store = pruneExpired(loadStore())
  saveStore(store)
  return store.contexts.find((context) => context.mappingId === mappingId) || null
}

export function saveVisualizerMapping(input: {
  cacheKey: string
  commitSha: string
  repoName: string
  focusAreas: VisualizerFocusArea[]
  response: VisualizerMappingResponse
  summaryText: string
}): void {
  const store = pruneExpired(loadStore())
  const createdAt = Date.now()

  store.entries = store.entries.filter((entry) => entry.cacheKey !== input.cacheKey)
  store.entries.push({
    cacheKey: input.cacheKey,
    mappingId: input.response.mappingId,
    createdAt,
    commitSha: input.commitSha,
    repoName: input.repoName,
    focusAreas: input.focusAreas,
    response: input.response,
  })

  store.contexts = store.contexts.filter((context) => context.mappingId !== input.response.mappingId)
  store.contexts.push({
    mappingId: input.response.mappingId,
    createdAt,
    summaryText: input.summaryText,
    focusAreas: input.focusAreas,
    response: input.response,
  })

  saveStore(store)
}

export function consumeVisualizerRateLimit(input: {
  ip: string
  action: string
  limit: number
  windowMs: number
}): { allowed: boolean; retryAfterMs?: number } {
  const key = `${input.action}:${input.ip}`
  const store = loadStore()
  const now = Date.now()
  const bucket = store.rateLimits[key]

  if (!bucket || now - bucket.startedAt > input.windowMs) {
    store.rateLimits[key] = { startedAt: now, count: 1 }
    saveStore(store)
    return { allowed: true }
  }

  if (bucket.count >= input.limit) {
    return {
      allowed: false,
      retryAfterMs: Math.max(1000, input.windowMs - (now - bucket.startedAt)),
    }
  }

  store.rateLimits[key] = {
    startedAt: bucket.startedAt,
    count: bucket.count + 1,
  }
  saveStore(store)
  return { allowed: true }
}

export function recordVisualizerCost(cost: VisualizerCost): void {
  if (!cost.promptTokens && !cost.completionTokens && !cost.estimatedUsd) return
  const store = loadStore()
  const dayKey = new Date().toISOString().slice(0, 10)

  store.costLedger.total.promptTokens += cost.promptTokens
  store.costLedger.total.completionTokens += cost.completionTokens
  store.costLedger.total.estimatedUsd += cost.estimatedUsd

  const daily =
    store.costLedger.byDate[dayKey] ||
    ({ requests: 0, promptTokens: 0, completionTokens: 0, estimatedUsd: 0 } satisfies CostUsageBucket)
  daily.requests += 1
  daily.promptTokens += cost.promptTokens
  daily.completionTokens += cost.completionTokens
  daily.estimatedUsd += cost.estimatedUsd
  store.costLedger.byDate[dayKey] = daily

  saveStore(store)
}
