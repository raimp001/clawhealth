"use client"

import { OPENCLAW_CONFIG } from "@/lib/openclaw/config"
import { cn } from "@/lib/utils"
import { Bot, Wifi, WifiOff, Zap, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

export default function AgentBar() {
  const [status, setStatus] = useState<"checking" | "online" | "demo">("checking")
  const [expanded, setExpanded] = useState(false)
  const [recentAction, setRecentAction] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/openclaw/status")
      .then((r) => r.json())
      .then((d) => {
        setStatus(d.connected ? "online" : "demo")
      })
      .catch(() => setStatus("demo"))
  }, [])

  // Poll real agent actions (falls back to demo if none)
  useEffect(() => {
    const demoActions = [
      "Your appointment reminder sent for tomorrow",
      "Checked your latest bill — looks correct",
      "Refill for Metformin ready at Walgreens",
      "Cholesterol screening due — want me to book it?",
    ]
    let demoIdx = 0

    const poll = async () => {
      try {
        const res = await fetch("/api/openclaw/actions?limit=1")
        const data = await res.json()
        if (data.actions?.length > 0) {
          const a = data.actions[0]
          setRecentAction(`${a.agentName}: ${a.action} — ${a.detail.slice(0, 60)}`)
          return
        }
      } catch {}
      // Fallback to demo
      setRecentAction(demoActions[demoIdx % demoActions.length])
      demoIdx++
    }

    poll()
    const interval = setInterval(poll, 6000)
    return () => clearInterval(interval)
  }, [status])

  return (
    <div className="bg-[#050A15] text-white/90">
      {/* Compact bar */}
      <div className="flex items-center justify-between px-4 lg:px-6 h-9">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Bot size={12} className="text-terra-light" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-terra-light">
              OpenClaw
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {status === "online" ? (
              <Wifi size={9} className="text-accent" />
            ) : status === "demo" ? (
              <WifiOff size={9} className="text-terra-light" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            )}
            <span className="text-[10px] text-white/50">
              {status === "online" ? "Live" : status === "demo" ? "Demo" : "..."}
            </span>
          </div>
          {recentAction && (
            <div className="hidden lg:flex items-center gap-1.5 ml-2 animate-fade-in">
              <Zap size={9} className="text-yellow-400" />
              <span className="text-[10px] text-white/60 truncate max-w-md">
                {recentAction}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/chat"
            className="text-[10px] font-semibold text-terra-light hover:text-white transition"
          >
            Open Agent
          </Link>
          <button
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Collapse agent panel" : "Expand agent panel"}
            className="p-0.5 hover:bg-white/10 rounded transition"
          >
            {expanded ? (
              <ChevronUp size={12} className="text-white/50" />
            ) : (
              <ChevronDown size={12} className="text-white/50" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 lg:px-6 pb-3 border-t border-white/5 animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 mt-2">
            {OPENCLAW_CONFIG.agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="text-[10px] font-medium text-white/70">
                  {agent.name.replace("OpenRx ", "")}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-2 text-[9px] text-white/40">
            <span>{OPENCLAW_CONFIG.cronJobs.length} automations active</span>
            <span>
              {Object.values(OPENCLAW_CONFIG.channels).filter((c) => c.enabled).length} channels
            </span>
            <span>Multi-agent routing enabled</span>
          </div>
        </div>
      )}
    </div>
  )
}
