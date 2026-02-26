export interface LivePhysician {
  id: string
  email: string
  full_name: string
  specialty: string
  credentials: string
  phone: string
  available_days: string[]
  available_start: string
  available_end: string
}

export interface LivePatient {
  id: string
  full_name: string
  date_of_birth: string
  gender: string
  phone: string
  email: string
  address: string
  insurance_provider: string
  insurance_plan: string
  insurance_id: string
  emergency_contact_name: string
  emergency_contact_phone: string
  medical_history: { condition: string; diagnosed: string; status: string }[]
  allergies: string[]
  primary_physician_id: string
  created_at: string
}

export interface LiveAppointment {
  id: string
  patient_id: string
  physician_id: string
  scheduled_at: string
  duration_minutes: number
  type: string
  status: string
  reason: string
  notes: string
  copay: number
}

export interface LiveClaim {
  id: string
  patient_id: string
  appointment_id: string
  claim_number: string
  status: string
  total_amount: number
  insurance_paid: number
  patient_responsibility: number
  cpt_codes: string[]
  icd_codes: string[]
  date_of_service: string
  submitted_at: string
  resolved_at: string | null
  denial_reason: string | null
  errors_detected: { type: string; description: string; severity: string }[]
  notes: string
}

export interface LivePrescription {
  id: string
  patient_id: string
  physician_id: string
  medication_name: string
  dosage: string
  frequency: string
  start_date: string
  end_date: string | null
  refills_remaining: number
  pharmacy: string
  status: string
  adherence_pct: number
  last_filled: string
  notes: string
}

export interface LivePriorAuth {
  id: string
  patient_id: string
  physician_id: string
  insurance_provider: string
  procedure_code: string
  procedure_name: string
  icd_codes: string[]
  status: string
  urgency: string
  reference_number: string | null
  submitted_at: string | null
  resolved_at: string | null
  denial_reason: string | null
  clinical_notes: string
}

export interface LiveMessage {
  id: string
  patient_id: string
  physician_id: string | null
  sender_type: string
  content: string
  channel: string
  read: boolean
  created_at: string
}

export interface LiveLabResult {
  id: string
  patient_id: string
  physician_id: string
  test_name: string
  category: string
  lab_facility: string
  ordered_at: string
  resulted_at: string | null
  status: string
  results: {
    name: string
    value: string
    unit?: string
    reference_range?: string
    flag: "normal" | "high" | "low" | "critical"
  }[]
  notes: string
}

export interface LiveVital {
  id: string
  patient_id: string
  recorded_at: string
  systolic?: number
  diastolic?: number
  heart_rate?: number
  blood_glucose?: number
  weight_lbs?: number
  oxygen_saturation?: number
  temperature_f?: number
  source: "home" | "clinic" | "device"
}

export interface LiveVaccination {
  id: string
  patient_id: string
  vaccine_name: string
  brand: string
  dose_number: number
  total_doses: number
  administered_at: string | null
  due_at: string | null
  next_due?: string | null
  status: "completed" | "due" | "overdue"
  facility: string
  administered_by: string
  lot_number: string
  site: string
  notes: string
}

export interface LiveReferral {
  id: string
  patient_id: string
  physician_id: string
  referring_physician_id: string
  specialist_name: string
  specialist_specialty: string
  reason: string
  status: "pending" | "scheduled" | "completed" | "cancelled"
  insurance_authorized: boolean
  referred_at: string
  created_at: string
  appointment_at: string | null
  appointment_date: string | null
  specialist_phone: string
  urgency: "routine" | "urgent" | "stat"
  notes: string
}

export interface LiveSnapshot {
  source: "database"
  walletAddress: string | null
  generatedAt: string
  patient: LivePatient | null
  physicians: LivePhysician[]
  appointments: LiveAppointment[]
  claims: LiveClaim[]
  prescriptions: LivePrescription[]
  priorAuths: LivePriorAuth[]
  messages: LiveMessage[]
  labResults: LiveLabResult[]
  vitals: LiveVital[]
  vaccinations: LiveVaccination[]
  referrals: LiveReferral[]
}

export function createEmptyLiveSnapshot(walletAddress?: string | null): LiveSnapshot {
  return {
    source: "database",
    walletAddress: walletAddress || null,
    generatedAt: new Date().toISOString(),
    patient: null,
    physicians: [],
    appointments: [],
    claims: [],
    prescriptions: [],
    priorAuths: [],
    messages: [],
    labResults: [],
    vitals: [],
    vaccinations: [],
    referrals: [],
  }
}
