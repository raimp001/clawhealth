"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import {
  Activity,
  AlertTriangle,
  CreditCard,
  ExternalLink,
  HeartPulse,
  Loader2,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react"
import AIAction from "@/components/ai-action"
import { cn } from "@/lib/utils"
import type { ScreeningAssessment } from "@/lib/basehealth"
import type { CareDirectoryMatch, CareSearchType } from "@/lib/npi-care-search"
import type { ScreeningEvidenceCitation } from "@/lib/screening-evidence"
import type { ScreeningIntakeResult } from "@/lib/screening-intake"
import type { PaymentRecord } from "@/lib/payments-ledger"
import { useLiveSnapshot } from "@/lib/hooks/use-live-snapshot"
import { useWalletIdentity } from "@/lib/wallet-context"

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

type ScreeningAnalysisLevel = "preview" | "deep"

type ScreeningResponse = ScreeningAssessment & {
  localCareConnections?: LocalCareConnection[]
  evidenceCitations?: ScreeningEvidenceCitation[]
  accessLevel?: ScreeningAnalysisLevel
  isPreview?: boolean
  upgradeMessage?: string
  requiresPayment?: boolean
  fee?: string
  currency?: string
  recipientAddress?: string
  error?: string
}

type ScreeningIntakeResponse = ScreeningIntakeResult & {
  error?: string
}

