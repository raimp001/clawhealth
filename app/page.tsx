"use client"

import Link from "next/link"
import {
  Calendar,
  Receipt,
  ShieldCheck,
  Pill,
  MessageSquare,
  Bot,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Heart,
  Users,
  TrendingUp,
  DollarSign,
  Lock,
  AlertTriangle,
  Activity,
} from "lucide-react"
import { useState } from "react"

const INTENT_OPTIONS = [
  { id: "bills", label: "Confusing bills & charges", icon: Receipt, href: "/billing", color: "text-soft-red" },
  { id: "meds", label: "Managing my medications", icon: Pill, href: "/prescriptions", color: "text-accent" },
  { id: "auth", label: "Insurance denials & prior auth", icon: ShieldCheck, href: "/prior-auth", color: "text-yellow-400" },
  { id: "all", label: "All of the above", icon: Activity, href: "/dashboard", color: "text-terra" },
]

export default function LandingPage() {
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-cream">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-cream/90 backdrop-blur-sm border-b border-sand">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-terra to-terra-dark flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 4v16M4 12h16" stroke="#060D1B" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-lg font-bold text-warm-800 font-serif">OpenRx</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/privacy-explained" className="text-xs text-cloudy hover:text-warm-600 transition hidden sm:block">
              Privacy
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 bg-terra text-white text-sm font-semibold rounded-xl hover:bg-terra-dark transition shadow-lg shadow-terra/20"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-12">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-terra/10 rounded-full text-xs font-bold text-terra mb-6">
            <Sparkles size={14} />
            9 AI specialists working for you — not your insurer
          </div>
          <h1 className="text-5xl lg:text-6xl font-serif text-warm-800 leading-tight">
            Your AI care team,
            <br />
            <span className="text-terra">fighting your corner.</span>
          </h1>
          <p className="text-lg text-warm-500 mt-6 max-w-2xl mx-auto leading-relaxed">
            OpenRx finds billing errors, fights insurance denials, tracks your medications,
            and books appointments — free, in minutes, no account required.
          </p>

          {/* Benefit bullets */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 text-sm">
            <span className="flex items-center gap-1.5 text-warm-500">
              <CheckCircle2 size={14} className="text-accent shrink-0" />
              Vera catches billing errors automatically
            </span>
            <span className="hidden sm:block text-sand">·</span>
            <span className="flex items-center gap-1.5 text-warm-500">
              <CheckCircle2 size={14} className="text-accent shrink-0" />
              Rex drafts appeal letters for denials
            </span>
            <span className="hidden sm:block text-sand">·</span>
            <span className="flex items-center gap-1.5 text-warm-500">
              <CheckCircle2 size={14} className="text-accent shrink-0" />
              Maya finds cheaper med alternatives
            </span>
          </div>

          {/* Intent routing */}
          <div className="mt-10">
            <p className="text-xs font-semibold text-warm-500 uppercase tracking-widest mb-4">
              What&apos;s your biggest healthcare headache?
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {INTENT_OPTIONS.map((opt) => (
                <Link
                  key={opt.id}
                  href={opt.href}
                  onClick={() => setSelectedIntent(opt.id)}
                  className={`flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border transition-all cursor-pointer text-center group
                    ${selectedIntent === opt.id
                      ? "border-terra bg-terra/10"
                      : "border-sand bg-pampas hover:border-terra/40 hover:bg-terra/5"
                    }`}
                >
                  <opt.icon size={20} className={opt.color} />
                  <span className="text-[11px] font-semibold text-warm-700 leading-snug group-hover:text-warm-800">
                    {opt.label}
                  </span>
                </Link>
              ))}
            </div>
            <p className="text-xs text-cloudy mt-3">
              No account needed &middot; Your data stays on your device
            </p>
          </div>

          {/* Secondary CTA */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link
              href="/onboarding"
              className="px-6 py-3 bg-terra text-white text-sm font-bold rounded-xl hover:bg-terra-dark transition shadow-xl shadow-terra/25 flex items-center gap-2"
            >
              Set Up My Care Team
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/chat"
              className="px-6 py-3 bg-pampas text-warm-800 text-sm font-bold rounded-xl border border-sand hover:border-terra/30 transition flex items-center gap-2"
            >
              <Bot size={16} className="text-terra" />
              Ask AI Anything
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { value: "$312", label: "Avg billing errors found", icon: DollarSign },
            { value: "4 min", label: "Prior auth turnaround", icon: TrendingUp },
            { value: "47%", label: "Avg med cost savings found", icon: Pill },
            { value: "10K+", label: "Patients using OpenRx", icon: Users },
          ].map((s) => (
            <div key={s.label} className="bg-pampas rounded-2xl border border-sand p-6 text-center">
              <s.icon size={24} className="text-terra mx-auto mb-3" />
              <div className="text-3xl font-bold text-warm-800 font-serif">{s.value}</div>
              <div className="text-xs text-warm-500 mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust bar */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-pampas rounded-2xl border border-sand px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Lock size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold text-warm-800">Your data stays yours</p>
              <p className="text-xs text-warm-500">No PHI stored on our servers in demo mode. No data sold. Ever.</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs text-warm-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-accent" /> No account required</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-accent" /> No diagnosis given</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-accent" /> Privacy by design</span>
          </div>
          <Link href="/privacy-explained" className="text-xs font-semibold text-terra hover:underline shrink-0">
            How we handle your data →
          </Link>
        </div>
      </section>

      {/* Care Team */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-pampas rounded-3xl p-8 lg:p-12 border border-sand">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-terra/15 rounded-full text-xs font-bold text-terra mb-4">
              Powered by OpenClaw Gateway
            </div>
            <h2 className="text-3xl font-serif text-warm-800">
              9 specialists. All on your side.
            </h2>
            <p className="text-sm text-warm-600 mt-3 leading-relaxed max-w-xl mx-auto">
              Unlike insurance company AI that looks for reasons to deny — OpenRx agents work exclusively for you.
              They collaborate behind the scenes so you just have one conversation.
            </p>
            <div className="grid grid-cols-3 gap-3 mt-8">
              {[
                { name: "Sage", role: "Onboarding Guide", desc: "Gets you set up fast" },
                { name: "Atlas", role: "Coordinator", desc: "Routes to the right agent" },
                { name: "Nova", role: "Triage Nurse", desc: "Assesses urgency" },
                { name: "Cal", role: "Scheduler", desc: "Books appointments" },
                { name: "Vera", role: "Billing Expert", desc: "Catches errors & overcharges" },
                { name: "Maya", role: "Rx Manager", desc: "Finds cheaper alternatives" },
                { name: "Rex", role: "Prior Auth Fighter", desc: "Drafts appeal letters" },
                { name: "Ivy", role: "Wellness Coach", desc: "Preventive care plans" },
                { name: "Bolt", role: "DevOps", desc: "Keeps everything running" },
              ].map((agent) => (
                <div key={agent.name} className="bg-sand/50 rounded-xl px-3 py-3 text-left border border-sand">
                  <div className="text-xs font-bold text-warm-800">{agent.name}</div>
                  <div className="text-[10px] text-terra font-semibold">{agent.role}</div>
                  <div className="text-[10px] text-warm-600 mt-0.5">{agent.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif text-warm-800">Everything in one place</h2>
          <p className="text-sm text-warm-500 mt-2">Your AI care team handles the hard stuff</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: Receipt,
              title: "Catch Billing Errors",
              desc: "Vera reviews every charge for mistakes, explains them in plain English, and helps you dispute overcharges.",
              href: "/billing",
              badge: "Most popular",
            },
            {
              icon: ShieldCheck,
              title: "Fight Prior Auth Denials",
              desc: "Rex handles prior authorizations and drafts appeal letters automatically — no phone calls required.",
              href: "/prior-auth",
              badge: null,
            },
            {
              icon: Pill,
              title: "Manage Medications",
              desc: "Log your daily doses, track refills, check for interactions, and find cheaper alternatives.",
              href: "/prescriptions",
              badge: null,
            },
            {
              icon: Calendar,
              title: "Book Appointments",
              desc: "Find in-network doctors with upfront copay estimates. Cal books it in 34 seconds on average.",
              href: "/scheduling",
              badge: null,
            },
            {
              icon: MessageSquare,
              title: "Message Your Care Team",
              desc: "Portal, WhatsApp, or SMS — reach your doctors anytime. AI triages urgent concerns instantly.",
              href: "/messages",
              badge: null,
            },
            {
              icon: Bot,
              title: "Ask AI Anything",
              desc: "9 specialist agents collaborate to answer your health admin questions. No diagnosis, just clarity.",
              href: "/chat",
              badge: null,
            },
          ].map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className="bg-pampas rounded-2xl border border-sand p-6 hover:border-terra/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-terra/5 transition-all group relative"
            >
              {f.badge && (
                <span className="absolute top-4 right-4 text-[9px] font-bold px-2 py-0.5 rounded-full bg-terra/10 text-terra uppercase tracking-wider">
                  {f.badge}
                </span>
              )}
              <f.icon size={24} className="text-terra mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-base font-bold text-warm-800 group-hover:text-terra transition">{f.title}</h3>
              <p className="text-sm text-warm-500 mt-2 leading-relaxed">{f.desc}</p>
              <span className="text-xs font-semibold text-terra flex items-center gap-1 mt-4 opacity-0 group-hover:opacity-100 transition">
                Explore <ArrowRight size={12} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Social proof / disclaimer */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-pampas/50 rounded-2xl border border-sand/50 p-6 flex flex-col sm:flex-row gap-4 items-start">
          <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-warm-500 leading-relaxed">
            <span className="font-semibold text-warm-600">OpenRx is a personal health admin tool, not a medical provider.</span>{" "}
            We do not provide medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional
            for medical decisions. AI responses are for informational purposes only.{" "}
            <Link href="/privacy-explained" className="text-terra hover:underline">Learn how your data is handled.</Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-sand bg-pampas">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Heart size={14} className="text-terra" />
            <span className="text-xs text-warm-500">OpenRx &middot; Powered by OpenClaw</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-cloudy">
            <Link href="/privacy-explained" className="hover:text-warm-500 transition">Privacy</Link>
            <span>&middot;</span>
            <span>Demo Mode &middot; Sample data</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
