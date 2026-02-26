import { CheckCircle2, Crown, Sparkles } from "lucide-react"
import { OPENRX_PLANS } from "@/lib/subscription-tiers"

function formatPrice(value: number | null): string {
  if (value === null) return "Contact sales"
  if (value === 0) return "$0"
  return `$${value}`
}

export default function PlansPage() {
  return (
    <div className="animate-slide-up space-y-6">
      <div>
        <h1 className="text-2xl font-serif text-warm-800">Plans & Access</h1>
        <p className="text-sm text-warm-500 mt-1">
          Tiered access model for individuals, teams, and enterprise care operations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {OPENRX_PLANS.map((plan) => (
          <div key={plan.id} className="bg-pampas rounded-2xl border border-sand p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-warm-800">{plan.name}</h2>
                <p className="text-xs text-warm-500 mt-0.5">{plan.description}</p>
              </div>
              <Crown size={16} className="text-terra" />
            </div>

            <div className="mt-4 flex items-end gap-2">
              <span className="text-2xl font-bold text-warm-800">{formatPrice(plan.monthlyUsdPerSeat)}</span>
              <span className="text-xs text-cloudy pb-1">
                {plan.monthlyUsdPerSeat === null ? "" : "/ seat / month"}
              </span>
            </div>

            <div className="mt-3 text-xs text-warm-600">
              Agent sessions: <span className="font-semibold text-warm-800">{String(plan.agentSessionsPerMonth)}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {plan.badges.map((badge) => (
                <span key={badge} className="text-[10px] px-2 py-1 rounded-full bg-terra/10 text-terra font-semibold">
                  {badge}
                </span>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-2 text-xs text-warm-700">
                  <CheckCircle2 size={12} className="text-accent mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-terra/10 rounded-2xl border border-terra/20 p-4 text-xs text-warm-600">
        <Sparkles size={13} className="inline mr-1 text-terra" />
        Plans are enforced with feature-level gating hooks and API policy controls as you connect billing systems.
      </div>
    </div>
  )
}
