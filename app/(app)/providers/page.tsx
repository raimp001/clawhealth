"use client"

import { cn } from "@/lib/utils"
import {
  Search,
  MapPin,
  Phone,
  User,
  Stethoscope,
  Loader2,
  ChevronRight,
  BadgeCheck,
  Filter,
} from "lucide-react"
import { useState, useCallback } from "react"
import AIAction from "@/components/ai-action"

interface Provider {
  npi: string
  name: string
  credential: string
  gender: string
  specialty: string
  taxonomyCode: string
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

const COMMON_SPECIALTIES = [
  "Internal Medicine",
  "Family Medicine",
  "Cardiology",
  "Dermatology",
  "Emergency Medicine",
  "Endocrinology",
  "Gastroenterology",
  "Hematology",
  "Oncology",
  "Neurology",
  "Obstetrics & Gynecology",
  "Ophthalmology",
  "Orthopedic Surgery",
  "Pediatrics",
  "Psychiatry",
  "Pulmonary Disease",
  "Rheumatology",
  "Surgery",
  "Urology",
]

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]

export default function ProvidersPage() {
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [zip, setZip] = useState("")
  const [specialty, setSpecialty] = useState("")
  const [name, setName] = useState("")
  const [results, setResults] = useState<Provider[]>([])
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState("")

  const searchProviders = useCallback(async () => {
    if (!city && !zip && !specialty && !name && !state) {
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
      if (specialty) params.set("specialty", specialty)
      if (name) params.set("name", name)
      params.set("limit", "20")

      const res = await fetch(`/api/providers/search?${params}`)
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setResults([])
      } else {
        setResults(data.providers || [])
        setCount(data.count || 0)
      }
    } catch {
      setError("Failed to search. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [city, state, zip, specialty, name])

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-warm-800">
            Find a Provider
          </h1>
          <p className="text-sm text-warm-500 mt-1">
            Search the NPI Registry &middot; Real-time data from CMS NPPES
          </p>
        </div>
        <AIAction
          agentId="scheduling"
          label="AI Match"
          prompt="Based on the clinic's patient panel, suggest in-network providers that would complement our existing specialty coverage. Consider insurance network compatibility and geographic accessibility."
        />
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-2xl border border-sand p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-warm-700 mb-1.5 block">
              City
            </label>
            <div className="relative">
              <MapPin
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-cloudy"
              />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Portland"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-sand bg-cream/50 text-sm text-warm-800 placeholder:text-cloudy focus:outline-none focus:border-terra/40 focus:ring-1 focus:ring-terra/20 transition"
              />
            </div>
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

          <div>
            <label className="text-xs font-semibold text-warm-700 mb-1.5 block">
              Specialty
            </label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-sand bg-cream/50 text-sm text-warm-800 focus:outline-none focus:border-terra/40 appearance-none cursor-pointer"
            >
              <option value="">Any Specialty</option>
              {COMMON_SPECIALTIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-warm-700 mb-1.5 block">
              Provider Name
            </label>
            <div className="relative">
              <User
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-cloudy"
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-sand bg-cream/50 text-sm text-warm-800 placeholder:text-cloudy focus:outline-none focus:border-terra/40 focus:ring-1 focus:ring-terra/20 transition"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={searchProviders}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-terra text-white text-sm font-semibold rounded-xl hover:bg-terra-dark transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              Search Providers
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
                : `${count} provider${count !== 1 ? "s" : ""} found`}
            </p>
            <span className="text-[10px] text-cloudy flex items-center gap-1">
              <BadgeCheck size={10} /> Live data from NPI Registry
            </span>
          </div>

          <div className="space-y-3">
            {results.map((provider) => (
              <div
                key={provider.npi}
                className="bg-white rounded-2xl border border-sand p-5 hover:border-terra/20 hover:shadow-sm transition"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-terra/10 to-terra/5 flex items-center justify-center text-terra shrink-0">
                    <Stethoscope size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-warm-800">
                        {provider.name}
                        {provider.credential && (
                          <span className="text-warm-500 font-normal">
                            , {provider.credential}
                          </span>
                        )}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent uppercase">
                        {provider.status}
                      </span>
                      {provider.gender && (
                        <span className="text-[10px] text-cloudy">
                          {provider.gender}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-terra font-semibold mt-1">
                      {provider.specialty}
                    </p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-warm-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {provider.fullAddress}
                      </span>
                      {provider.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} />
                          {provider.phone}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] font-mono text-cloudy">
                        NPI: {provider.npi}
                      </span>
                      {provider.taxonomyCode && (
                        <span className="text-[10px] font-mono text-cloudy">
                          Taxonomy: {provider.taxonomyCode}
                        </span>
                      )}
                    </div>
                  </div>

                  <AIAction
                    agentId="scheduling"
                    label="Book"
                    prompt={`Check if ${provider.name} (NPI: ${provider.npi}, ${provider.specialty}) is in-network for our patients' insurance plans and find available appointment slots.`}
                    context={`Provider: ${provider.name}, Specialty: ${provider.specialty}, Location: ${provider.fullAddress}, NPI: ${provider.npi}`}
                    variant="inline"
                  />
                </div>
              </div>
            ))}
          </div>

          {results.length === 0 && !isLoading && (
            <div className="text-center py-12 bg-white rounded-2xl border border-sand">
              <Stethoscope size={32} className="text-sand mx-auto mb-3" />
              <p className="text-sm text-warm-500">
                No providers found. Try adjusting your search criteria.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pre-search state */}
      {!hasSearched && (
        <div className="text-center py-16 bg-white rounded-2xl border border-sand">
          <div className="w-16 h-16 rounded-2xl bg-terra/5 flex items-center justify-center mx-auto mb-4">
            <Search size={28} className="text-terra" />
          </div>
          <h3 className="text-lg font-serif text-warm-800">
            Search the NPI Registry
          </h3>
          <p className="text-sm text-warm-500 mt-2 max-w-md mx-auto">
            Find healthcare providers by city, ZIP code, specialty, or name.
            Real-time data from the CMS National Plan and Provider Enumeration
            System.
          </p>
        </div>
      )}
    </div>
  )
}
