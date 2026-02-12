"use client"

import { CHAT_DEMOS } from "@/lib/seed-data"
import { OPENCLAW_CONFIG } from "@/lib/openclaw/config"
import { cn } from "@/lib/utils"
import {
  Bot,
  Calendar,
  Receipt,
  ShieldCheck,
  Moon,
  Pill,
  Send,
  Sparkles,
  User,
  Stethoscope,
  Loader2,
  Wifi,
  WifiOff,
  Zap,
  Clock,
  MessageSquare,
  ArrowRight,
} from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"

type AgentId = typeof OPENCLAW_CONFIG.agents[number]["id"]

interface ChatMessage {
  id: string
  role: "user" | "agent" | "system"
  content: string
  agentId?: string
  timestamp: Date
}

const agentMeta: Record<string, { label: string; icon: typeof Bot; color: string }> = {
  coordinator: { label: "ClawHealth AI", icon: Bot, color: "text-terra" },
  triage: { label: "Triage Agent", icon: Stethoscope, color: "text-soft-red" },
  scheduling: { label: "Scheduling Agent", icon: Calendar, color: "text-soft-blue" },
  billing: { label: "Billing Agent", icon: Receipt, color: "text-accent" },
  rx: { label: "Rx Manager", icon: Pill, color: "text-yellow-600" },
  "prior-auth": { label: "PA Agent", icon: ShieldCheck, color: "text-terra" },
}

