import { NextRequest, NextResponse } from "next/server"
import type { VisualizerFocusArea } from "@/lib/codebase-visualizer/types"
import {
  enforceVisualizerRateLimit,
  getMappingById,
  mapCodebaseWithAiAgent,
} from "@/lib/codebase-visualizer/service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for") || ""
  return forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
}

function parseFocusAreas(raw: string | null): VisualizerFocusArea[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as VisualizerFocusArea[]) : []
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const mappingId = new URL(request.url).searchParams.get("mappingId")
  if (!mappingId) {
    return NextResponse.json({ error: "mappingId is required." }, { status: 400 })
  }

  const mapping = await getMappingById(mappingId)
  if (!mapping) {
    return NextResponse.json({ error: "Mapping not found or expired." }, { status: 404 })
  }

  return NextResponse.json(mapping)
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rate = enforceVisualizerRateLimit({ ip, action: "map" })
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded for codebase mapping requests.",
        retryAfterMs: rate.retryAfterMs,
      },
      { status: 429 }
    )
  }

  try {
    const contentType = request.headers.get("content-type") || ""

    let repoUrl = ""
    let githubToken = ""
    let focusAreas: VisualizerFocusArea[] = []
    let zipFileName = ""
    let zipFileBuffer: Buffer | undefined

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      repoUrl = String(form.get("repoUrl") || "").trim()
      githubToken = String(form.get("githubToken") || "").trim()
      focusAreas = parseFocusAreas(String(form.get("focusAreas") || "[]"))

      const archive = form.get("archive")
      if (archive && archive instanceof File && archive.size > 0) {
        zipFileName = archive.name
        zipFileBuffer = Buffer.from(await archive.arrayBuffer())
      }
    } else {
      const body = (await request.json()) as {
        repoUrl?: string
        githubToken?: string
        focusAreas?: VisualizerFocusArea[]
      }
      repoUrl = String(body.repoUrl || "").trim()
      githubToken = String(body.githubToken || "").trim()
      focusAreas = Array.isArray(body.focusAreas) ? body.focusAreas : []
    }

    if (!repoUrl && !zipFileBuffer) {
      return NextResponse.json(
        { error: "Provide a GitHub repository URL or upload a .zip file." },
        { status: 400 }
      )
    }

    const mapping = await mapCodebaseWithAiAgent({
      repoUrl,
      githubToken,
      focusAreas,
      zipFileName,
      zipFileBuffer,
      requestedByIp: ip,
    })

    return NextResponse.json(mapping)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to map codebase."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
