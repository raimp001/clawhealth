"use client"

import { CHAT_DEMOS } from "@/lib/seed-data"
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
} from "lucide-react"
import { useState } from "react"

const iconMap: Record<string, typeof Calendar> = {
  Calendar,
  Receipt,
  Shield: ShieldCheck,
  Moon,
  Pill,
}

export default function ChatPage() {
  const [activeDemo, setActiveDemo] = useState(CHAT_DEMOS[0].id)
  const [inputValue, setInputValue] = useState("")

  const demo = CHAT_DEMOS.find((d) => d.id === activeDemo)!

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "patient":
        return <User size={14} className="text-soft-blue" />
      case "physician":
        return <Stethoscope size={14} className="text-accent" />
      case "agent":
        return <Bot size={14} className="text-terra" />
      default:
        return <Bot size={14} className="text-terra" />
    }
  }

  const getRoleBg = (role: string) => {
    switch (role) {
      case "patient":
        return "bg-soft-blue/5 border-soft-blue/10"
      case "physician":
        return "bg-accent/5 border-accent/10"
      case "agent":
        return "bg-terra/5 border-terra/10"
      default:
        return "bg-terra/5 border-terra/10"
    }
  }

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-terra to-terra-dark flex items-center justify-center">
          <Bot size={20} className="text-cream" />
        </div>
        <div>
          <h1 className="text-2xl font-serif text-warm-800">
            ClawHealth AI Agent
          </h1>
          <p className="text-sm text-warm-500 mt-0.5">
            Intelligent healthcare automation &middot; Powered by OpenClaw
          </p>
        </div>
      </div>

      {/* Demo Selector */}
      <div className="flex gap-2 flex-wrap">
        {CHAT_DEMOS.map((d) => {
          const Icon = iconMap[d.icon] || Bot
          return (
            <button
              key={d.id}
              onClick={() => setActiveDemo(d.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border",
                activeDemo === d.id
                  ? "bg-terra text-white border-terra shadow-lg shadow-terra/20"
                  : "bg-white text-warm-600 border-sand hover:border-terra/30 hover:text-warm-800"
              )}
            >
              <Icon size={16} />
              {d.title}
            </button>
          )
        })}
      </div>

      {/* Chat Window */}
      <div className="bg-white rounded-2xl border border-sand overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-sand bg-cream/30">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-terra" />
            <span className="text-sm font-bold text-warm-800">
              {demo.title} Demo
            </span>
          </div>
          <span className="text-[10px] font-bold text-terra bg-terra/10 px-2 py-0.5 rounded-full">
            LIVE DEMO
          </span>
        </div>

        {/* Messages */}
        <div className="p-5 space-y-4 min-h-[400px] max-h-[500px] overflow-y-auto">
          {demo.messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3 animate-fade-in",
                msg.role === "patient" ? "flex-row-reverse" : ""
              )}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  msg.role === "agent"
                    ? "bg-terra/10"
                    : msg.role === "physician"
                    ? "bg-accent/10"
                    : "bg-soft-blue/10"
                )}
              >
                {getRoleIcon(msg.role)}
              </div>
              <div
                className={cn(
                  "rounded-xl border px-4 py-3 max-w-[75%]",
                  getRoleBg(msg.role)
                )}
              >
                <div className="text-[10px] font-bold text-warm-500 uppercase tracking-wider mb-1">
                  {msg.role === "agent"
                    ? "ClawHealth AI"
                    : msg.role === "physician"
                    ? "Physician"
                    : "Patient"}
                </div>
                <p className="text-sm text-warm-700 leading-relaxed whitespace-pre-line">
                  {msg.content}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="px-5 py-3.5 border-t border-sand bg-cream/30">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask the AI agent anything..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-sand bg-white text-sm placeholder:text-cloudy focus:outline-none focus:border-terra/40 focus:ring-1 focus:ring-terra/20 transition"
            />
            <button className="px-4 py-2.5 bg-terra text-white rounded-xl hover:bg-terra-dark transition flex items-center gap-2 text-sm font-semibold">
              <Send size={14} />
              Send
            </button>
          </div>
          <p className="text-[10px] text-cloudy mt-2 text-center">
            This is a demo. In production, the AI agent handles real-time
            scheduling, billing, prior auth, and more.
          </p>
        </div>
      </div>

      {/* Capabilities Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Calendar,
            title: "Smart Scheduling",
            desc: "Insurance-aware booking with copay estimates",
          },
          {
            icon: Receipt,
            title: "Claims Automation",
            desc: "Error detection, appeals, and revenue recovery",
          },
          {
            icon: ShieldCheck,
            title: "Prior Auth",
            desc: "Auto-fill forms, criteria matching, ePA submission",
          },
          {
            icon: Pill,
            title: "Rx Management",
            desc: "Refill coordination, adherence monitoring, alerts",
          },
        ].map((cap) => (
          <div
            key={cap.title}
            className="bg-white rounded-2xl border border-sand p-4 hover:border-terra/20 transition"
          >
            <cap.icon size={20} className="text-terra mb-2" />
            <h3 className="text-sm font-bold text-warm-800">{cap.title}</h3>
            <p className="text-xs text-warm-500 mt-1">{cap.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
