"use client"

import { cn } from "@/lib/utils"
import { Bot, Loader2, X, Zap } from "lucide-react"
import { useState, useCallback } from "react"
import type { AgentId } from "@/lib/openclaw/config"

interface AIActionProps {
  agentId: AgentId
  label: string
  prompt: string
  context?: string // additional context to pass to the agent
  variant?: "button" | "inline" | "compact"
  className?: string
}

export default function AIAction({
  agentId,
  label,
  prompt,
  context,
  variant = "button",
  className,
}: AIActionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runAction = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setResponse(null)
    setIsOpen(true)

    try {
      const fullPrompt = context ? `${prompt}\n\nContext: ${context}` : prompt
      const res = await fetch("/api/openclaw/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: fullPrompt, agentId }),
      })
      const data = await res.json()
      setResponse(data.response || "No response received.")
    } catch {
      setError("Failed to connect to AI agent. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [agentId, prompt, context])

  if (variant === "compact") {
    return (
      <>
        <button
          onClick={runAction}
          disabled={isLoading}
          aria-label={label}
          className={cn(
            "flex items-center gap-1 text-[10px] font-bold text-terra hover:text-terra-dark transition disabled:opacity-50",
            className
          )}
        >
          {isLoading ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <Zap size={10} />
          )}
          {label}
        </button>

        {isOpen && (
          <AIResponsePanel
            response={response}
            error={error}
            isLoading={isLoading}
            onClose={() => setIsOpen(false)}
          />
        )}
      </>
    )
  }

  if (variant === "inline") {
    return (
      <div className={className}>
        <button
          onClick={runAction}
          disabled={isLoading}
          aria-label={label}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-terra/5 border border-terra/10 text-[10px] font-bold text-terra hover:bg-terra/10 transition disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <Bot size={10} />
          )}
          {label}
        </button>

        {isOpen && response && (
          <div className="mt-2 p-3 rounded-lg bg-terra/5 border border-terra/10 animate-fade-in">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-bold text-terra uppercase tracking-wider">
                AI Response
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-cloudy hover:text-warm-600 transition"
              >
                <X size={10} />
              </button>
            </div>
            <p className="text-xs text-warm-700 leading-relaxed whitespace-pre-line">
              {response}
            </p>
          </div>
        )}

        {isOpen && error && (
          <div className="mt-2 p-2 rounded-lg bg-soft-red/5 border border-soft-red/10">
            <p className="text-[10px] text-soft-red">{error}</p>
          </div>
        )}
      </div>
    )
  }

  // Default "button" variant
  return (
    <>
      <button
        onClick={runAction}
        disabled={isLoading}
        aria-label={label}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl bg-terra/5 border border-terra/10 text-xs font-semibold text-terra hover:bg-terra/10 transition disabled:opacity-50",
          className
        )}
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Bot size={14} />
        )}
        {label}
      </button>

      {isOpen && (
        <AIResponsePanel
          response={response}
          error={error}
          isLoading={isLoading}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

function AIResponsePanel({
  response,
  error,
  isLoading,
  onClose,
}: {
  response: string | null
  error: string | null
  isLoading: boolean
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
      <div className="bg-pampas rounded-2xl border border-sand shadow-xl max-w-lg w-full max-h-[60vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-sand">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-terra" />
            <span className="text-sm font-bold text-warm-800">AI Agent Response</span>
            <span className="text-[9px] font-bold text-terra bg-terra/10 px-1.5 py-0.5 rounded">
              OPENCLAW
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close AI response"
            className="p-1 hover:bg-cream rounded-lg transition"
          >
            <X size={16} className="text-warm-500" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[50vh]">
          {isLoading && (
            <div className="flex items-center gap-3 py-8 justify-center">
              <Loader2 size={20} className="text-terra animate-spin" />
              <span className="text-sm text-warm-500">Agent is analyzing...</span>
            </div>
          )}
          {response && (
            <p className="text-sm text-warm-700 leading-relaxed whitespace-pre-line">
              {response}
            </p>
          )}
          {error && (
            <p className="text-sm text-soft-red">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
