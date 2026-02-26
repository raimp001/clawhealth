import crypto from "node:crypto"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import AdmZip from "adm-zip"
import { fetchWithTimeout } from "@/lib/fetch-with-timeout"
import {
  IGNORE_DIRS,
  MAX_ANALYZED_FILES,
  MAX_FILE_BYTES,
  SUPPORTED_CODE_EXTENSIONS,
} from "@/lib/codebase-visualizer/constants"
import type { VisualizerMapInput, VisualizerRepositoryModel } from "@/lib/codebase-visualizer/types"

interface GitHubRepoRef {
  owner: string
  repo: string
  branch?: string
}

const IMPORT_PATTERN = /(?:import|export)\s+(?:[^"'`]*?\s+from\s+)?["'`]([^"'`]+)["'`]|require\((?:"|'|`)([^"'`]+)(?:"|'|`)\)/g

function parseGitHubRepoUrl(repoUrl: string): GitHubRepoRef | null {
  const normalized = repoUrl.trim().replace(/\.git$/i, "")
  const match = normalized.match(/github\.com[/:]([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/i)
  if (!match) return null
  return {
    owner: match[1],
    repo: match[2],
    branch: match[3],
  }
}

function extensionFor(filePath: string): string {
  const ext = path.extname(filePath)
  if (ext) return ext
  if (path.basename(filePath).toLowerCase() === "dockerfile") return ".Dockerfile"
  return ""
}

function languageForExtension(ext: string): string {
  if ([".ts", ".tsx"].includes(ext)) return "TypeScript"
  if ([".js", ".jsx", ".mjs", ".cjs"].includes(ext)) return "JavaScript"
  if (ext === ".py") return "Python"
  if (ext === ".go") return "Go"
  if (ext === ".rs") return "Rust"
  if ([".java", ".kt"].includes(ext)) return "JVM"
  if (ext === ".cs") return "C#"
  if (ext === ".rb") return "Ruby"
  if (ext === ".php") return "PHP"
  if (ext === ".sql") return "SQL"
  if ([".yaml", ".yml", ".toml"].includes(ext)) return "Configuration"
  if (ext === ".json") return "JSON"
  if (ext === ".sh") return "Shell"
  if (ext === ".md") return "Markdown"
  if (ext === ".Dockerfile") return "Docker"
  return "Other"
}

function hashContent(input: string): string {
  return crypto.createHash("sha1").update(input).digest("hex").slice(0, 12)
}

function buildSnippet(content: string): string {
  const lines = content.split("\n")
  const nonEmpty = lines.filter((line) => line.trim()).slice(0, 8)
  return nonEmpty.join("\n").slice(0, 400)
}

function extractImports(content: string): string[] {
  const imports: string[] = []
  const pattern = new RegExp(IMPORT_PATTERN.source, IMPORT_PATTERN.flags)
  let match = pattern.exec(content)
  while (match) {
    const raw = match[1] || match[2]
    match = pattern.exec(content)
    if (!raw) continue
    imports.push(raw)
  }
  return Array.from(new Set(imports)).slice(0, 20)
}

function detectFrameworks(files: Array<{ path: string; snippet: string }>): string[] {
  const frameworks = new Set<string>()
  const joinedPaths = files.map((file) => file.path).join("\n").toLowerCase()

  if (joinedPaths.includes("next.config") || joinedPaths.includes("app/layout.tsx")) frameworks.add("Next.js")
  if (joinedPaths.includes("tailwind.config")) frameworks.add("Tailwind CSS")
  if (joinedPaths.includes("prisma/schema.prisma")) frameworks.add("Prisma")
  if (joinedPaths.includes("dockerfile")) frameworks.add("Docker")
  if (joinedPaths.includes("vercel.json")) frameworks.add("Vercel")

  const pkg = files.find((file) => file.path === "package.json")
  if (pkg) {
    const lower = pkg.snippet.toLowerCase()
    if (lower.includes("react")) frameworks.add("React")
    if (lower.includes("typescript")) frameworks.add("TypeScript")
    if (lower.includes("fastapi")) frameworks.add("FastAPI")
  }

  return Array.from(frameworks)
}

function extractAgentLinks(files: Array<{ path: string; snippet: string }>): Array<{
  source: string
  target: string
  protocol: string
}> {
  const config = files.find((file) => file.path.includes("openclaw/config.ts"))
  if (!config) return []

  const links: Array<{ source: string; target: string; protocol: string }> = []
  const blockPattern = /id:\s*"([^"]+)"[\s\S]*?canMessage:\s*\[([^\]]*)\]/g
  let match = blockPattern.exec(config.snippet)
  while (match) {
    const source = match[1]
    const targets = match[2]
      .split(",")
      .map((entry) => entry.replace(/['"\s]/g, "").trim())
      .filter(Boolean)
    targets.forEach((target) => {
      links.push({ source, target, protocol: "agent-message" })
    })
    match = blockPattern.exec(config.snippet)
  }
  return links
}

function detectDeploymentSignals(files: Array<{ path: string; snippet: string }>): string[] {
  const signals: string[] = []
  const paths = new Set(files.map((file) => file.path.toLowerCase()))
  if (paths.has("vercel.json")) signals.push("Vercel deployment config")
  if (paths.has("dockerfile")) signals.push("Docker build")
  if (paths.has("package.json")) signals.push("Node build scripts")
  if (paths.has("prisma/schema.prisma")) signals.push("Prisma database migrations")
  if (Array.from(paths).some((entry) => entry.includes("github/workflows"))) signals.push("GitHub Actions")
  return signals
}

async function collectFiles(repoRoot: string): Promise<VisualizerRepositoryModel["files"]> {
  const files: VisualizerRepositoryModel["files"] = []

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const absolute = path.join(currentDir, entry.name)
      const relative = path.relative(repoRoot, absolute)
      if (!relative) continue

      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue
        await walk(absolute)
        if (files.length >= MAX_ANALYZED_FILES) return
        continue
      }

      if (files.length >= MAX_ANALYZED_FILES) return

      const ext = extensionFor(entry.name)
      if (!SUPPORTED_CODE_EXTENSIONS.has(ext)) continue

      const stat = await fs.stat(absolute)
      if (stat.size > MAX_FILE_BYTES) continue

      const content = await fs.readFile(absolute, "utf8")
      files.push({
        path: relative,
        ext,
        language: languageForExtension(ext),
        size: stat.size,
        imports: extractImports(content),
        snippet: buildSnippet(content),
      })
    }
  }

  await walk(repoRoot)
  return files
}

async function unzipToTempRoot(zipBuffer: Buffer): Promise<{ tempRoot: string; repoRoot: string }> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openrx-mapper-"))
  const zip = new AdmZip(zipBuffer)
  zip.extractAllTo(tempRoot, true)

  const children = await fs.readdir(tempRoot, { withFileTypes: true })
  const firstDir = children.find((entry) => entry.isDirectory())
  const repoRoot = firstDir ? path.join(tempRoot, firstDir.name) : tempRoot

  return { tempRoot, repoRoot }
}

async function fetchGitHubArchive(input: {
  repoRef: GitHubRepoRef
  githubToken?: string
  progress: (log: string) => void
}): Promise<{
  zipBuffer: Buffer
  commitSha: string
  defaultBranch: string
}> {
  const { repoRef } = input
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "OpenRx-Codebase-Visualizer",
  }
  if (input.githubToken) {
    headers.Authorization = `Bearer ${input.githubToken}`
  }

  input.progress("Resolving repository metadata...")
  const repoRes = await fetchWithTimeout(
    `https://api.github.com/repos/${repoRef.owner}/${repoRef.repo}`,
    { headers, cache: "no-store" },
    12_000
  )

  if (!repoRes.ok) {
    throw new Error(`Unable to access repository metadata (${repoRes.status}). Check repo URL/token.`)
  }

  const repoPayload = (await repoRes.json()) as {
    default_branch?: string
  }
  const defaultBranch = repoRef.branch || repoPayload.default_branch || "main"

  input.progress(`Downloading repository snapshot (${defaultBranch})...`)
  const archiveRes = await fetchWithTimeout(
    `https://api.github.com/repos/${repoRef.owner}/${repoRef.repo}/zipball/${encodeURIComponent(defaultBranch)}`,
    { headers, cache: "no-store" },
    20_000
  )

  if (!archiveRes.ok) {
    throw new Error(`Unable to download repository archive (${archiveRes.status}).`)
  }

  const zipBuffer = Buffer.from(await archiveRes.arrayBuffer())
  const commitSha = hashContent(zipBuffer.toString("base64")).slice(0, 10)

  return {
    zipBuffer,
    commitSha,
    defaultBranch,
  }
}

export async function removeTempRoot(tempRoot: string): Promise<void> {
  try {
    await fs.rm(tempRoot, { recursive: true, force: true })
  } catch {
    // no-op
  }
}

export async function ingestRepositoryForVisualization(input: {
  mapInput: VisualizerMapInput
  progress: (log: string) => void
}): Promise<{ model: VisualizerRepositoryModel; tempRoot: string }> {
  const { mapInput } = input

  let zipBuffer: Buffer | undefined
  let source: "github" | "upload" = "upload"
  let repoName = "uploaded-codebase"
  let commitSha = "local"
  let defaultBranch: string | undefined

  if (mapInput.repoUrl) {
    const repoRef = parseGitHubRepoUrl(mapInput.repoUrl)
    if (!repoRef) {
      throw new Error("Only GitHub repository URLs are supported for repo mapping.")
    }
    source = "github"
    repoName = `${repoRef.owner}/${repoRef.repo}`

    const archive = await fetchGitHubArchive({
      repoRef,
      githubToken: mapInput.githubToken,
      progress: input.progress,
    })
    zipBuffer = archive.zipBuffer
    commitSha = archive.commitSha
    defaultBranch = archive.defaultBranch
  } else if (mapInput.zipFileBuffer) {
    source = "upload"
    zipBuffer = mapInput.zipFileBuffer
    repoName = mapInput.zipFileName || "uploaded-codebase"
    commitSha = hashContent(zipBuffer.toString("base64")).slice(0, 10)
  }

  if (!zipBuffer) {
    throw new Error("Provide either a GitHub repo URL or a .zip upload.")
  }

  input.progress("Preparing secure temp sandbox...")
  const { tempRoot, repoRoot } = await unzipToTempRoot(zipBuffer)

  input.progress("Scanning files and dependency links...")
  const files = await collectFiles(repoRoot)

  const languages = Array.from(new Set(files.map((file) => file.language))).sort()
  const frameworks = detectFrameworks(files)
  const routes = files.filter((file) => file.path.startsWith("app/") && file.path.endsWith("/page.tsx")).map((file) => file.path)
  const apiRoutes = files.filter((file) => file.path.startsWith("app/api/") && file.path.endsWith("route.ts")).map((file) => file.path)

  const moduleCount = new Map<string, { fileCount: number; sampleFile?: string }>()
  files.forEach((file) => {
    const moduleName = file.path.split("/")[0] || "root"
    const current = moduleCount.get(moduleName) || { fileCount: 0, sampleFile: file.path }
    current.fileCount += 1
    moduleCount.set(moduleName, current)
  })

  const model: VisualizerRepositoryModel = {
    repoName,
    source,
    commitSha,
    defaultBranch,
    rootPath: repoRoot,
    files,
    frameworks,
    languages,
    routes,
    apiRoutes,
    topLevelModules: Array.from(moduleCount.entries()).map(([name, value]) => ({
      name,
      fileCount: value.fileCount,
      sampleFile: value.sampleFile,
    })),
    agentLinks: extractAgentLinks(files),
    deploymentSignals: detectDeploymentSignals(files),
  }

  input.progress(`Scanning complete: ${files.length} files analyzed.`)

  return { model, tempRoot }
}
