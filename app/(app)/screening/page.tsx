"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  Activity,
  AlertTriangle,
  HeartPulse,
  Loader2,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
} from "lucide-react"
import AIAction from "@/components/ai-action"
import { currentUser } from "@/lib/current-user"
import { cn } from "@/lib/utils"
import type { ScreeningAssessment } from "@/lib/basehealth"
import type { CareDirectoryMatch, CareSearchType } from "@/lib/npi-care-search"

interface LocalCareConnection {
  recommendationId: string
  recommendationName: string
  reason: string
  services: CareSearchType[]
  query: string
  riskContext: string
  ready: boolean
  clarificationQuestion?: string
  prompt: {
    id: string
    image: string
    text: string
  }
  matches: CareDirectoryMatch[]
}

type ScreeningResponse = ScreeningAssessment & {
  localCareConnections?: LocalCareConnection[]
}

export default function ScreeningPage() {
  const [assessment, setAssessment] = useState<ScreeningAssessment | null>(null)
  const [localCareConnections, setLocalCareConnections] = useState<LocalCareConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [symptoms, setSymptoms] = useState("")
  const [familyHistory, setFamilyHistory] = useState("")
  const [bmi, setBmi] = useState("")
  const [smoker, setSmoker] = useState(false)

  const riskStyle = useMemo(() => {
    if (!assessment) return "bg-sand text-warm-500"
    if (assessment.riskTier === "high") return "bg-soft-red/10 text-soft-red"
    if (assessment.riskTier === "moderate") return "bg-yellow-200/20 text-yellow-500"
    return "bg-accent/10 text-accent"
  }, [assessment])

  const riskBarStyle = useMemo(() => {
    if (!assessment) return "bg-sand"
    if (assessment.riskTier === "high") return "bg-soft-red"
    if (assessment.riskTier === "moderate") return "bg-yellow-500"
    return "bg-accent"
  }, [assessment])

  const promptImage = useMemo(
    () => localCareConnections.find((connection) => connection.prompt?.image)?.prompt.image || "",
    [localCareConnections]
  )

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/screening/assess")
        const data = (await response.json()) as ScreeningResponse
        setAssessment(data)
        setLocalCareConnections(data.localCareConnections || [])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  async function runScreening() {
    setRunning(true)
    try {
      const response = await fetch("/api/screening/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: currentUser.id,
          bmi: bmi ? Number(bmi) : undefined,
          smoker,
          symptoms: symptoms
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          familyHistory: familyHistory
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      })
      const data = (await response.json()) as ScreeningResponse
      setAssessment(data)
      setLocalCareConnections(data.localCareConnections || [])
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif text-warm-800">AI Health Screening</h1>
          <p className="text-sm text-warm-500 mt-1">
            BaseHealth-style risk triage layered onto your OpenRx profile.
          </p>
        </div>
        <AIAction
          agentId="screening"
          label="Explain My Risk"
          prompt="Summarize my screening risk score, key drivers, and what I should do first."
        />
      </div>

      <div className="bg-terra/10 rounded-2xl border border-terra/20 p-4 flex items-start gap-3">
        <HeartPulse size={18} className="text-terra shrink-0 mt-0.5" />
        <p className="text-xs text-warm-600 leading-relaxed">
          This screen prioritizes prevention and routing only. It does not diagnose disease.
          For severe symptoms, use triage immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-pampas rounded-2xl border border-sand p-5">
          <h2 className="text-sm font-bold text-warm-800 mb-3">Run Screening</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs text-warm-600">
              Symptoms (comma separated)
              <input
                value={symptoms}
                onChange={(event) => setSymptoms(event.target.value)}
                placeholder="fatigue, chest discomfort, dizziness"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-sand bg-cream/30 text-sm text-warm-800 placeholder:text-cloudy focus:outline-none focus:border-terra/40"
              />
            </label>
            <label className="text-xs text-warm-600">
              Family history risks
              <input
                value={familyHistory}
                onChange={(event) => setFamilyHistory(event.target.value)}
                placeholder="heart disease, stroke, diabetes"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-sand bg-cream/30 text-sm text-warm-800 placeholder:text-cloudy focus:outline-none focus:border-terra/40"
              />
            </label>
            <label className="text-xs text-warm-600">
              BMI (optional)
              <input
                value={bmi}
                onChange={(event) => setBmi(event.target.value)}
                inputMode="decimal"
                placeholder="29.4"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-sand bg-cream/30 text-sm text-warm-800 placeholder:text-cloudy focus:outline-none focus:border-terra/40"
              />
            </label>
            <label className="text-xs text-warm-600 flex items-end">
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-sand bg-cream/30 text-sm text-warm-700">
                <input
                  checked={smoker}
                  onChange={(event) => setSmoker(event.target.checked)}
                  type="checkbox"
                  className="accent-terra"
                />
                Current smoker
              </span>
            </label>
          </div>
          <button
            onClick={runScreening}
            disabled={running}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-terra text-white text-sm font-semibold hover:bg-terra-dark disabled:opacity-60 transition"
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
            Recalculate Screening Risk
          </button>
        </div>

        <div className="bg-pampas rounded-2xl border border-sand p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-warm-800">Risk Snapshot</h2>
            {assessment && (
              <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full uppercase", riskStyle)}>
                {assessment.riskTier}
              </span>
            )}
          </div>
          {loading || !assessment ? (
            <div className="h-24 flex items-center justify-center text-xs text-cloudy">
              <Loader2 size={14} className="animate-spin mr-2" /> Loading screening profile...
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold text-warm-800">{assessment.overallRiskScore}</div>
              <div className="text-xs text-warm-500">Overall preventive risk score</div>
              <div className="mt-3 h-2 rounded-full bg-sand/50 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", riskBarStyle)}
                  style={{ width: `${assessment.overallRiskScore}%` }}
                />
              </div>
              <div className="mt-3 space-y-1">
                {assessment.factors.slice(0, 3).map((factor) => (
                  <div
                    key={factor.label}
                    className="flex items-start justify-between text-[11px] text-warm-600"
                  >
                    <span>{factor.label}</span>
                    <span className="font-semibold">{factor.scoreDelta > 0 ? `+${factor.scoreDelta}` : factor.scoreDelta}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {assessment && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-pampas rounded-2xl border border-sand p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={14} className="text-terra" />
              <h2 className="text-sm font-bold text-warm-800">Recommended Screenings</h2>
            </div>
            <div className="space-y-2">
              {assessment.recommendedScreenings.map((rec) => (
                <div key={rec.id} className="rounded-xl border border-sand/70 bg-cream/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-warm-800">{rec.name}</p>
                    <span
                      className={cn(
                        "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase",
                        rec.priority === "high"
                          ? "bg-soft-red/10 text-soft-red"
                          : rec.priority === "medium"
                          ? "bg-yellow-100/20 text-yellow-500"
                          : "bg-accent/10 text-accent"
                      )}
                    >
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-xs text-warm-500 mt-1">{rec.reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-pampas rounded-2xl border border-sand p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-yellow-500" />
              <h2 className="text-sm font-bold text-warm-800">Immediate Next Actions</h2>
            </div>
            <ul className="space-y-2">
              {assessment.nextActions.map((action) => (
                <li key={action} className="text-sm text-warm-600 rounded-xl border border-sand/70 bg-cream/30 p-3">
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {assessment && (
        <div className="bg-pampas rounded-2xl border border-sand p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Search size={14} className="text-terra" />
            <h2 className="text-sm font-bold text-warm-800">
              Nearby Care Matches For This Screening
            </h2>
          </div>
          <p className="text-xs text-warm-500">
            Personalized matches use your risk profile, recommendation priority, and address to run natural-language NPI search.
          </p>

          {promptImage && (
            <div className="rounded-xl overflow-hidden border border-sand/70">
              <Image
                src={promptImage}
                width={1400}
                height={980}
                alt="Natural-language NPI screening prompt"
                className="w-full h-auto"
              />
            </div>
          )}

          <div className="space-y-3">
            {localCareConnections.map((connection) => (
              <div
                key={connection.recommendationId}
                className="rounded-xl border border-sand/70 bg-cream/30 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-warm-800">
                    {connection.recommendationName}
                  </p>
                  {connection.services.map((service) => (
                    <span
                      key={`${connection.recommendationId}-${service}`}
                      className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-terra/10 text-terra"
                    >
                      {service}
                    </span>
                  ))}
                </div>

                <p className="text-xs text-warm-500 mt-1">{connection.reason}</p>
                <p className="text-[10px] text-cloudy mt-1">{connection.riskContext}</p>
                <p className="text-[10px] font-mono text-terra mt-2">{connection.query}</p>

                {!connection.ready && (
                  <p className="text-xs text-yellow-500 mt-2">
                    {connection.clarificationQuestion || "Missing location/service details for nearby search."}
                  </p>
                )}

                {connection.ready && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                    {connection.matches.slice(0, 6).map((match) => (
                      <div
                        key={`${connection.recommendationId}-${match.kind}-${match.npi}`}
                        className="rounded-lg border border-sand/60 bg-pampas p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-warm-800">{match.name}</p>
                          <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-accent/10 text-accent font-bold">
                            {match.kind}
                          </span>
                        </div>
                        <p className="text-[11px] text-terra mt-1">{match.specialty || "General"}</p>
                        <p className="text-[11px] text-warm-500 mt-1 flex items-start gap-1">
                          <MapPin size={11} className="mt-0.5 shrink-0" />
                          {match.fullAddress}
                        </p>
                        {match.phone && (
                          <p className="text-[11px] text-warm-500 mt-1 flex items-center gap-1">
                            <Phone size={11} />
                            {match.phone}
                          </p>
                        )}
                        <p className="text-[10px] font-mono text-cloudy mt-1">NPI {match.npi}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {localCareConnections.length === 0 && (
              <p className="text-xs text-cloudy">
                Nearby matching will appear after screening recommendations are generated.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
