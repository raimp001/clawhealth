"use client"

import { cn } from "@/lib/utils"
import {
  Search,
  MapPin,
  Phone,
  Pill,
  Loader2,
  BadgeCheck,
  Building2,
  Send,
} from "lucide-react"
import { useState, useCallback } from "react"
import AIAction from "@/components/ai-action"

interface Pharmacy {
  npi: string
  name: string
  type: string
  phone: string
  fax: string
  address: {
    line1: string
    line2: string
    city: string
    state: string
    zip: string
  }
  fullAddress: string
  status: string
  lastUpdated: string
}

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]

export default function PharmacyPage() {
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [zip, setZip] = useState("")
  const [name, setName] = useState("")
  const [results, setResults] = useState<Pharmacy[]>([])
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState("")
  const [selectedPharmacy, setSelectedPharmacy] = useState<string | null>(null)

  const searchPharmacies = useCallback(async () => {
    if (!city && !zip && !name && !state) {
      setError("Please enter at least one search criteria.")
      return
    }

    setIsLoading(true)
    setError("")
    setHasSearched(true)

    try {
      const params = new URLSearchParams()
      if (city) params.set("city", city)
      if (state) params.set("state", state)
      if (zip) params.set("zip", zip)
      if (name) params.set("name", name)
      params.set("limit", "20")

      const res = await fetch(`/api/pharmacy/search?${params}`)
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setResults([])
      } else {
        setResults(data.pharmacies || [])
        setCount(data.count || 0)
      }
    } catch {
      setError("Failed to search. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [city, state, zip, name])

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-warm-800">
            Pharmacy Finder
          </h1>
          <p className="text-sm text-warm-500 mt-1">
            Search pharmacies by location &middot; NPI Registry data
          </p>
        </div>
        <AIAction
          agentId="rx"
          label="Compare Prices"
          prompt="For all active prescriptions with pending refills, compare pricing across nearby pharmacies and suggest the most cost-effective options considering the patient's insurance plan."
        />
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-2xl border border-sand p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-xs font-semibold text-warm-700 mb-1.5 block">
              Pharmacy Name
            </label>
            <div className="relative">
              <Building2
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-cloudy"
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Walgreens"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-sand bg-cream/50 text-sm text-warm-800 placeholder:text-cloudy focus:outline-none focus:border-terra/40 focus:ring-1 focus:ring-terra/20 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-warm-700 mb-1.5 block">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Portland"
              className="w-full px-4 py-2.5 rounded-xl border border-sand bg-cream/50 text-sm text-warm-800 placeholder:text-cloudy focus:outline-none focus:border-terra/40 focus:ring-1 focus:ring-terra/20 transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-warm-700 mb-1.5 block">
              State
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-sand bg-cream/50 text-sm text-warm-800 focus:outline-none focus:border-terra/40 appearance-none cursor-pointer"
            >
              <option value="">Any State</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-warm-700 mb-1.5 block">
              ZIP Code
            </label>
            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="e.g. 97201"
              maxLength={5}
              className="w-full px-4 py-2.5 rounded-xl border border-sand bg-cream/50 text-sm text-warm-800 placeholder:text-cloudy focus:outline-none focus:border-terra/40 focus:ring-1 focus:ring-terra/20 transition"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={searchPharmacies}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-terra text-white text-sm font-semibold rounded-xl hover:bg-terra-dark transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              Search
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-soft-red mt-3">{error}</p>
        )}
      </div>

      {/* Results */}
      {hasSearched && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-warm-500">
              {isLoading
                ? "Searching..."
                : `${count} pharmac${count !== 1 ? "ies" : "y"} found`}
            </p>
            <span className="text-[10px] text-cloudy flex items-center gap-1">
              <BadgeCheck size={10} /> Live data from NPI Registry
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {results.map((pharmacy) => (
              <div
                key={pharmacy.npi}
                className={cn(
                  "bg-white rounded-2xl border p-5 hover:border-terra/20 transition cursor-pointer",
                  selectedPharmacy === pharmacy.npi
                    ? "border-terra/30 ring-1 ring-terra/10"
                    : "border-sand"
                )}
                onClick={() =>
                  setSelectedPharmacy(
                    selectedPharmacy === pharmacy.npi ? null : pharmacy.npi
                  )
                }
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-accent/5 flex items-center justify-center text-accent shrink-0">
                    <Pill size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-warm-800">
                      {pharmacy.name}
                    </h3>
                    <p className="text-[10px] font-semibold text-accent mt-0.5">
                      {pharmacy.type}
                    </p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-warm-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {pharmacy.fullAddress}
                      </span>
                      {pharmacy.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} />
                          {pharmacy.phone}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] font-mono text-cloudy mt-1 block">
                      NPI: {pharmacy.npi}
                    </span>
                  </div>
                </div>

                {selectedPharmacy === pharmacy.npi && (
                  <div className="mt-4 pt-4 border-t border-sand flex flex-wrap gap-2 animate-fade-in">
                    <AIAction
                      agentId="rx"
                      label="Transfer Rx"
                      prompt={`Initiate prescription transfer to ${pharmacy.name} (NPI: ${pharmacy.npi}) at ${pharmacy.fullAddress}. Check all active prescriptions for transfer eligibility and contact the pharmacy.`}
                      context={`Pharmacy: ${pharmacy.name}, NPI: ${pharmacy.npi}, Phone: ${pharmacy.phone}, Address: ${pharmacy.fullAddress}`}
                      variant="inline"
                    />
                    <AIAction
                      agentId="rx"
                      label="Send Refill"
                      prompt={`Send all pending refill requests to ${pharmacy.name} (NPI: ${pharmacy.npi}). Verify stock availability and estimated ready time.`}
                      context={`Pharmacy: ${pharmacy.name}, NPI: ${pharmacy.npi}, Phone: ${pharmacy.phone}`}
                      variant="inline"
                    />
                    <AIAction
                      agentId="rx"
                      label="Check Formulary"
                      prompt={`Check if ${pharmacy.name} carries all current patient medications and verify formulary compatibility with their insurance plans.`}
                      variant="inline"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {results.length === 0 && !isLoading && (
            <div className="text-center py-12 bg-white rounded-2xl border border-sand">
              <Pill size={32} className="text-sand mx-auto mb-3" />
              <p className="text-sm text-warm-500">
                No pharmacies found. Try adjusting your search.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pre-search state */}
      {!hasSearched && (
        <div className="text-center py-16 bg-white rounded-2xl border border-sand">
          <div className="w-16 h-16 rounded-2xl bg-accent/5 flex items-center justify-center mx-auto mb-4">
            <Pill size={28} className="text-accent" />
          </div>
          <h3 className="text-lg font-serif text-warm-800">
            Find a Pharmacy
          </h3>
          <p className="text-sm text-warm-500 mt-2 max-w-md mx-auto">
            Search pharmacies by name, city, or ZIP code. Transfer
            prescriptions, send refills, and check formulary compatibility — all
            powered by live NPI Registry data.
          </p>
        </div>
      )}
    </div>
  )
}