export default function ScreeningPage() {
  const { snapshot } = useLiveSnapshot()
  const { walletAddress, isConnected } = useWalletIdentity()
  const [assessment, setAssessment] = useState<ScreeningResponse | null>(null)
  const [localCareConnections, setLocalCareConnections] = useState<LocalCareConnection[]>([])
  const [evidenceCitations, setEvidenceCitations] = useState<ScreeningEvidenceCitation[]>([])
  const [running, setRunning] = useState(false)
  const [age, setAge] = useState("")
  const [symptoms, setSymptoms] = useState("")
  const [familyHistory, setFamilyHistory] = useState("")
  const [conditions, setConditions] = useState("")
  const [bmi, setBmi] = useState("")
  const [smoker, setSmoker] = useState(false)
  const [narrative, setNarrative] = useState("")
  const [parsingNarrative, setParsingNarrative] = useState(false)
  const [intakeFeedback, setIntakeFeedback] = useState("")

  const [paymentIntent, setPaymentIntent] = useState<PaymentRecord | null>(null)
  const [paymentId, setPaymentId] = useState("")
  const [verifyTxHash, setVerifyTxHash] = useState("")
  const [fee, setFee] = useState("1.00")
  const [recipientAddress, setRecipientAddress] = useState("")
  const [showPaymentGate, setShowPaymentGate] = useState(false)
  const [paymentReady, setPaymentReady] = useState(false)
  const [creatingIntent, setCreatingIntent] = useState(false)
  const [launchingPay, setLaunchingPay] = useState(false)
  const [verifyingPayment, setVerifyingPayment] = useState(false)
  const [error, setError] = useState("")

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
  const accessLevel: ScreeningAnalysisLevel = assessment?.accessLevel === "deep" ? "deep" : "preview"
  const showingDeepResults = accessLevel === "deep"
  const paymentGateVisible =
    showPaymentGate || accessLevel === "preview" || !!paymentIntent || paymentReady

  function applyPaymentRequired(data: ScreeningResponse) {
    setPaymentReady(false)
    setShowPaymentGate(true)
    if (data.fee) setFee(data.fee)
    if (data.recipientAddress) setRecipientAddress(data.recipientAddress)
    setError(data.error || "Payment is required before personalized recommendations are generated.")
  }

  async function createScreeningPaymentIntent() {
    if (!walletAddress) {
      setError("Connect your wallet before creating a screening payment intent.")
      return
    }

    setCreatingIntent(true)
    setShowPaymentGate(true)
    setError("")
    try {
      const response = await fetch("/api/screening/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      })
      const data = (await response.json()) as {
        error?: string
        payment?: PaymentRecord
        fee?: string
        recipientAddress?: string
      }
      if (!response.ok || data.error || !data.payment) {
        throw new Error(data.error || "Failed to create screening payment intent.")
      }

      setPaymentIntent(data.payment)
      setPaymentId(data.payment.id)
      setFee(data.fee || fee)
      setRecipientAddress(data.recipientAddress || data.payment.recipientAddress)
      setVerifyTxHash("")
      setPaymentReady(false)
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Failed to create screening payment intent.")
    } finally {
      setCreatingIntent(false)
    }
  }

  async function launchBasePay() {
    if (!paymentIntent) {
      setError("Create a screening payment intent first.")
      return
    }

    setLaunchingPay(true)
    setError("")
    try {
      const { pay } = await import("@base-org/account")
      const result = await pay({
        amount: paymentIntent.expectedAmount,
        to: paymentIntent.recipientAddress,
      })
      setVerifyTxHash(result.id)
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Failed to launch Base Pay.")
    } finally {
      setLaunchingPay(false)
    }
  }

  async function verifyScreeningPayment() {
    if (!walletAddress) {
      setError("Connect your wallet before verification.")
      return
    }
    if (!paymentIntent || !paymentId) {
      setError("Create a payment intent first.")
      return
    }
    if (!verifyTxHash.trim()) {
      setError("Paste a transaction hash to verify payment.")
      return
    }

    setVerifyingPayment(true)
    setError("")
    try {
      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          txHash: verifyTxHash.trim(),
          walletAddress,
          expectedAmount: paymentIntent.expectedAmount,
          expectedRecipient: paymentIntent.recipientAddress,
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok || data.error) {
        throw new Error(data.error || "Payment verification failed.")
      }
      setPaymentReady(true)
    } catch (issue) {
      setPaymentReady(false)
      setError(issue instanceof Error ? issue.message : "Payment verification failed.")
    } finally {
      setVerifyingPayment(false)
    }
  }

  async function parseNarrativeIntake() {
    if (!narrative.trim()) {
      setIntakeFeedback("Describe your health history so intake can parse the details.")
      return
    }

    setParsingNarrative(true)
    setError("")
    setIntakeFeedback("")
    try {
      const response = await fetch("/api/screening/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrative }),
      })
      const data = (await response.json()) as ScreeningIntakeResponse
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to parse screening narrative intake.")
      }

      if (typeof data.extracted.age === "number") {
        setAge(String(data.extracted.age))
      }
      if (typeof data.extracted.bmi === "number") {
        setBmi(String(data.extracted.bmi))
      }
      if (typeof data.extracted.smoker === "boolean") {
        setSmoker(data.extracted.smoker)
      }
      if (data.extracted.symptoms.length > 0) {
        setSymptoms(data.extracted.symptoms.join(", "))
      }
      if (data.extracted.familyHistory.length > 0) {
        setFamilyHistory(data.extracted.familyHistory.join(", "))
      }
      if (data.extracted.conditions.length > 0) {
        setConditions(data.extracted.conditions.join(", "))
      }

      if (data.ready) {
        setIntakeFeedback("Intake parsed. You can review the auto-filled fields and run screening.")
      } else {
        setIntakeFeedback(
          data.clarificationQuestion ||
            "Intake parsed partially. Add missing risk details and parse again."
        )
      }
    } catch (issue) {
      setIntakeFeedback("")
      setError(issue instanceof Error ? issue.message : "Failed to parse screening narrative intake.")
    } finally {
      setParsingNarrative(false)
    }
  }

  async function runScreening(level: ScreeningAnalysisLevel) {
    if (level === "deep" && (!paymentReady || !paymentId)) {
      setShowPaymentGate(true)
      setError("Verify Base Pay before running the deep personalized/genetics recommendation set.")
      return
    }

    setRunning(true)
    setError("")
    try {
      const response = await fetch("/api/screening/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: snapshot.patient?.id,
          walletAddress,
          paymentId: level === "deep" ? paymentId : undefined,
          analysisLevel: level,
          age: age ? Number(age) : undefined,
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
          conditions: conditions
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      })

      const data = (await response.json()) as ScreeningResponse
      if (response.status === 402 || data.requiresPayment) {
        applyPaymentRequired(data)
        return
      }
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to compute screening assessment.")
      }

      setAssessment(data)
      setLocalCareConnections(data.localCareConnections || [])
      setEvidenceCitations(data.evidenceCitations || [])
      if (data.accessLevel === "preview") {
        setShowPaymentGate(true)
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Failed to compute screening assessment.")
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
            Start with a free USPSTF preview, then unlock paid genetics-aware deep dive recommendations.
          </p>
        </div>
        <AIAction
          agentId="screening"
          label="Explain My Risk"
          prompt="Summarize my screening risk score, key drivers, evidence links, and what I should do first."
        />
      </div>

      <div className="bg-terra/10 rounded-2xl border border-terra/20 p-4 flex items-start gap-3">
        <HeartPulse size={18} className="text-terra shrink-0 mt-0.5" />
        <p className="text-xs text-warm-600 leading-relaxed">
          Free mode provides USPSTF-oriented screening guidance. Deep mode adds mutation-aware personalization,
          PubMed-backed evidence synthesis, and local care routing after verified Base Pay ({fee} USDC).
        </p>
      </div>

      {!isConnected && (
        <div className="bg-yellow-100/20 border border-yellow-300/30 rounded-xl p-3 text-xs text-warm-600">
          Connect a wallet when you are ready to unlock paid deep-dive screening.
        </div>
      )}

      {error && (
        <div className="bg-soft-red/5 border border-soft-red/20 rounded-xl p-3 text-xs text-soft-red">
          {error}
        </div>
      )}

      {paymentGateVisible && (
        <div className="bg-pampas rounded-2xl border border-sand p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard size={14} className="text-terra" />
            <h2 className="text-sm font-bold text-warm-800">Unlock Deep Dive (Base Pay)</h2>
            {paymentReady && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent uppercase">
                verified
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="rounded-xl border border-sand/70 bg-cream/30 p-3 text-xs text-warm-600">
              <p><span className="font-semibold text-warm-800">Fee:</span> {fee} USDC</p>
              <p className="mt-1 break-all"><span className="font-semibold text-warm-800">Recipient:</span> {recipientAddress || "Set after intent creation"}</p>
              {paymentIntent && <p className="mt-1"><span className="font-semibold text-warm-800">Payment ID:</span> {paymentIntent.id}</p>}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => void createScreeningPaymentIntent()}
                disabled={!walletAddress || creatingIntent}
                className="w-full px-3 py-2 rounded-lg bg-terra text-white text-xs font-semibold hover:bg-terra-dark transition disabled:opacity-60"
              >
                {creatingIntent ? "Creating intent..." : "1) Create Intent"}
              </button>
              <button
                onClick={() => void launchBasePay()}
                disabled={!paymentIntent || launchingPay}
                className="w-full px-3 py-2 rounded-lg border border-sand text-xs font-semibold text-warm-700 hover:border-terra/30 transition disabled:opacity-60"
              >
                {launchingPay ? "Launching..." : "2) Launch Base Pay"}
              </button>
            </div>

            <div className="space-y-2">
              <input
                value={verifyTxHash}
                onChange={(event) => setVerifyTxHash(event.target.value)}
                placeholder="Paste transaction hash"
                className="w-full px-3 py-2 rounded-lg border border-sand bg-cream/30 text-xs text-warm-800 focus:outline-none focus:border-terra/40"
              />
              <button
                onClick={() => void verifyScreeningPayment()}
                disabled={!paymentIntent || verifyingPayment}
                className="w-full px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-60"
              >
                {verifyingPayment ? "Verifying..." : "3) Verify Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-pampas rounded-2xl border border-sand p-5">
          <h2 className="text-sm font-bold text-warm-800 mb-3">Screening Intake</h2>
          <div className="rounded-xl border border-sand/70 bg-cream/30 p-3 mb-3 space-y-2">
            <label className="text-xs text-warm-600 block">
              Natural-language intake
              <textarea
                value={narrative}
                onChange={(event) => setNarrative(event.target.value)}
                rows={4}
                placeholder="Example: I am a 62-year-old woman with BRCA2 mutation, prior hypertension, former smoker, and family history of breast cancer."
                className="mt-1 w-full px-3 py-2 rounded-lg border border-sand bg-pampas text-sm text-warm-800 placeholder:text-cloudy focus:outline-none focus:border-terra/40 resize-y"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => void parseNarrativeIntake()}
                disabled={parsingNarrative}
                className="px-3 py-2 rounded-lg border border-sand text-xs font-semibold text-warm-700 hover:border-terra/30 transition disabled:opacity-60"
              >
                {parsingNarrative ? "Parsing intake..." : "Parse Intake"}
              </button>
              {intakeFeedback && <p className="text-[11px] text-warm-500">{intakeFeedback}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs text-warm-600">
              Age (optional)
              <input
                value={age}
                onChange={(event) => setAge(event.target.value)}
                inputMode="numeric"
                placeholder="62"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-sand bg-cream/30 text-sm text-warm-800 placeholder:text-cloudy focus:outline-none focus:border-terra/40"
              />
            </label>
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
            <label className="text-xs text-warm-600 md:col-span-2">
              Conditions / mutations (comma separated)
              <input
                value={conditions}
                onChange={(event) => setConditions(event.target.value)}
                placeholder="diabetes, hypertension, BRCA2 mutation carrier"
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
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => void runScreening("preview")}
              disabled={running}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-terra text-white text-sm font-semibold hover:bg-terra-dark disabled:opacity-60 transition"
            >
              {running ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
              Get USPSTF Preview (Free)
            </button>
            {(assessment?.accessLevel === "preview" || paymentIntent || paymentReady) && (
              <button
                onClick={() => void runScreening("deep")}
                disabled={running || !paymentReady}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sand text-sm font-semibold text-warm-700 hover:border-terra/30 transition disabled:opacity-60"
              >
                {running ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                Generate Deep Dive (Paid)
              </button>
            )}
          </div>
          {assessment?.accessLevel === "preview" && (
            <p className="text-[11px] text-cloudy mt-2">
              {assessment.upgradeMessage ||
                "Free preview is ready. Complete Base Pay to unlock mutation-aware deep personalization."}
            </p>
          )}
          {(assessment?.accessLevel === "preview" || paymentIntent) && !paymentReady && (
            <p className="text-[11px] text-cloudy mt-1">Deep dive requires verified payment before release.</p>
          )}
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
          {!assessment ? (
            <div className="h-24 flex items-center justify-center text-xs text-cloudy">
              <Wallet size={14} className="mr-2" /> Run free preview to generate baseline screening guidance.
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

      {assessment && evidenceCitations.length > 0 && (
        <div className="bg-pampas rounded-2xl border border-sand p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Search size={14} className="text-terra" />
            <h2 className="text-sm font-bold text-warm-800">Evidence Sources</h2>
          </div>
          <p className="text-xs text-warm-500">
            {showingDeepResults
              ? "Guideline and literature links supporting the deep personalized recommendation set."
              : "Free preview currently shows USPSTF guideline sources."}
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {evidenceCitations.map((citation) => (
              <a
                key={citation.id}
                href={citation.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-sand/70 bg-cream/30 p-3 hover:border-terra/30 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-warm-800">{citation.title}</p>
                  <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-terra/10 text-terra">
                    {citation.type}
                  </span>
                </div>
                <p className="text-[11px] text-warm-500 mt-1">{citation.source}</p>
                {citation.publishedAt && <p className="text-[10px] text-cloudy mt-0.5">{citation.publishedAt}</p>}
                <p className="text-[11px] text-warm-600 mt-1">{citation.summary}</p>
                <span className="inline-flex items-center gap-1 text-[11px] text-terra font-semibold mt-2">
                  Open source <ExternalLink size={11} />
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {assessment && showingDeepResults && (
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
