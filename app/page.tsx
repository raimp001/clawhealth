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
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-sand">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-terra to-terra-dark flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 4v16M4 12h16"
                  stroke="#F4F3EE"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="text-lg font-bold text-warm-800 font-serif">
              OpenRx
            </span>
          </div>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-terra text-white text-sm font-semibold rounded-xl hover:bg-terra-dark transition shadow-lg shadow-terra/20"
          >
            Open Dashboard
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-terra/10 rounded-full text-xs font-bold text-terra mb-6">
            <Sparkles size={14} />
            Powered by OpenClaw AI
          </div>
          <h1 className="text-5xl lg:text-6xl font-serif text-warm-800 leading-tight">
            Your Health,
            <br />
            <span className="text-terra">Simplified.</span>
          </h1>
          <p className="text-lg text-warm-500 mt-6 max-w-2xl mx-auto leading-relaxed">
            OpenRx gives you an AI care team that books appointments, manages
            medications, fights billing errors, and handles insurance — so you
            can focus on feeling better.
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link
              href="/onboarding"
              className="px-6 py-3 bg-terra text-white text-sm font-bold rounded-xl hover:bg-terra-dark transition shadow-xl shadow-terra/25 flex items-center gap-2"
            >
              Get Started
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/chat"
              className="px-6 py-3 bg-white text-warm-800 text-sm font-bold rounded-xl border border-sand hover:border-terra/30 transition flex items-center gap-2"
            >
              <Bot size={16} className="text-terra" />
              Talk to AI Agent
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { value: "$2,400", label: "Avg savings per patient", icon: CheckCircle2 },
            { value: "4min", label: "Prior auth turnaround", icon: TrendingUp },
            { value: "34sec", label: "Avg time to book", icon: Receipt },
            { value: "10K+", label: "Patients using OpenRx", icon: Users },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl border border-sand p-6 text-center"
            >
              <s.icon size={24} className="text-terra mx-auto mb-3" />
              <div className="text-3xl font-bold text-warm-800 font-serif">
                {s.value}
              </div>
              <div className="text-xs text-warm-500 mt-1 font-medium">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* OpenClaw Integration */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-warm-800 rounded-3xl p-8 lg:p-12 text-cream">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-xs font-bold text-terra-light mb-4">
              Powered by OpenClaw Gateway
            </div>
            <h2 className="text-3xl font-serif">
              Meet Your Care Team
            </h2>
            <p className="text-sm text-cream/60 mt-3 leading-relaxed max-w-xl mx-auto">
              9 AI specialists work together behind the scenes — booking appointments,
              managing your meds, fighting billing errors, and keeping you on track
              with preventive care. You just chat naturally.
            </p>
            <div className="grid grid-cols-3 lg:grid-cols-3 gap-3 mt-8">
              {[
                { name: "Sage", role: "Onboarding Guide", desc: "Walks you through setup" },
                { name: "Atlas", role: "Coordinator", desc: "Routes everything" },
                { name: "Nova", role: "Triage Nurse", desc: "Symptom assessment" },
                { name: "Cal", role: "Scheduler", desc: "Books appointments" },
                { name: "Vera", role: "Billing", desc: "Protects your wallet" },
                { name: "Maya", role: "Rx Manager", desc: "Manages medications" },
                { name: "Rex", role: "Prior Auth", desc: "Fights denials" },
                { name: "Ivy", role: "Wellness Coach", desc: "Preventive care" },
                { name: "Bolt", role: "DevOps", desc: "Keeps it running" },
              ].map((agent) => (
                <div
                  key={agent.name}
                  className="bg-white/5 rounded-xl px-3 py-3 text-left"
                >
                  <div className="text-xs font-bold text-cream">{agent.name}</div>
                  <div className="text-[10px] text-terra-light font-semibold">{agent.role}</div>
                  <div className="text-[9px] text-cream/50 mt-0.5">{agent.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif text-warm-800">
            Everything you need in one place
          </h2>
          <p className="text-sm text-warm-500 mt-2">
            Your AI care team handles the hard stuff
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: Calendar,
              title: "Book Appointments",
              desc: "Find in-network doctors, see copay estimates upfront, get reminders. No phone calls.",
              href: "/scheduling",
            },
            {
              icon: Receipt,
              title: "Understand Your Bills",
              desc: "AI reviews every bill for errors, explains charges in plain English, and fights overcharges for you.",
              href: "/billing",
            },
            {
              icon: Pill,
              title: "Manage Medications",
              desc: "Track refills, get adherence reminders, check interactions, and coordinate with your pharmacy.",
              href: "/prescriptions",
            },
            {
              icon: ShieldCheck,
              title: "Insurance & Prior Auth",
              desc: "We handle prior authorizations automatically. If something's denied, we appeal it.",
              href: "/prior-auth",
            },
            {
              icon: MessageSquare,
              title: "Message Your Care Team",
              desc: "Text, portal, or WhatsApp — reach your doctors anytime. AI triages urgent concerns instantly.",
              href: "/messages",
            },
            {
              icon: Bot,
              title: "Your AI Care Team",
              desc: "9 AI specialists working behind the scenes — scheduling, billing, meds, wellness, and more.",
              href: "/chat",
            },
          ].map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className="bg-white rounded-2xl border border-sand p-6 hover:border-terra/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-terra/5 transition-all group"
            >
              <f.icon
                size={24}
                className="text-terra mb-4 group-hover:scale-110 transition-transform"
              />
              <h3 className="text-base font-bold text-warm-800 group-hover:text-terra transition">
                {f.title}
              </h3>
              <p className="text-sm text-warm-500 mt-2 leading-relaxed">
                {f.desc}
              </p>
              <span className="text-xs font-semibold text-terra flex items-center gap-1 mt-4 opacity-0 group-hover:opacity-100 transition">
                Explore <ArrowRight size={12} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-sand bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart size={14} className="text-terra" />
            <span className="text-xs text-warm-500">
              OpenRx &middot; Powered by OpenClaw
            </span>
          </div>
          <div className="text-xs text-cloudy">
            Demo Mode &middot; Sample clinic data
          </div>
        </div>
      </footer>
    </div>
  )
}
