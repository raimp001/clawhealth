"use client"

import { cn } from "@/lib/utils"
import {
  Search,
  MapPin,
  Phone,
  Stethoscope,
  Loader2,
  BadgeCheck,
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
  fullAddress: string
  status: string
}

interface ParsedQuery {
  city?: string
  state?: string
  zip?: string
  specialty?: string
  firstName?: string
  lastName?: string
}

const EXAMPLE_SEARCHES = [
  "Cardiologist in Portland OR",
  "Pediatrician 97201",
  "Dermatologist New York",
  "Family medicine Chicago IL",
  "Therapist 10001",
  "Orthopedic surgeon Dallas Texas",
]

export default function ProvidersPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Provider[]>([])
  const [count, setCount] = useState(0)
  const [parsed, setParsed] = useState<ParsedQuery | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState("")

  const searchProviders = useCallback(
    async (searchQuery?: string) => {
      const q = (searchQuery || query).trim()
      if (!q) {
        setError("Type what you're looking for.")
        return
      }

      setIsLoading(true)
      setError("")
      setHasSearched(true)
      if (searchQuery) setQuery(searchQuery)

      try {
        const res = await fetch(
          `/api/providers/search?q=${encodeURIComponent(q)}&limit=20`
        )
        const data = await res.json()

        if (data.error) {
          setError(data.error)
          setResults([])
        } else {
          setResults(data.providers || [])
          setCount(data.count || 0)
          setParsed(data.parsed || null)
        }
      } catch {
        setError("Failed to search. Please try again.")
      } finally {
        setIsLoading(false)
      }
    },
    [query]
  )

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-warm-800">
            Find a Provider
          </h1>
          <p className="text-sm text-warm-500 mt-1">
            Search in plain English &middot; Live NPI Registry data
          </p>
        </div>
        <AIAction
          agentId="scheduling"
          label="AI Match"
          prompt="Based on our patient panel, suggest in-network providers that complement our existing specialty coverage."
        />
      </div>

      {/* Single Search Bar */}
      <div className="bg-pampas rounded-2xl border border-sand p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-cloudy"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchProviders()}
              placeholder="e.g. Cardiologist in Portland OR, Pediatrician 97201, Dr. Smith..."
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-sand bg-cream/30 text-sm text-warm-800 placeholder:text-cloudy focus:outline-none focus:border-terra/40 focus:ring-2 focus:ring-terra/10 transition"
            />
          </div>
          <button
            onClick={() => searchProviders()}
            disabled={isLoading}
            className="px-6 py-3.5 bg-terra text-white text-sm font-semibold rounded-xl hover:bg-terra-dark transition flex items-center gap-2 disabled:opacity-50 shrink-0"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            Search
          </button>
        </div>

        {/* Parsed interpretation */}
        {parsed && hasSearched && !isLoading && (
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-[10px] text-cloudy">Searched for:</span>
            {parsed.specialty && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-terra/10 text-terra">
                {parsed.specialty}
              </span>
            )}
            {parsed.city && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-soft-blue/10 text-soft-blue">
                {parsed.city}
              </span>
            )}
            {parsed.state && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                {parsed.state}
              </span>
            )}
            {parsed.zip && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                ZIP {parsed.zip}
              </span>
            )}
          </div>
        )}

        {error && <p className="text-xs text-soft-red mt-3">{error}</p>}
      </div>

      {/* Results */}
      {hasSearched && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-warm-500">
              {isLoading
                ? "Searching NPI Registry..."
                : `${count} provider${count !== 1 ? "s" : ""} found`}
            </p>
            <span className="text-[10px] text-cloudy flex items-center gap-1">
              <BadgeCheck size={10} /> Live CMS data
            </span>
          </div>

          <div className="space-y-3">
            {results.map((provider) => (
              <div
                key={provider.npi}
                className="bg-pampas rounded-2xl border border-sand p-5 hover:border-terra/20 hover:shadow-sm transition"
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

                    <span className="text-[10px] font-mono text-cloudy mt-1.5 block">
                      NPI: {provider.npi}
                    </span>
                  </div>

                  <AIAction
                    agentId="scheduling"
                    label="Book"
                    prompt={`Check if ${provider.name} (NPI: ${provider.npi}, ${provider.specialty}) is in-network for our patients and find appointment slots.`}
                    context={`Provider: ${provider.name}, Specialty: ${provider.specialty}, Location: ${provider.fullAddress}, NPI: ${provider.npi}`}
                    variant="inline"
                  />
                </div>
              </div>
            ))}
          </div>

          {results.length === 0 && !isLoading && (
            <div className="text-center py-12 bg-pampas rounded-2xl border border-sand">
              <Stethoscope size={32} className="text-sand mx-auto mb-3" />
              <p className="text-sm text-warm-500">
                No providers found. Try a different search.
              </p>
              <p className="text-xs text-cloudy mt-1">
                Tip: Include a state (e.g. &ldquo;Portland OR&rdquo;) for
                better results
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pre-search state with examples */}
      {!hasSearched && (
        <div className="text-center py-12 bg-pampas rounded-2xl border border-sand">
          <div className="w-16 h-16 rounded-2xl bg-terra/5 flex items-center justify-center mx-auto mb-4">
            <Search size={28} className="text-terra" />
          </div>
          <h3 className="text-lg font-serif text-warm-800">
            Just type what you need
          </h3>
          <p className="text-sm text-warm-500 mt-2 max-w-md mx-auto">
            Search in plain English. We&apos;ll figure out the specialty,
            location, and provider details.
          </p>

          <div className="flex flex-wrap gap-2 justify-center mt-6 max-w-lg mx-auto">
            {EXAMPLE_SEARCHES.map((ex) => (
              <button
                key={ex}
                onClick={() => searchProviders(ex)}
                className="px-3 py-1.5 text-xs font-medium text-warm-600 bg-cream rounded-lg border border-sand hover:border-terra/30 hover:text-terra transition"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
