"use client"

import { currentUser, getMyMessages } from "@/lib/current-user"
import { getPhysician } from "@/lib/seed-data"
import { cn, formatDate } from "@/lib/utils"
import {
  MessageSquare,
  Bot,
  User,
  Stethoscope,
  Bell,
  Circle,
  Send,
  Loader2,
} from "lucide-react"
import { useState, useMemo, useRef, useEffect } from "react"
import AIAction from "@/components/ai-action"
import type { Message } from "@/lib/seed-data"

type LocalMessage = Message | {
  id: string
  patient_id: string
  physician_id: null
  sender_type: "patient" | "agent"
  content: string
  channel: "portal"
  read: boolean
  created_at: string
}

export default function MessagesPage() {
  const [channelFilter, setChannelFilter] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState("")
  const [extraMessages, setExtraMessages] = useState<LocalMessage[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const seedMessages = getMyMessages()

  const allMessages: LocalMessage[] = useMemo(
    () => [...seedMessages, ...extraMessages],
    [seedMessages, extraMessages]
  )

  const channels = useMemo(
    () => Array.from(new Set(allMessages.map((m) => m.channel))),
    [allMessages]
  )

  const unreadCount = seedMessages.filter((m) => !m.read).length

  const activeMessages = useMemo(() => {
    let msgs = [...allMessages]
    if (channelFilter) {
      msgs = msgs.filter((m) => m.channel === channelFilter)
    }
    return msgs.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [allMessages, channelFilter])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeMessages.length])

  const sendMessage = async () => {
    const text = newMessage.trim()
    if (!text || isSending) return

    setSendError("")
    setIsSending(true)
    setNewMessage("")

    const userMsg: LocalMessage = {
      id: `local-user-${Date.now()}`,
      patient_id: currentUser.id,
      physician_id: null,
      sender_type: "patient",
      content: text,
      channel: "portal",
      read: true,
      created_at: new Date().toISOString(),
    }
    setExtraMessages((prev) => [...prev, userMsg])

    try {
      const res = await fetch("/api/openclaw/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          agentId: "coordinator",
          patientId: currentUser.id,
          channel: "portal",
        }),
      })
      const data = await res.json()
      const reply = data.response || data.error
      if (reply) {
        const agentMsg: LocalMessage = {
          id: `local-agent-${Date.now()}`,
          patient_id: currentUser.id,
          physician_id: null,
          sender_type: "agent",
          content: reply,
          channel: "portal",
          read: true,
          created_at: new Date().toISOString(),
        }
        setExtraMessages((prev) => [...prev, agentMsg])
      }
    } catch {
      setSendError("Failed to send — please try again.")
      setExtraMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
    } finally {
      setIsSending(false)
    }
  }

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
        return "bg-yellow-900/20 border-yellow-700/30"
      default:
        return "bg-sand/20 border-sand"
    }
  }

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-warm-800">My Messages</h1>
          <p className="text-sm text-warm-500 mt-1">
            {unreadCount} unread &middot; {allMessages.length} total messages
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-terra/5 border border-terra/10">
          <Bot size={12} className="text-terra" />
          <span className="text-[10px] font-bold text-terra">
            OpenClaw Multi-Channel
          </span>
          <span className="text-[9px] text-warm-500">
            WhatsApp &middot; SMS &middot; Telegram &middot; Portal
          </span>
        </div>
      </div>

      {/* Message Thread */}
      <div className="bg-pampas rounded-2xl border border-sand overflow-hidden flex flex-col h-[calc(100vh-220px)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-sand">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-terra/10 to-terra/5 flex items-center justify-center text-terra">
              <User size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-800">
                My Conversation
              </h3>
              <p className="text-[10px] text-cloudy">
                {currentUser.phone} &middot;{" "}
                {currentUser.email}
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
                  : "text-warm-500 hover:bg-sand/30"
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
                    : "text-warm-500 hover:bg-sand/30"
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
                      : "Me"}
                  </span>
                  <span className="text-[9px] text-cloudy">
                    {formatDate(msg.created_at)}
                  </span>
                  <span className="text-[9px] text-cloudy capitalize">
                    via {msg.channel}
                  </span>
                  {!msg.read && (
                    <Circle size={6} className="text-terra fill-terra" />
                  )}
                </div>
                <p className="text-xs text-warm-700 leading-relaxed whitespace-pre-line">
                  {msg.content}
                </p>
              </div>
            )
          })}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-warm-500 pl-1">
              <Loader2 size={12} className="animate-spin text-terra" />
              AI is responding...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-3 border-t border-sand space-y-2">
          {sendError && (
            <p className="text-xs text-soft-red">{sendError}</p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              disabled={isSending}
              className="flex-1 px-4 py-2.5 rounded-xl border border-sand bg-sand/20 text-sm placeholder:text-cloudy focus:outline-none focus:border-terra/40 transition disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={isSending || !newMessage.trim()}
              className="px-4 py-2.5 bg-terra text-white text-sm font-semibold rounded-xl hover:bg-terra-dark transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Send
            </button>
          </div>
          <div className="flex items-center gap-2">
            <AIAction
              agentId="coordinator"
              label="AI Draft Reply"
              prompt="Help me draft a reply to the most recent message in my conversation."
              context={`Last message: "${allMessages[allMessages.length - 1]?.content.slice(0, 200)}"`}
              variant="compact"
            />
            <AIAction
              agentId="triage"
              label="AI Triage"
              prompt="Help me assess if my recent messages indicate something urgent that needs immediate attention."
              context={`Recent messages: ${allMessages.slice(-3).map(m => m.content.slice(0, 100)).join(" | ")}`}
              variant="compact"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
