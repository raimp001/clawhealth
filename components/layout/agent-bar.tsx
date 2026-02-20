"use client"

import { OPENCLAW_CONFIG } from "@/lib/openclaw/config"
import { cn } from "@/lib/utils"
import { Bot, Wifi, WifiOff, Zap, ChevronDown, ChevronUp, ArrowRight, TrendingUp, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { getImprovementMetrics, getImprovements, runImprovementCycle } from "@/lib/openclaw/self-improve"
import { getRecentMessages, getActiveTasks } from "@/lib/openclaw/orchestrator"

export default function AgentBar() {
  const [status, setStatus] = useState<"checking" | "online" | "demo">("checking")
  const [expanded, setExpanded] = useState(false)
  const [recentAction, setRecentAction] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<ReturnType<typeof getImprovementMetrics> | null>(null)
  const [activeTasks, setActiveTasks] = useState(0)
  const [interAgentMessages, setInterAgentMessages] = useState(0)

  useEffect(() => {
    fetch("/api/openclaw/status")
      .then((r) => r.json())
      .then((d) => {
        setStatus(d.connected ? "online" : "demo")
      })
      .catch(() => setStatus("demo"))
  }, [])

  // Load improvement metrics and run improvement cycle
  useEffect(() => {
    runImprovementCycle()
    setMetrics(getImprovementMetrics())
    setActiveTasks(getActiveTasks().length)
    setInterAgentMessages(getRecentMessages(100).length)
  }, [])

  // Simulate periodic agent activity with real collaboration context
  useEffect(() => {
    if (status !== "demo") return
    const actions = [
      { text: "Atlas routed billing query to Vera" },
      { text: "Maya checked your medication adherence — 92%" },
      { text: "Cal confirmed your appointment for Thursday" },
      { text: "Vera found a billing error — filing correction" },
      { text: "Ivy: Your cholesterol screening is overdue" },
      { text: "Rex submitted prior auth — awaiting response" },
      { text: "Bolt deployed performance improvement" },
      { text: "Nova triaged symptom report — routine" },
    ]
    let idx = 0
    const interval = setInterval(() => {
      setRecentAction(actions[idx % actions.length].text)
      setInterAgentMessages((prev) => prev + 1)
      idx++
    }, 6000)
    return () => clearInterval(interval)
  }, [status])

  const inProgressImprovements = getImprovements({ status: "in_progress" })
  const approvedImprovements = getImprovements({ status: "approved" })

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

          {/* Inter-agent activity count */}
          <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-white/40">
            <Zap size={8} className="text-yellow-400" />
            <span>{interAgentMessages} agent messages</span>
            {activeTasks > 0 && (
              <>
                <span className="text-white/20">|</span>
                <span>{activeTasks} active tasks</span>
              </>
            )}
          </div>

          {recentAction && (
            <div className="hidden xl:flex items-center gap-1.5 ml-2 animate-fade-in">
              <ArrowRight size={8} className="text-terra-light" />
              <span className="text-[10px] text-white/60 truncate max-w-md">
                {recentAction}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Self-improvement badge */}
          {metrics && metrics.totalDeployed > 0 && (
            <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded bg-accent/10 text-[9px] text-accent font-semibold">
              <TrendingUp size={8} />
              {metrics.totalDeployed} improvements deployed
            </div>
          )}

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
          {/* Agent grid */}
          <div className="grid grid-cols-3 lg:grid-cols-9 gap-2 mt-2">
            {OPENCLAW_CONFIG.agents.map((agent) => (
              <div
                key={agent.id}
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="text-[10px] font-medium text-white/70">
                  {agent.name}
                </span>
                <span className="text-[8px] text-white/40">{agent.role}</span>
              </div>
            ))}
          </div>

          {/* Collaboration & Improvements row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
            {/* Agent collaboration info */}
            <div className="rounded-lg bg-white/5 p-2.5">
              <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">
                Agent Collaboration
              </span>
              <div className="flex items-center gap-4 mt-1.5 text-[10px] text-white/60">
                <span>{OPENCLAW_CONFIG.cronJobs.length} automations active</span>
                <span>
                  {Object.values(OPENCLAW_CONFIG.channels).filter((c) => c.enabled).length} channels
                </span>
                <span>Multi-agent routing enabled</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-[9px] text-white/40">
                <span>Atlas orchestrates all routing</span>
                <span className="text-white/20">|</span>
                <span>9 agents can cross-communicate</span>
              </div>
            </div>

            {/* Self-improvement status */}
            <div className="rounded-lg bg-white/5 p-2.5">
              <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">
                Self-Improvement Pipeline
              </span>
              <div className="flex items-center gap-3 mt-1.5">
                {inProgressImprovements.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-yellow-400">
                    <Zap size={8} />
                    <span>{inProgressImprovements.length} in progress</span>
                  </div>
                )}
                {approvedImprovements.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-accent">
                    <CheckCircle2 size={8} />
                    <span>{approvedImprovements.length} approved</span>
                  </div>
                )}
                {metrics && (
                  <div className="flex items-center gap-1 text-[10px] text-white/40">
                    <TrendingUp size={8} />
                    <span>{metrics.totalSuggested} total suggestions</span>
                  </div>
                )}
              </div>
              {inProgressImprovements.length > 0 && (
                <p className="text-[9px] text-white/40 mt-1 truncate">
                  Working on: {inProgressImprovements[0].title}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
