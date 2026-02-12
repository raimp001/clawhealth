"use client"

import { patients, getPhysician, getPatientAppointments, getPatientPrescriptions } from "@/lib/seed-data"
import { cn, getInitials, formatDate, getStatusColor } from "@/lib/utils"
import { Search, Filter, Phone, Mail, Calendar, Pill, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useState, useMemo } from "react"

export default function PatientsPage() {
  const [search, setSearch] = useState("")
  const [insuranceFilter, setInsuranceFilter] = useState("")

  const insuranceProviders = useMemo(
    () => Array.from(new Set(patients.map((p) => p.insurance_provider))),
    []
  )

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch =
        !search ||
        p.full_name.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase()) ||
        p.insurance_id.toLowerCase().includes(search.toLowerCase())
      const matchesInsurance =
        !insuranceFilter || p.insurance_provider === insuranceFilter
      return matchesSearch && matchesInsurance
    })
  }, [search, insuranceFilter])

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-warm-800">Patients</h1>
          <p className="text-sm text-warm-500 mt-1">
            {patients.length} active patients in system
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-cloudy"
          />
          <input
            type="text"
            placeholder="Search by name, email, or insurance ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-sand bg-white text-sm text-warm-800 placeholder:text-cloudy focus:outline-none focus:border-terra/40 focus:ring-1 focus:ring-terra/20 transition"
          />
        </div>
        <div className="relative">
          <Filter
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-cloudy"
          />
          <select
            value={insuranceFilter}
            onChange={(e) => setInsuranceFilter(e.target.value)}
            className="pl-9 pr-8 py-2.5 rounded-xl border border-sand bg-white text-sm text-warm-800 focus:outline-none focus:border-terra/40 appearance-none cursor-pointer"
          >
            <option value="">All Insurance</option>
            {insuranceProviders.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Patient Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((patient) => {
          const physician = getPhysician(patient.primary_physician_id)
          const appointments = getPatientAppointments(patient.id)
          const rxs = getPatientPrescriptions(patient.id)
          const activeRx = rxs.filter((r) => r.status === "active").length
          const upcomingApts = appointments.filter(
            (a) => new Date(a.scheduled_at) > new Date() && a.status === "scheduled"
          ).length

          return (
            <Link
              key={patient.id}
              href={`/patients/${patient.id}`}
              className="bg-white rounded-2xl border border-sand p-5 hover:border-terra/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-terra/5 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-terra/10 to-terra/5 flex items-center justify-center text-terra font-bold text-sm font-serif shrink-0">
                  {getInitials(patient.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-warm-800 group-hover:text-terra transition">
                      {patient.full_name}
                    </h3>
                    <ChevronRight
                      size={14}
                      className="text-cloudy group-hover:text-terra transition opacity-0 group-hover:opacity-100"
                    />
                  </div>
                  <p className="text-xs text-warm-500 mt-0.5">
                    {patient.gender} &middot; DOB:{" "}
                    {formatDate(patient.date_of_birth)} &middot;{" "}
                    {physician?.full_name}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {patient.medical_history
                      .filter((h) => h.status !== "managed")
                      .map((h) => (
                        <span
                          key={h.condition}
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                            h.status === "in-treatment"
                              ? "bg-terra-100 text-terra"
                              : h.status === "active"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-blue-100 text-blue-700"
                          )}
                        >
                          {h.condition}
                        </span>
                      ))}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-warm-500">
                    <span className="flex items-center gap-1">
                      <Phone size={12} />
                      {patient.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {upcomingApts} upcoming
                    </span>
                    <span className="flex items-center gap-1">
                      <Pill size={12} />
                      {activeRx} active Rx
                    </span>
                  </div>

                  {/* Insurance */}
                  <div className="mt-2 text-[10px] text-cloudy">
                    {patient.insurance_provider} &middot;{" "}
                    {patient.insurance_plan} &middot; {patient.insurance_id}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-warm-500 text-sm">No patients match your search.</p>
        </div>
      )}
    </div>
  )
}
