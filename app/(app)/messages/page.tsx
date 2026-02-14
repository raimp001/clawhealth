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
} from "lucide-react"
import { useState, useMemo } from "react"
import AIAction from "@/components/ai-action"

export default function MessagesPage() {
  const [channelFilter, setChannelFilter] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  const myMessages = getMyMessages()

  const channels = useMemo(
    () => Array.from(new Set(myMessages.map((m) => m.channel))),
    [myMessages]
  )

  const unreadCount = myMessages.filter((m) => !m.read).length

  const activeMessages = useMemo(() => {
    let msgs = [...myMessages]
    if (channelFilter) {
      msgs = msgs.filter((m) => m.channel === channelFilter)
    }
    return msgs.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [myMessages, channelFilter])

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
          <h1 className="text-2xl font-serif text-warm-800">My Messages</h1>
          <p className="text-sm text-warm-500 mt-1">
            {unreadCount} unread &middot; {myMessages.length} total messages
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
      <div className="bg-white rounded-2xl border border-sand overflow-hidden flex flex-col h-[calc(100vh-220px)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-sand">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-terra/10 to-terra/5 flex items-center justify-center text-terra text-sm font-bold font-serif">
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
                      : "Me"}
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
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && newMessage.trim() && !isSending) {
                  setIsSending(true)
                  try {
                    await fetch("/api/openclaw/chat", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        message: newMessage,
                        agentId: "coordinator",
                        patientId: currentUser.id,
                        channel: "portal",
                      }),
                    })
                  } catch {}
                  setNewMessage("")
                  setIsSending(false)
                }
              }}
              placeholder="Type a message..."
              disabled={isSending}
              className="flex-1 px-4 py-2.5 rounded-xl border border-sand bg-cream/50 text-sm placeholder:text-cloudy focus:outline-none focus:border-terra/40 transition disabled:opacity-50"
            />
            <button
              onClick={async () => {
                if (!newMessage.trim() || isSending) return
                setIsSending(true)
                try {
                  await fetch("/api/openclaw/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      message: newMessage,
                      agentId: "coordinator",
                      patientId: currentUser.id,
                      channel: "portal",
                    }),
                  })
                } catch {}
                setNewMessage("")
                setIsSending(false)
              }}
              disabled={isSending || !newMessage.trim()}
              className="px-4 py-2.5 bg-terra text-white text-sm font-semibold rounded-xl hover:bg-terra-dark transition disabled:opacity-50"
            >
              Send
            </button>
          </div>
          <div className="flex items-center gap-2">
            <AIAction
              agentId="coordinator"
              label="AI Draft Reply"
              prompt="Help me draft a reply to the most recent message in my conversation."
              context={`Last message: "${myMessages[myMessages.length - 1]?.content.slice(0, 200)}"`}
              variant="compact"
            />
            <AIAction
              agentId="triage"
              label="AI Triage"
              prompt="Help me assess if my recent messages indicate something urgent that needs immediate attention."
              context={`Recent messages: ${myMessages.slice(-3).map(m => m.content.slice(0, 100)).join(" | ")}`}
              variant="compact"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
