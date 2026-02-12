"use client"

import { messages, getPatient, getPhysician, patients } from "@/lib/seed-data"
import { cn, formatDate, getInitials } from "@/lib/utils"
import {
  MessageSquare,
  Bot,
  User,
  Stethoscope,
  Bell,
  Search,
  Circle,
  Wifi,
} from "lucide-react"
import { useState, useMemo } from "react"
import AIAction from "@/components/ai-action"

export default function MessagesPage() {
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)
  const [channelFilter, setChannelFilter] = useState("")
  const [convoSearch, setConvoSearch] = useState("")

  // Group messages by patient
  const conversations = useMemo(() => {
    const grouped = new Map<
      string,
      { patient: (typeof patients)[0]; messages: typeof messages; unread: number }
    >()

    messages.forEach((m) => {
      const patient = getPatient(m.patient_id)
      if (!patient) return
      if (!grouped.has(m.patient_id)) {
        grouped.set(m.patient_id, { patient, messages: [], unread: 0 })
      }
      const conv = grouped.get(m.patient_id)!
      conv.messages.push(m)
      if (!m.read) conv.unread++
    })

    // Sort by most recent message
    return Array.from(grouped.values()).sort(
      (a, b) =>
        new Date(b.messages[b.messages.length - 1].created_at).getTime() -
        new Date(a.messages[a.messages.length - 1].created_at).getTime()
    )
  }, [])

  const filteredConversations = useMemo(() => {
    if (!convoSearch) return conversations
    const q = convoSearch.toLowerCase()
    return conversations.filter((c) =>
      c.patient.full_name.toLowerCase().includes(q)
    )
  }, [conversations, convoSearch])

  const activeConvo = selectedPatient
    ? conversations.find((c) => c.patient.id === selectedPatient)
    : conversations[0]

  const activeMessages = useMemo(() => {
    if (!activeConvo) return []
    let msgs = [...activeConvo.messages]
    if (channelFilter) {
      msgs = msgs.filter((m) => m.channel === channelFilter)
    }
    return msgs.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [activeConvo, channelFilter])

  const channels = useMemo(
    () => Array.from(new Set(messages.map((m) => m.channel))),
    []
  )

  const getSenderIcon = (type: string) => {
    switch (type) {
      case "patient":
        return <User size={14} className="text-soft-blue" />
      case "physician":
        return <Stethoscope size={14} className="text-accent" />
      case "agent":
        return <Bot size={14} className="text-terra" />
      case "system":
        return <Bell size={14} className="text-yellow-600" />
      default:
        return <MessageSquare size={14} className="text-cloudy" />
    }
  }

  const getSenderBg = (type: string) => {
    switch (type) {
      case "patient":
        return "bg-soft-blue/5 border-soft-blue/10"
      case "physician":
        return "bg-accent/5 border-accent/10"
      case "agent":
        return "bg-terra/5 border-terra/10"
      case "system":
        return "bg-yellow-50 border-yellow-200/50"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-warm-800">Messages</h1>
          <p className="text-sm text-warm-500 mt-1">
            {messages.filter((m) => !m.read).length} unread across{" "}
            {conversations.length} conversations
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-terra/5 border border-terra/10">
          <Bot size={12} className="text-terra" />
          <span className="text-[10px] font-bold text-terra">
            OpenClaw Multi-Channel
          </span>
          <span className="text-[9px] text-warm-500">
            WhatsApp &middot; SMS &middot; Portal &middot; WhatsApp
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-220px)]">
        {/* Conversation List */}
        <div className="bg-white rounded-2xl border border-sand overflow-hidden flex flex-col">
          <div className="p-3 border-b border-sand">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-cloudy"
              />
              <input
                type="text"
                value={convoSearch}
                onChange={(e) => setConvoSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-sand bg-cream/50 text-xs focus:outline-none focus:border-terra/40 transition"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-sand/50">
            {filteredConversations.map((conv) => {
              const lastMsg = conv.messages[conv.messages.length - 1]
              const isActive =
                (selectedPatient || conversations[0]?.patient.id) ===
                conv.patient.id

              return (
                <button
                  key={conv.patient.id}
                  onClick={() => setSelectedPatient(conv.patient.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-cream/50 transition",
                    isActive && "bg-terra/5 border-l-2 border-l-terra"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-terra/10 to-terra/5 flex items-center justify-center text-terra text-[10px] font-bold font-serif shrink-0">
                      {getInitials(conv.patient.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-warm-800 truncate">
                          {conv.patient.full_name}
                        </span>
                        {conv.unread > 0 && (
                          <span className="w-5 h-5 bg-terra text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-cloudy truncate mt-0.5">
                        {lastMsg.content.slice(0, 60)}...
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Message Thread */}
        <div className="bg-white rounded-2xl border border-sand overflow-hidden flex flex-col">
          {activeConvo && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-sand">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-terra/10 to-terra/5 flex items-center justify-center text-terra text-sm font-bold font-serif">
                    {getInitials(activeConvo.patient.full_name)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-warm-800">
                      {activeConvo.patient.full_name}
                    </h3>
                    <p className="text-[10px] text-cloudy">
                      {activeConvo.patient.phone} &middot;{" "}
                      {activeConvo.patient.email}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setChannelFilter("")}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-semibold rounded-lg transition",
                      !channelFilter
                        ? "bg-terra text-white"
                        : "text-warm-500 hover:bg-cream"
                    )}
                  >
                    All
                  </button>
                  {channels.map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setChannelFilter(ch)}
                      className={cn(
                        "px-2.5 py-1 text-[10px] font-semibold rounded-lg transition capitalize",
                        channelFilter === ch
                          ? "bg-terra text-white"
                          : "text-warm-500 hover:bg-cream"
                      )}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {activeMessages.map((msg) => {
                  const physician = msg.physician_id
                    ? getPhysician(msg.physician_id)
                    : null
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "rounded-xl border p-3.5 max-w-[85%]",
                        getSenderBg(msg.sender_type),
                        msg.sender_type === "patient" ? "ml-auto" : ""
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        {getSenderIcon(msg.sender_type)}
                        <span className="text-[10px] font-bold text-warm-600 uppercase tracking-wider">
                          {msg.sender_type === "physician" && physician
                            ? physician.full_name
                            : msg.sender_type === "agent"
                            ? "OpenRx AI"
                            : msg.sender_type === "system"
                            ? "System"
                            : activeConvo.patient.full_name}
                        </span>
                        <span className="text-[9px] text-cloudy">
                          {formatDate(msg.created_at)}
                        </span>
                        <span className="text-[9px] text-cloudy capitalize">
                          via {msg.channel}
                        </span>
                        {!msg.read && (
                          <Circle
                            size={6}
                            className="text-terra fill-terra"
                          />
                        )}
                      </div>
                      <p className="text-xs text-warm-700 leading-relaxed whitespace-pre-line">
                        {msg.content}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Input */}
              <div className="px-5 py-3 border-t border-sand space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-sand bg-cream/50 text-sm placeholder:text-cloudy focus:outline-none focus:border-terra/40 transition"
                  />
                  <button className="px-4 py-2.5 bg-terra text-white text-sm font-semibold rounded-xl hover:bg-terra-dark transition">
                    Send
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <AIAction
                    agentId="coordinator"
                    label="AI Draft Reply"
                    prompt={`Draft a professional reply to the most recent message from ${activeConvo.patient.full_name}. Consider their medical history and current context.`}
                    context={`Patient: ${activeConvo.patient.full_name}, Last message: "${activeConvo.messages[activeConvo.messages.length - 1]?.content.slice(0, 200)}"`}
                    variant="compact"
                  />
                  <AIAction
                    agentId="triage"
                    label="AI Triage"
                    prompt={`Assess the recent messages from ${activeConvo.patient.full_name} for clinical urgency. Classify as EMERGENCY, URGENT, or ROUTINE and suggest appropriate next steps.`}
                    context={`Patient: ${activeConvo.patient.full_name}, Recent messages: ${activeConvo.messages.slice(-3).map(m => m.content.slice(0, 100)).join(" | ")}`}
                    variant="compact"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
