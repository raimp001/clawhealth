// ── Types ──────────────────────────────────────────────
export interface Physician {
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

export interface Patient {
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

export interface Appointment {
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

export interface Claim {
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

export interface Prescription {
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

export interface PriorAuth {
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

export interface Message {
  id: string
  patient_id: string
  physician_id: string | null
  sender_type: string
  content: string
  channel: string
  read: boolean
  created_at: string
}

// ── Helper ─────────────────────────────────────────────
function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}
function daysAgo(n: number): string {
  return daysFromNow(-n)
}
function todayAt(hour: number, min: number = 0): string {
  const d = new Date()
  d.setHours(hour, min, 0, 0)
  return d.toISOString()
}

// ── Physicians (Primary Care Focused) ─────────────────
export const physicians: Physician[] = [
  {
    id: "ph-001",
    email: "patel@providence.org",
    full_name: "Dr. Priya Patel",
    specialty: "Family Medicine",
    credentials: "MD, FAAFP",
    phone: "(503) 494-8311",
    available_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    available_start: "08:00",
    available_end: "17:00",
  },
  {
    id: "ph-002",
    email: "chen.j@ohsu.edu",
    full_name: "Dr. James Chen",
    specialty: "Internal Medicine",
    credentials: "MD, MPH",
    phone: "(503) 494-7520",
    available_days: ["Mon", "Tue", "Wed", "Thu"],
    available_start: "09:00",
    available_end: "16:00",
  },
  {
    id: "ph-003",
    email: "nguyen.l@ohsu.edu",
    full_name: "Dr. Lisa Nguyen",
    specialty: "OB/GYN",
    credentials: "MD, FACOG",
    phone: "(503) 494-6230",
    available_days: ["Mon", "Wed", "Fri"],
    available_start: "08:30",
    available_end: "15:30",
  },
  {
    id: "ph-004",
    email: "park.d@ohsu.edu",
    full_name: "Dr. David Park",
    specialty: "Cardiology",
    credentials: "MD, FACC",
    phone: "(503) 494-5100",
    available_days: ["Tue", "Wed", "Thu", "Fri"],
    available_start: "07:30",
    available_end: "16:30",
  },
]

// ── Patients ───────────────────────────────────────────
export const patients: Patient[] = [
  {
    id: "pt-001",
    full_name: "James Thompson",
    date_of_birth: "1968-03-15",
    gender: "Male",
    phone: "(503) 555-0142",
    email: "james.t@email.com",
    address: "1420 NW Lovejoy St, Portland, OR 97209",
    insurance_provider: "Blue Cross Blue Shield",
    insurance_plan: "PPO Gold",
    insurance_id: "BCB-441892",
    emergency_contact_name: "Linda Thompson",
    emergency_contact_phone: "(503) 555-0143",
    medical_history: [
      { condition: "Type 2 Diabetes", diagnosed: "2019-06", status: "managed" },
      { condition: "Hypertension", diagnosed: "2018-02", status: "managed" },
      { condition: "Hyperlipidemia", diagnosed: "2020-01", status: "active" },
    ],
    allergies: ["Penicillin", "Sulfa drugs"],
    primary_physician_id: "ph-002",
    created_at: daysAgo(340),
  },
  {
    id: "pt-002",
    full_name: "Maria Santos",
    date_of_birth: "1975-07-22",
    gender: "Female",
    phone: "(503) 555-0187",
    email: "maria.santos@email.com",
    address: "2830 SE Hawthorne Blvd, Portland, OR 97214",
    insurance_provider: "Aetna",
    insurance_plan: "HMO Standard",
    insurance_id: "AET-773021",
    emergency_contact_name: "Carlos Santos",
    emergency_contact_phone: "(503) 555-0188",
    medical_history: [
      { condition: "Anxiety Disorder", diagnosed: "2022-03", status: "managed" },
      { condition: "Vitamin D Deficiency", diagnosed: "2024-01", status: "active" },
    ],
    allergies: ["Latex"],
    primary_physician_id: "ph-001",
    created_at: daysAgo(180),
  },
  {
    id: "pt-003",
    full_name: "Robert Kim",
    date_of_birth: "1952-11-08",
    gender: "Male",
    phone: "(503) 555-0234",
    email: "r.kim@email.com",
    address: "5670 SW Beaverton-Hillsdale Hwy, Portland, OR 97221",
    insurance_provider: "Medicare",
    insurance_plan: "Part B + Supplement F",
    insurance_id: "MCR-198211083",
    emergency_contact_name: "Susan Kim",
    emergency_contact_phone: "(503) 555-0235",
    medical_history: [
      { condition: "COPD", diagnosed: "2021-04", status: "active" },
      { condition: "Atrial Fibrillation", diagnosed: "2023-01", status: "managed" },
      { condition: "Chronic Kidney Disease (Stage 3)", diagnosed: "2024-06", status: "monitored" },
    ],
    allergies: ["Aspirin", "Iodine contrast"],
    primary_physician_id: "ph-003",
    created_at: daysAgo(500),
  },
  {
    id: "pt-004",
    full_name: "Sarah Johnson",
    date_of_birth: "1978-09-30",
    gender: "Female",
    phone: "(503) 555-0311",
    email: "sarah.j@email.com",
    address: "890 NE Alberta St, Portland, OR 97211",
    insurance_provider: "Blue Cross Blue Shield",
    insurance_plan: "PPO Silver",
    insurance_id: "BCB-552901",
    emergency_contact_name: "Mike Johnson",
    emergency_contact_phone: "(503) 555-0312",
    medical_history: [
      { condition: "Migraine with Aura", diagnosed: "2020-11", status: "active" },
      { condition: "Hypothyroidism", diagnosed: "2021-07", status: "managed" },
    ],
    allergies: [],
    primary_physician_id: "ph-002",
    created_at: daysAgo(220),
  },
  {
    id: "pt-005",
    full_name: "David Chen",
    date_of_birth: "1990-04-12",
    gender: "Male",
    phone: "(503) 555-0455",
    email: "david.chen@email.com",
    address: "3340 N Williams Ave, Portland, OR 97227",
    insurance_provider: "United Healthcare",
    insurance_plan: "Choice Plus",
    insurance_id: "UHC-890134",
    emergency_contact_name: "Amy Chen",
    emergency_contact_phone: "(503) 555-0456",
    medical_history: [
      { condition: "Asthma", diagnosed: "2005-01", status: "managed" },
    ],
    allergies: ["Shellfish"],
    primary_physician_id: "ph-002",
    created_at: daysAgo(90),
  },
  {
    id: "pt-006",
    full_name: "Patricia Williams",
    date_of_birth: "1960-12-03",
    gender: "Female",
    phone: "(503) 555-0599",
    email: "pat.williams@email.com",
    address: "7712 SE Division St, Portland, OR 97206",
    insurance_provider: "Aetna",
    insurance_plan: "PPO Premium",
    insurance_id: "AET-661204",
    emergency_contact_name: "Tom Williams",
    emergency_contact_phone: "(503) 555-0600",
    medical_history: [
      { condition: "Osteoarthritis (knee)", diagnosed: "2023-03", status: "active" },
      { condition: "Type 2 Diabetes", diagnosed: "2016-09", status: "managed" },
      { condition: "Osteoporosis", diagnosed: "2022-08", status: "managed" },
    ],
    allergies: ["Codeine"],
    primary_physician_id: "ph-001",
    created_at: daysAgo(290),
  },
  {
    id: "pt-007",
    full_name: "Michael Nguyen",
    date_of_birth: "1985-06-18",
    gender: "Male",
    phone: "(503) 555-0722",
    email: "m.nguyen@email.com",
    address: "1122 NW 23rd Ave, Portland, OR 97210",
    insurance_provider: "Kaiser Permanente",
    insurance_plan: "Gold 80 HMO",
    insurance_id: "KP-885061",
    emergency_contact_name: "Lisa Nguyen",
    emergency_contact_phone: "(503) 555-0723",
    medical_history: [
      { condition: "Generalized Anxiety Disorder", diagnosed: "2023-05", status: "managed" },
      { condition: "GERD", diagnosed: "2024-02", status: "active" },
    ],
    allergies: [],
    primary_physician_id: "ph-002",
    created_at: daysAgo(150),
  },
  {
    id: "pt-008",
    full_name: "Elena Rodriguez",
    date_of_birth: "1972-01-25",
    gender: "Female",
    phone: "(503) 555-0844",
    email: "elena.r@email.com",
    address: "4550 SE Belmont St, Portland, OR 97215",
    insurance_provider: "Blue Cross Blue Shield",
    insurance_plan: "HMO Select",
    insurance_id: "BCB-720125",
    emergency_contact_name: "Pedro Rodriguez",
    emergency_contact_phone: "(503) 555-0845",
    medical_history: [
      { condition: "Rheumatoid Arthritis", diagnosed: "2019-11", status: "active" },
      { condition: "Hypertension", diagnosed: "2020-06", status: "managed" },
    ],
    allergies: ["NSAIDs"],
    primary_physician_id: "ph-004",
    created_at: daysAgo(400),
  },
  {
    id: "pt-009",
    full_name: "William Foster",
    date_of_birth: "1945-08-14",
    gender: "Male",
    phone: "(503) 555-0933",
    email: "w.foster@email.com",
    address: "2200 SW 1st Ave, Portland, OR 97201",
    insurance_provider: "Medicare",
    insurance_plan: "Advantage Plus",
    insurance_id: "MCR-194508142",
    emergency_contact_name: "Dorothy Foster",
    emergency_contact_phone: "(503) 555-0934",
    medical_history: [
      { condition: "Congestive Heart Failure", diagnosed: "2023-09", status: "active" },
      { condition: "Type 2 Diabetes", diagnosed: "2010-03", status: "managed" },
      { condition: "Chronic Kidney Disease (Stage 4)", diagnosed: "2025-01", status: "active" },
      { condition: "Atrial Fibrillation", diagnosed: "2022-06", status: "managed" },
    ],
    allergies: ["ACE Inhibitors", "Metformin"],
    primary_physician_id: "ph-004",
    created_at: daysAgo(600),
  },
  {
    id: "pt-010",
    full_name: "Amanda Liu",
    date_of_birth: "1995-02-09",
    gender: "Female",
    phone: "(503) 555-1042",
    email: "amanda.liu@email.com",
    address: "615 NE Fremont St, Portland, OR 97212",
    insurance_provider: "United Healthcare",
    insurance_plan: "PPO Standard",
    insurance_id: "UHC-950209",
    emergency_contact_name: "Kevin Liu",
    emergency_contact_phone: "(503) 555-1043",
    medical_history: [
      { condition: "Iron Deficiency Anemia", diagnosed: "2025-06", status: "active" },
    ],
    allergies: [],
    primary_physician_id: "ph-001",
    created_at: daysAgo(60),
  },
]

// ── Appointments ───────────────────────────────────────
export const appointments: Appointment[] = [
  // Today's appointments — primary care focused
  { id: "apt-001", patient_id: "pt-001", physician_id: "ph-002", scheduled_at: todayAt(8, 30), duration_minutes: 30, type: "follow-up", status: "completed", reason: "Annual wellness visit + A1C check", notes: "A1C improved to 6.8%. Continue current regimen.", copay: 0 },
  { id: "apt-002", patient_id: "pt-002", physician_id: "ph-001", scheduled_at: todayAt(9, 0), duration_minutes: 30, type: "follow-up", status: "in-progress", reason: "Anxiety follow-up + Pap smear", notes: "", copay: 30 },
  { id: "apt-003", patient_id: "pt-005", physician_id: "ph-002", scheduled_at: todayAt(9, 30), duration_minutes: 20, type: "follow-up", status: "checked-in", reason: "Asthma check + flu vaccine", notes: "", copay: 0 },
  { id: "apt-004", patient_id: "pt-003", physician_id: "ph-001", scheduled_at: todayAt(10, 0), duration_minutes: 45, type: "follow-up", status: "scheduled", reason: "Colonoscopy prep consult", notes: "", copay: 0 },
  { id: "apt-005", patient_id: "pt-008", physician_id: "ph-004", scheduled_at: todayAt(10, 30), duration_minutes: 30, type: "follow-up", status: "scheduled", reason: "EKG + blood pressure review", notes: "", copay: 40 },
  { id: "apt-006", patient_id: "pt-004", physician_id: "ph-002", scheduled_at: todayAt(11, 0), duration_minutes: 30, type: "urgent", status: "scheduled", reason: "Severe migraine episode", notes: "", copay: 40 },
  { id: "apt-007", patient_id: "pt-009", physician_id: "ph-004", scheduled_at: todayAt(13, 0), duration_minutes: 30, type: "follow-up", status: "scheduled", reason: "Echocardiogram results review", notes: "", copay: 0 },
  { id: "apt-008", patient_id: "pt-006", physician_id: "ph-001", scheduled_at: todayAt(14, 0), duration_minutes: 45, type: "follow-up", status: "scheduled", reason: "Knee pain — ultrasound review + PT referral", notes: "", copay: 40 },
  { id: "apt-009", patient_id: "pt-010", physician_id: "ph-003", scheduled_at: todayAt(15, 0), duration_minutes: 30, type: "new-patient", status: "scheduled", reason: "Well-woman visit + mammogram order", notes: "", copay: 0 },
  // Past appointments
  { id: "apt-010", patient_id: "pt-001", physician_id: "ph-002", scheduled_at: daysAgo(14), duration_minutes: 30, type: "follow-up", status: "completed", reason: "Diabetes management + cholesterol check", notes: "A1C 7.2%. Increased metformin. Lipids normal.", copay: 40 },
  { id: "apt-011", patient_id: "pt-002", physician_id: "ph-001", scheduled_at: daysAgo(21), duration_minutes: 30, type: "follow-up", status: "completed", reason: "Psychotherapy session", notes: "CBT session 8. Good progress with anxiety management.", copay: 30 },
  { id: "apt-012", patient_id: "pt-003", physician_id: "ph-001", scheduled_at: daysAgo(7), duration_minutes: 30, type: "follow-up", status: "completed", reason: "Spirometry + COPD management", notes: "FEV1 stable. Continue tiotropium.", copay: 0 },
  { id: "apt-013", patient_id: "pt-004", physician_id: "ph-002", scheduled_at: daysAgo(30), duration_minutes: 30, type: "follow-up", status: "no-show", reason: "Migraine follow-up", notes: "", copay: 40 },
  { id: "apt-014", patient_id: "pt-007", physician_id: "ph-002", scheduled_at: daysAgo(3), duration_minutes: 50, type: "follow-up", status: "completed", reason: "Therapy session — anxiety management", notes: "Stable on sertraline. Continue therapy.", copay: 35 },
  { id: "apt-015", patient_id: "pt-009", physician_id: "ph-004", scheduled_at: daysAgo(10), duration_minutes: 45, type: "follow-up", status: "completed", reason: "BP monitoring + EKG", notes: "BP well controlled. EKG normal sinus.", copay: 0 },
  // Future appointments
  { id: "apt-016", patient_id: "pt-002", physician_id: "ph-003", scheduled_at: daysFromNow(7), duration_minutes: 30, type: "follow-up", status: "scheduled", reason: "Mammogram + breast exam", notes: "", copay: 0 },
  { id: "apt-017", patient_id: "pt-003", physician_id: "ph-002", scheduled_at: daysFromNow(3), duration_minutes: 60, type: "follow-up", status: "scheduled", reason: "Colonoscopy (screening)", notes: "", copay: 0 },
  { id: "apt-018", patient_id: "pt-006", physician_id: "ph-001", scheduled_at: daysFromNow(14), duration_minutes: 45, type: "follow-up", status: "scheduled", reason: "Physical therapy session — knee rehab", notes: "", copay: 30 },
  { id: "apt-019", patient_id: "pt-007", physician_id: "ph-002", scheduled_at: daysFromNow(28), duration_minutes: 30, type: "telehealth", status: "scheduled", reason: "Acupuncture consult", notes: "", copay: 25 },
  { id: "apt-020", patient_id: "pt-005", physician_id: "ph-002", scheduled_at: daysFromNow(5), duration_minutes: 20, type: "telehealth", status: "scheduled", reason: "Flu vaccine + COVID booster", notes: "", copay: 0 },
]

// ── Claims ─────────────────────────────────────────────
export const claims: Claim[] = [
  {
    id: "clm-001", patient_id: "pt-001", appointment_id: "apt-010", claim_number: "BCB-2026-44201",
    status: "paid", total_amount: 285, insurance_paid: 245, patient_responsibility: 40,
    cpt_codes: ["99214", "83036"], icd_codes: ["E11.65", "I10"],
    date_of_service: daysAgo(14), submitted_at: daysAgo(13), resolved_at: daysAgo(5),
    denial_reason: null, errors_detected: [], notes: "Standard follow-up with A1C lab",
  },
  {
    id: "clm-002", patient_id: "pt-002", appointment_id: "apt-011", claim_number: "AET-2026-33105",
    status: "processing", total_amount: 350, insurance_paid: 0, patient_responsibility: 0,
    cpt_codes: ["99395", "90686", "96372"], icd_codes: ["Z00.00", "Z23"],
    date_of_service: daysAgo(21), submitted_at: daysAgo(20), resolved_at: null,
    denial_reason: null, errors_detected: [], notes: "Preventive visit + flu vaccine",
  },
  {
    id: "clm-003", patient_id: "pt-003", appointment_id: "apt-012", claim_number: "MCR-2026-28744",
    status: "denied", total_amount: 1200, insurance_paid: 0, patient_responsibility: 1200,
    cpt_codes: ["94010", "94060", "99214"], icd_codes: ["J44.1"],
    date_of_service: daysAgo(7), submitted_at: daysAgo(6), resolved_at: daysAgo(2),
    denial_reason: "Prior authorization required for spirometry with bronchodilator",
    errors_detected: [
      { type: "missing_auth", description: "CPT 94060 requires prior authorization for Medicare patients", severity: "high" },
    ],
    notes: "Need to file PA retroactively and appeal",
  },
  {
    id: "clm-004", patient_id: "pt-004", appointment_id: "apt-013", claim_number: "BCB-2026-41882",
    status: "denied", total_amount: 210, insurance_paid: 0, patient_responsibility: 210,
    cpt_codes: ["99213"], icd_codes: ["G43.109"],
    date_of_service: daysAgo(30), submitted_at: daysAgo(29), resolved_at: daysAgo(20),
    denial_reason: "Patient no-show — cannot bill",
    errors_detected: [
      { type: "billing_error", description: "Visit billed for no-show appointment", severity: "high" },
    ],
    notes: "Submitted in error — no-show should not have been billed",
  },
  {
    id: "clm-005", patient_id: "pt-008", appointment_id: "", claim_number: "BCB-2026-55901",
    status: "appealed", total_amount: 3400, insurance_paid: 0, patient_responsibility: 3400,
    cpt_codes: ["99285", "71046"], icd_codes: ["R07.9", "I48.91"],
    date_of_service: daysAgo(45), submitted_at: daysAgo(44), resolved_at: null,
    denial_reason: "ER facility fee billed out-of-network (should be in-network)",
    errors_detected: [
      { type: "network_error", description: "CPT 99285 billed as out-of-network but ER is in-network per plan terms", severity: "high" },
      { type: "duplicate_charge", description: "Facility fee appears to be double-charged ($1,200 × 2)", severity: "high" },
    ],
    notes: "Appeal filed — potential savings of $2,560",
  },
  {
    id: "clm-006", patient_id: "pt-006", appointment_id: "", claim_number: "AET-2026-39200",
    status: "approved", total_amount: 450, insurance_paid: 410, patient_responsibility: 40,
    cpt_codes: ["45378", "99214"], icd_codes: ["Z12.11", "K63.5"],
    date_of_service: daysAgo(35), submitted_at: daysAgo(34), resolved_at: daysAgo(15),
    denial_reason: null, errors_detected: [], notes: "Screening colonoscopy — polyp removed",
  },
  {
    id: "clm-007", patient_id: "pt-009", appointment_id: "apt-015", claim_number: "MCR-2026-31055",
    status: "submitted", total_amount: 520, insurance_paid: 0, patient_responsibility: 0,
    cpt_codes: ["99215", "93306"], icd_codes: ["I50.22", "I48.0"],
    date_of_service: daysAgo(10), submitted_at: daysAgo(9), resolved_at: null,
    denial_reason: null, errors_detected: [], notes: "CHF follow-up with echocardiogram",
  },
  {
    id: "clm-008", patient_id: "pt-007", appointment_id: "apt-014", claim_number: "KP-2026-18820",
    status: "paid", total_amount: 195, insurance_paid: 160, patient_responsibility: 35,
    cpt_codes: ["99213"], icd_codes: ["F41.1"],
    date_of_service: daysAgo(3), submitted_at: daysAgo(2), resolved_at: daysAgo(1),
    denial_reason: null, errors_detected: [], notes: "Anxiety management visit",
  },
  {
    id: "clm-009", patient_id: "pt-005", appointment_id: "", claim_number: "UHC-2026-44100",
    status: "processing", total_amount: 340, insurance_paid: 0, patient_responsibility: 0,
    cpt_codes: ["99214", "94010"], icd_codes: ["J45.30"],
    date_of_service: daysAgo(18), submitted_at: daysAgo(17), resolved_at: null,
    denial_reason: null, errors_detected: [], notes: "Asthma follow-up with PFT",
  },
  {
    id: "clm-010", patient_id: "pt-001", appointment_id: "apt-001", claim_number: "BCB-2026-48300",
    status: "submitted", total_amount: 285, insurance_paid: 0, patient_responsibility: 0,
    cpt_codes: ["99214", "83036"], icd_codes: ["E11.65", "I10"],
    date_of_service: new Date().toISOString().split("T")[0], submitted_at: new Date().toISOString(), resolved_at: null,
    denial_reason: null, errors_detected: [], notes: "Today's visit — submitted",
  },
]

// ── Prescriptions ──────────────────────────────────────
export const prescriptions: Prescription[] = [
  { id: "rx-001", patient_id: "pt-001", physician_id: "ph-002", medication_name: "Metformin", dosage: "1000mg", frequency: "Twice daily", start_date: daysAgo(365), end_date: null, refills_remaining: 3, pharmacy: "Walgreens on 39th", status: "active", adherence_pct: 92, last_filled: daysAgo(25), notes: "Take with meals" },
  { id: "rx-002", patient_id: "pt-001", physician_id: "ph-002", medication_name: "Lisinopril", dosage: "20mg", frequency: "Once daily", start_date: daysAgo(400), end_date: null, refills_remaining: 5, pharmacy: "Walgreens on 39th", status: "active", adherence_pct: 88, last_filled: daysAgo(20), notes: "Morning" },
  { id: "rx-003", patient_id: "pt-001", physician_id: "ph-002", medication_name: "Atorvastatin", dosage: "40mg", frequency: "Once daily at bedtime", start_date: daysAgo(300), end_date: null, refills_remaining: 2, pharmacy: "Walgreens on 39th", status: "active", adherence_pct: 78, last_filled: daysAgo(45), notes: "Refill needed soon" },
  { id: "rx-004", patient_id: "pt-002", physician_id: "ph-001", medication_name: "Vitamin D3", dosage: "2000 IU", frequency: "Once daily", start_date: daysAgo(90), end_date: null, refills_remaining: 6, pharmacy: "OHSU Pharmacy", status: "active", adherence_pct: 100, last_filled: daysAgo(18), notes: "For vitamin D deficiency" },
  { id: "rx-005", patient_id: "pt-002", physician_id: "ph-002", medication_name: "Sertraline", dosage: "50mg", frequency: "Once daily", start_date: daysAgo(200), end_date: null, refills_remaining: 4, pharmacy: "OHSU Pharmacy", status: "active", adherence_pct: 95, last_filled: daysAgo(10), notes: "For anxiety" },
  { id: "rx-006", patient_id: "pt-003", physician_id: "ph-003", medication_name: "Tiotropium", dosage: "18mcg", frequency: "Once daily (inhaler)", start_date: daysAgo(7), end_date: null, refills_remaining: 5, pharmacy: "Fred Meyer Pharmacy", status: "active", adherence_pct: 100, last_filled: daysAgo(7), notes: "New — added for COPD" },
  { id: "rx-007", patient_id: "pt-003", physician_id: "ph-004", medication_name: "Apixaban", dosage: "5mg", frequency: "Twice daily", start_date: daysAgo(300), end_date: null, refills_remaining: 1, pharmacy: "Fred Meyer Pharmacy", status: "pending-refill", adherence_pct: 85, last_filled: daysAgo(60), notes: "For AFib — refill needed" },
  { id: "rx-008", patient_id: "pt-004", physician_id: "ph-002", medication_name: "Sumatriptan", dosage: "50mg", frequency: "As needed for migraine", start_date: daysAgo(180), end_date: null, refills_remaining: 4, pharmacy: "CVS on Alberta", status: "active", adherence_pct: 70, last_filled: daysAgo(40), notes: "" },
  { id: "rx-009", patient_id: "pt-004", physician_id: "ph-002", medication_name: "Levothyroxine", dosage: "75mcg", frequency: "Once daily on empty stomach", start_date: daysAgo(365), end_date: null, refills_remaining: 6, pharmacy: "CVS on Alberta", status: "active", adherence_pct: 94, last_filled: daysAgo(15), notes: "30 min before breakfast" },
  { id: "rx-010", patient_id: "pt-005", physician_id: "ph-002", medication_name: "Albuterol", dosage: "90mcg", frequency: "2 puffs every 4-6 hours as needed", start_date: daysAgo(90), end_date: null, refills_remaining: 3, pharmacy: "Rite Aid on Williams", status: "active", adherence_pct: 82, last_filled: daysAgo(30), notes: "Rescue inhaler" },
  { id: "rx-011", patient_id: "pt-006", physician_id: "ph-001", medication_name: "Meloxicam", dosage: "15mg", frequency: "Once daily", start_date: daysAgo(35), end_date: null, refills_remaining: 4, pharmacy: "OHSU Pharmacy", status: "active", adherence_pct: 85, last_filled: daysAgo(35), notes: "For knee osteoarthritis pain" },
  { id: "rx-012", patient_id: "pt-009", physician_id: "ph-004", medication_name: "Furosemide", dosage: "40mg", frequency: "Twice daily", start_date: daysAgo(200), end_date: null, refills_remaining: 2, pharmacy: "Walgreens Downtown", status: "active", adherence_pct: 90, last_filled: daysAgo(28), notes: "Monitor weight daily" },
  { id: "rx-013", patient_id: "pt-009", physician_id: "ph-004", medication_name: "Carvedilol", dosage: "25mg", frequency: "Twice daily", start_date: daysAgo(300), end_date: null, refills_remaining: 3, pharmacy: "Walgreens Downtown", status: "active", adherence_pct: 88, last_filled: daysAgo(22), notes: "Take with food" },
  { id: "rx-014", patient_id: "pt-008", physician_id: "ph-002", medication_name: "Amlodipine", dosage: "5mg", frequency: "Once daily", start_date: daysAgo(150), end_date: null, refills_remaining: 4, pharmacy: "OHSU Pharmacy", status: "active", adherence_pct: 96, last_filled: daysAgo(12), notes: "For hypertension" },
  { id: "rx-015", patient_id: "pt-010", physician_id: "ph-001", medication_name: "Ferrous Sulfate", dosage: "325mg", frequency: "Three times daily", start_date: daysAgo(30), end_date: null, refills_remaining: 5, pharmacy: "CVS on Fremont", status: "active", adherence_pct: 65, last_filled: daysAgo(30), notes: "Take with vitamin C. Low adherence flagged." },
]

// ── Prior Authorizations ───────────────────────────────
export const priorAuths: PriorAuth[] = [
  {
    id: "pa-001", patient_id: "pt-002", physician_id: "ph-003",
    insurance_provider: "Aetna", procedure_code: "77067", procedure_name: "Screening Mammogram",
    icd_codes: ["Z12.31"], status: "approved", urgency: "standard",
    reference_number: "AET-PA-8834", submitted_at: daysAgo(10), resolved_at: daysAgo(8),
    denial_reason: null, clinical_notes: "Routine screening mammogram for woman over 40. USPSTF recommendation.",
  },
  {
    id: "pa-002", patient_id: "pt-003", physician_id: "ph-003",
    insurance_provider: "Medicare", procedure_code: "94060", procedure_name: "Spirometry with Bronchodilator",
    icd_codes: ["J44.1"], status: "pending", urgency: "urgent",
    reference_number: null, submitted_at: daysAgo(1), resolved_at: null,
    denial_reason: null, clinical_notes: "COPD exacerbation. FEV1 declining. Need post-bronchodilator response to guide therapy change.",
  },
  {
    id: "pa-003", patient_id: "pt-006", physician_id: "ph-001",
    insurance_provider: "Aetna", procedure_code: "73721", procedure_name: "MRI Knee (without contrast)",
    icd_codes: ["M17.11", "M25.561"], status: "submitted", urgency: "standard",
    reference_number: "AET-PA-9102", submitted_at: daysAgo(3), resolved_at: null,
    denial_reason: null, clinical_notes: "Knee MRI for persistent osteoarthritis pain not responding to conservative treatment. PT referral pending imaging.",
  },
  {
    id: "pa-004", patient_id: "pt-009", physician_id: "ph-004",
    insurance_provider: "Medicare", procedure_code: "93350", procedure_name: "Stress Echocardiogram",
    icd_codes: ["I50.22", "I48.0"], status: "denied", urgency: "standard",
    reference_number: "MCR-PA-5510", submitted_at: daysAgo(15), resolved_at: daysAgo(10),
    denial_reason: "Resting echo performed within 90 days. Stress echo not medically necessary per LCD criteria.",
    clinical_notes: "CHF patient with worsening symptoms. Need functional assessment despite recent resting echo.",
  },
  {
    id: "pa-005", patient_id: "pt-008", physician_id: "ph-002",
    insurance_provider: "Blue Cross Blue Shield", procedure_code: "97110", procedure_name: "Physical Therapy (therapeutic exercises)",
    icd_codes: ["M17.11", "M79.3"], status: "approved", urgency: "standard",
    reference_number: "BCB-PA-7213", submitted_at: daysAgo(20), resolved_at: daysAgo(16),
    denial_reason: null, clinical_notes: "12-session PT plan for knee osteoarthritis and chronic pain. Conservative management before surgical consideration.",
  },
]

// ── Messages ───────────────────────────────────────────
export const messages: Message[] = [
  { id: "msg-001", patient_id: "pt-001", physician_id: "ph-002", sender_type: "patient", content: "Hi Dr. Chen, my blood sugar readings have been higher than usual this week. Should I adjust my metformin dose?", channel: "portal", read: true, created_at: daysAgo(2) },
  { id: "msg-002", patient_id: "pt-001", physician_id: "ph-002", sender_type: "physician", content: "James, please send me your readings for the past 7 days. Don't adjust the dose yet. We'll review at your next visit.", channel: "portal", read: true, created_at: daysAgo(2) },
  { id: "msg-003", patient_id: "pt-001", physician_id: "ph-002", sender_type: "patient", content: "Here are my readings: Mon 185, Tue 192, Wed 178, Thu 201, Fri 188, Sat 195, Sun 183. All fasting.", channel: "portal", read: true, created_at: daysAgo(1) },
  { id: "msg-004", patient_id: "pt-001", physician_id: "ph-002", sender_type: "agent", content: "Automated analysis: Average fasting glucose 189 mg/dL (target <130). Trending up from last month's average of 162. Flagged for physician review.", channel: "portal", read: true, created_at: daysAgo(1) },
  { id: "msg-005", patient_id: "pt-002", physician_id: "ph-001", sender_type: "patient", content: "Hi Dr. Patel, my anxiety has been worse this week. The sertraline helps but I'm still having trouble sleeping.", channel: "sms", read: true, created_at: daysAgo(3) },
  { id: "msg-006", patient_id: "pt-002", physician_id: "ph-001", sender_type: "physician", content: "Maria, let's discuss adjusting your dose at your next visit. In the meantime, try the breathing exercises we discussed. Avoid caffeine after 2 PM.", channel: "sms", read: true, created_at: daysAgo(3) },
  { id: "msg-007", patient_id: "pt-003", physician_id: "ph-003", sender_type: "system", content: "Reminder: Your appointment with Dr. Rivera is tomorrow at 10:00 AM. Please arrive 15 minutes early.", channel: "sms", read: false, created_at: daysAgo(0) },
  { id: "msg-008", patient_id: "pt-004", physician_id: null, sender_type: "agent", content: "Sarah, you missed your migraine follow-up on Jan 12. Would you like to reschedule? Dr. Chen has availability this Thursday at 11 AM or Friday at 2 PM.", channel: "sms", read: false, created_at: daysAgo(5) },
  { id: "msg-009", patient_id: "pt-004", physician_id: null, sender_type: "patient", content: "Friday at 2 PM works. Thank you!", channel: "sms", read: true, created_at: daysAgo(5) },
  { id: "msg-010", patient_id: "pt-009", physician_id: "ph-004", sender_type: "patient", content: "Dr. Park, my weight went up 4 pounds in 2 days. My ankles are swelling. Should I take an extra furosemide?", channel: "whatsapp", read: false, created_at: daysAgo(0) },
  { id: "msg-011", patient_id: "pt-009", physician_id: "ph-004", sender_type: "agent", content: "ALERT: Patient Foster reports 4lb weight gain in 2 days with peripheral edema. Heart failure exacerbation risk. Flagged as URGENT for Dr. Park.", channel: "portal", read: false, created_at: daysAgo(0) },
  { id: "msg-012", patient_id: "pt-010", physician_id: "ph-001", sender_type: "agent", content: "Amanda, your iron supplement adherence has been 65% this month. Taking ferrous sulfate consistently is important for treating your anemia. Would you like tips on managing side effects?", channel: "sms", read: false, created_at: daysAgo(1) },
  { id: "msg-013", patient_id: "pt-010", physician_id: "ph-001", sender_type: "patient", content: "Yes please. It upsets my stomach and I keep forgetting the third dose.", channel: "sms", read: true, created_at: daysAgo(1) },
  { id: "msg-014", patient_id: "pt-010", physician_id: "ph-001", sender_type: "agent", content: "Tips: 1) Take with vitamin C (orange juice helps). 2) If stomach upset persists, try taking with a small snack. 3) I'll set reminders at 8 AM, 2 PM, and 8 PM. Dr. Patel may also consider switching to every-other-day dosing at your visit.", channel: "sms", read: false, created_at: daysAgo(1) },
]

// ── Conversation Demos (from pitch) ────────────────────
export const CHAT_DEMOS = [
  {
    id: "scheduling",
    title: "Smart Scheduling",
    icon: "Calendar",
    messages: [
      { role: "patient" as const, content: "I need to see a doctor for a checkup. I have Blue Cross PPO. Mornings work best." },
      { role: "agent" as const, content: "Checking Blue Cross PPO network...\n\nFound 3 in-network primary care doctors near you with morning openings:" },
      { role: "agent" as const, content: "Dr. Patel — Family Medicine\nNext available: Feb 14, 9:30 AM\nCopay: $0 (preventive) | 4.9★ (312 reviews)\n\nShall I book and send pre-visit forms?" },
      { role: "patient" as const, content: "Yes, book it." },
      { role: "agent" as const, content: "Confirmed: Feb 14 at 9:30 AM.\n\n• Pre-visit questionnaire sent\n• Directions shared to maps\n• Reminder set for Feb 13, 8 PM\n• Please bring current medication list" },
    ],
  },
  {
    id: "billing",
    title: "Billing & Claims",
    icon: "Receipt",
    messages: [
      { role: "patient" as const, content: "I got a $3,400 bill from my ER visit. I have insurance — this can't be right." },
      { role: "agent" as const, content: "Pulling your EOB from Blue Cross...\n\nFound 2 errors:\n1. CPT 99285 billed out-of-network (ER is in-network)\n2. Facility fee double-charged ($1,200 × 2)" },
      { role: "agent" as const, content: "Corrected:\n• Original: $3,400\n• After corrections: $840\n• Your copay: $250\n• Savings: $3,150\n\nFile the appeal?" },
      { role: "patient" as const, content: "Yes, please." },
      { role: "agent" as const, content: "Appeal filed — Ref #BC-2026-44821.\nDocs attached. Resolution: 7–14 days.\nI'll notify you on any update." },
    ],
  },
  {
    id: "prior-auth",
    title: "Prior Authorization",
    icon: "Shield",
    messages: [
      { role: "physician" as const, content: "Need prior auth for knee MRI for patient Johnson. Persistent pain, not responding to PT." },
      { role: "agent" as const, content: "Checking Aetna criteria for CPT 73721 (MRI knee)...\n\nAll criteria met:\n• 6 weeks conservative treatment ✓\n• PT documentation attached ✓\n• Clinical notes support imaging ✓" },
      { role: "agent" as const, content: "PA form auto-filled:\n• ICD-10: M17.11, M25.561\n• PT notes & imaging request attached\n• LCD criteria referenced\n\nSubmitting to Aetna ePA..." },
      { role: "agent" as const, content: "Prior Auth APPROVED — Ref #AET-8834\nTurnaround: 4 minutes\nMRI scheduled for Friday 2 PM\nPatient notified via text." },
    ],
  },
  {
    id: "triage",
    title: "After-Hours Triage",
    icon: "Moon",
    messages: [
      { role: "patient" as const, content: "It's 11 PM. My 4-year-old has 102.5° fever and pulling at her ear. ER?" },
      { role: "agent" as const, content: "Pediatric triage: Urgent — not emergency.\n\nConsistent with otitis media (ear infection). ER likely unnecessary.\n\nManage at home tonight:\n• Children's Tylenol (weight-based)\n• Warm compress on ear\n• Elevate head slightly" },
      { role: "agent" as const, content: "Same-day sick visit booked:\nDr. Chen, tomorrow 8:15 AM (first slot)\nSymptoms sent to Dr. Chen.\n\nGo to ER if: fever >104°F, lethargy, stiff neck, or rash.\n\nI'll check in at 6 AM." },
    ],
  },
  {
    id: "rx",
    title: "Prescription Management",
    icon: "Pill",
    messages: [
      { role: "agent" as const, content: "Hi Maria — your Metformin 500mg runs out in 3 days. Refill at Walgreens on 39th?" },
      { role: "patient" as const, content: "Yes. I've been having stomach issues with it." },
      { role: "agent" as const, content: "Noted for Dr. Chen.\n\nRefill requested (ready tomorrow 2 PM).\n\nSent to Dr. Chen: \"Patient reports GI side effects. Consider extended-release at Feb 18 visit.\"\n\nLast A1C: 7.2% (Oct 2025) — may need updated labs." },
      { role: "patient" as const, content: "Can you schedule those labs?" },
      { role: "agent" as const, content: "Fasting glucose + A1C ordered.\nFeb 16, 7:30 AM at Quest on Hawthorne.\nNo food after 10 PM night before.\nResults auto-route to Dr. Chen." },
    ],
  },
]

// ── Dashboard Aggregations ─────────────────────────────
export function getDashboardMetrics() {
  const today = new Date().toDateString()
  const todayApts = appointments.filter(
    (a) => new Date(a.scheduled_at).toDateString() === today
  )
  const completedToday = todayApts.filter((a) => a.status === "completed").length
  const totalToday = todayApts.length

  const pendingClaims = claims.filter((c) =>
    ["submitted", "processing"].includes(c.status)
  ).length
  const deniedClaims = claims.filter((c) => c.status === "denied").length
  const totalRevenue = claims
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + c.insurance_paid + c.patient_responsibility, 0)
  const pendingPA = priorAuths.filter((p) =>
    ["pending", "submitted"].includes(p.status)
  ).length
  const pendingRefills = prescriptions.filter(
    (p) => p.status === "pending-refill"
  ).length
  const unreadMessages = messages.filter((m) => !m.read).length
  const lowAdherence = prescriptions.filter(
    (p) => p.status === "active" && p.adherence_pct < 80
  ).length

  return {
    todayAppointments: totalToday,
    completedToday,
    pendingClaims,
    deniedClaims,
    totalRevenue,
    pendingPA,
    pendingRefills,
    unreadMessages,
    lowAdherence,
    totalPatients: patients.length,
  }
}

// ── Lookup helpers ─────────────────────────────────────
export function getPhysician(id: string) {
  return physicians.find((p) => p.id === id)
}
export function getPatient(id: string) {
  return patients.find((p) => p.id === id)
}
export function getPatientAppointments(patientId: string) {
  return appointments.filter((a) => a.patient_id === patientId)
}
export function getPatientClaims(patientId: string) {
  return claims.filter((c) => c.patient_id === patientId)
}
export function getPatientPrescriptions(patientId: string) {
  return prescriptions.filter((p) => p.patient_id === patientId)
}
export function getPatientMessages(patientId: string) {
  return messages.filter((m) => m.patient_id === patientId)
}
export function getTodayAppointments() {
  const today = new Date().toDateString()
  return appointments
    .filter((a) => new Date(a.scheduled_at).toDateString() === today)
    .sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    )
}