const iconMap: Record<string, typeof Calendar> = {
  Calendar,
  Receipt,
  Shield: ShieldCheck,
  Moon,
  Pill,
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "agent",
      content:
        "Welcome to ClawHealth AI. I'm your healthcare coordination assistant powered by OpenClaw.\n\nI can help with:\n• 📅 Schedule appointments (insurance-aware)\n• 💳 Analyze bills & file appeals\n• 💊 Manage prescriptions & refills\n• 🛡️ Handle prior authorizations\n• 🏥 Triage symptoms\n\nHow can I help you today?",
      agentId: "coordinator",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [gatewayStatus, setGatewayStatus] = useState<"checking" | "online" | "demo">("checking")
  const [activeAgent, setActiveAgent] = useState<AgentId>("coordinator")
  const [showDemos, setShowDemos] = useState(false)
  const [activeDemo, setActiveDemo] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Check gateway status
  useEffect(() => {
    fetch("/api/openclaw/status")
      .then((r) => r.json())
      .then((d) => setGatewayStatus(d.connected ? "online" : "demo"))
      .catch(() => setGatewayStatus("demo"))
  }, [])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/openclaw/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          agentId: activeAgent,
        }),
      })

      const data = await res.json()

      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        role: "agent",
        content: data.response || data.error || "No response received.",
        agentId: activeAgent,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, agentMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "system",
          content: "Connection error. Please try again.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, activeAgent])

  const loadDemo = (demoId: string) => {
    const demo = CHAT_DEMOS.find((d) => d.id === demoId)
    if (!demo) return
    setActiveDemo(demoId)

    const demoMessages: ChatMessage[] = demo.messages.map((m, i) => ({
      id: `demo-${demoId}-${i}`,
      role: m.role === "agent" ? ("agent" as const) : ("user" as const),
      content: m.content,
      agentId: m.role === "agent" ? "coordinator" : undefined,
      timestamp: new Date(Date.now() - (demo.messages.length - i) * 60000),
    }))

    setMessages(demoMessages)
    setShowDemos(false)
  }

  return (
    <div className="animate-slide-up space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-terra to-terra-dark flex items-center justify-center">
            <Bot size={20} className="text-cream" />
          </div>
          <div>
            <h1 className="text-2xl font-serif text-warm-800">AI Agent</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {gatewayStatus === "checking" ? (
                <span className="flex items-center gap-1 text-[10px] text-cloudy">
                  <Loader2 size={10} className="animate-spin" /> Connecting...
                </span>
              ) : gatewayStatus === "online" ? (
                <span className="flex items-center gap-1 text-[10px] text-accent font-semibold">
                  <Wifi size={10} /> OpenClaw Gateway Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-terra font-semibold">
                  <WifiOff size={10} /> Demo Mode
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDemos(!showDemos)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg border transition",
              showDemos
                ? "bg-terra text-white border-terra"
                : "text-warm-600 border-sand hover:border-terra/30"
            )}
          >
            <Sparkles size={12} className="inline mr-1" />
            Demo Scenarios
          </button>
        </div>
      </div>

      {/* Demo Scenarios Dropdown */}
      {showDemos && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {CHAT_DEMOS.map((d) => {
            const Icon = iconMap[d.icon] || Bot
            return (
              <button
                key={d.id}
                onClick={() => loadDemo(d.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border",
                  activeDemo === d.id
                    ? "bg-terra text-white border-terra"
                    : "bg-white text-warm-600 border-sand hover:border-terra/30"
                )}
              >
                <Icon size={14} />
                {d.title}
              </button>
            )
          })}
        </div>
      )}

      {/* Agent Selector */}
      <div className="flex gap-1.5 flex-wrap">
        {OPENCLAW_CONFIG.agents.map((agent) => {
          const meta = agentMeta[agent.id]
          const Icon = meta?.icon || Bot
          return (
            <button
              key={agent.id}
              onClick={() => setActiveAgent(agent.id as AgentId)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border",
                activeAgent === agent.id
                  ? "bg-terra/10 text-terra border-terra/20"
                  : "text-warm-500 border-transparent hover:text-warm-700 hover:bg-cream"
              )}
            >
              <Icon size={12} className={activeAgent === agent.id ? meta?.color : ""} />
              {agent.name.replace("ClawHealth ", "")}
            </button>
          )
        })}
      </div>

      {/* Chat Window */}
      <div className="bg-white rounded-2xl border border-sand overflow-hidden flex flex-col h-[calc(100vh-340px)] min-h-[400px]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => {
            const meta = msg.agentId ? agentMeta[msg.agentId] : null
            const Icon = meta?.icon || Bot

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "flex-row-reverse" : ""
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    msg.role === "agent"
                      ? "bg-terra/10"
                      : msg.role === "system"
                      ? "bg-yellow-50"
                      : "bg-soft-blue/10"
                  )}
                >
                  {msg.role === "user" ? (
                    <User size={14} className="text-soft-blue" />
                  ) : (
                    <Icon size={14} className={meta?.color || "text-terra"} />
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3 max-w-[80%]",
                    msg.role === "user"
                      ? "bg-soft-blue/5 border-soft-blue/10"
                      : msg.role === "system"
                      ? "bg-yellow-50 border-yellow-200/50"
                      : "bg-terra/5 border-terra/10"
                  )}
                >
                  {msg.role === "agent" && meta && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider", meta.color)}>
                        {meta.label}
                      </span>
                      {gatewayStatus === "online" && (
                        <Zap size={8} className="text-accent" />
                      )}
                    </div>
                  )}
                  <p className="text-sm text-warm-700 leading-relaxed whitespace-pre-line">
                    {msg.content}
                  </p>
                  <span className="text-[9px] text-cloudy mt-1 block">
                    {msg.timestamp.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            )
          })}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-terra/10 flex items-center justify-center">
                <Bot size={14} className="text-terra" />
              </div>
              <div className="rounded-xl border bg-terra/5 border-terra/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="text-terra animate-spin" />
                  <span className="text-xs text-warm-500">Processing...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-3.5 border-t border-sand bg-cream/30">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder={`Message ${agentMeta[activeAgent]?.label || "AI Agent"}...`}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-sand bg-white text-sm placeholder:text-cloudy focus:outline-none focus:border-terra/40 focus:ring-1 focus:ring-terra/20 transition disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="px-4 py-2.5 bg-terra text-white rounded-xl hover:bg-terra-dark transition flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Automation Status */}
      <div className="bg-white rounded-2xl border border-sand p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-terra" />
          <span className="text-xs font-bold text-warm-800">Active Automations (OpenClaw Cron)</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {OPENCLAW_CONFIG.cronJobs.map((job) => {
            const agent = OPENCLAW_CONFIG.agents.find((a) => a.id === job.agentId)
            const meta = agentMeta[job.agentId]
            const Icon = meta?.icon || Bot
            return (
              <div
                key={job.id}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-cream/50 border border-sand/50"
              >
                <Icon size={12} className={cn("mt-0.5 shrink-0", meta?.color || "text-terra")} />
                <div>
                  <p className="text-[11px] font-semibold text-warm-800">{job.description}</p>
                  <p className="text-[9px] text-cloudy mt-0.5">
                    <Clock size={8} className="inline mr-0.5" />
                    {job.schedule} &middot; {agent?.name.replace("ClawHealth ", "")}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
