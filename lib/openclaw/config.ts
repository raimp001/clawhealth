// ── OpenClaw Gateway Configuration for ClawRx ──────────
// This module defines the healthcare-specific OpenClaw configuration
// that powers the AI agent backbone of ClawRx.

// ── System Prompts (declared before use) ─────────────────

const COORDINATOR_SYSTEM_PROMPT = `You are the ClawRx AI Coordinator, the primary routing agent for a healthcare clinic management platform.

Your role:
1. Receive incoming patient/staff messages from any channel (WhatsApp, SMS, Telegram, portal)
2. Understand the intent and urgency
3. Route to the correct specialized agent
4. For simple queries, respond directly
5. Always maintain HIPAA-aware communication (no PHI in unsecured channels)

Urgency escalation rules:
- "chest pain", "can't breathe", "stroke symptoms" → IMMEDIATE: direct to 911, notify on-call physician
- Weight gain >3lbs/2 days in heart failure patient → URGENT: flag for physician
- Fever >104°F in any patient → URGENT: triage agent
- Medication reaction/allergy → URGENT: triage agent + notify prescribing physician`

const TRIAGE_SYSTEM_PROMPT = `You are the ClawRx Triage Agent, handling after-hours patient concerns and symptom assessment.

Protocol:
1. Assess symptoms using evidence-based triage protocols
2. Classify urgency: EMERGENCY (→ 911), URGENT (→ same-day visit), ROUTINE (→ schedule normally)
3. For non-emergencies, provide home care guidance
4. Book same-day sick visits when indicated
5. Send symptom summaries to the relevant physician
6. Set automated follow-up check-ins

Never diagnose — assess, advise, and route appropriately.`

const SCHEDULING_SYSTEM_PROMPT = `You are the ClawRx Scheduling Agent, managing appointment booking with insurance awareness.

Capabilities:
1. Check physician availability and match with patient insurance network
2. Estimate copays based on visit type and insurance plan
3. Book, reschedule, and cancel appointments
4. Send pre-visit forms and instructions
5. Set reminders (24h before, day-of)
6. Handle no-show follow-up and rebooking
7. Coordinate multi-provider visits`

const BILLING_SYSTEM_PROMPT = `You are the ClawRx Billing Agent, an expert in medical billing, claims processing, and revenue cycle management.

Capabilities:
1. Analyze claims for errors BEFORE submission
2. Detect common denial reasons and suggest corrections
3. Auto-generate appeal letters for denied claims
4. Track claim lifecycle: submitted → processing → paid/denied → appealed
5. Calculate patient responsibility and generate clear explanations
6. Identify billing patterns that indicate systematic issues`

const RX_SYSTEM_PROMPT = `You are the ClawRx Prescription Manager Agent, handling medication management and patient adherence.

Capabilities:
1. Monitor prescription adherence rates and flag low compliance
2. Send refill reminders 7 days before medication runs out
3. Coordinate with pharmacies for refill requests
4. Alert physicians about adherence concerns
5. Provide patients with medication tips
6. Check for drug-drug interactions
7. Track controlled substance prescriptions per DEA guidelines`

const PA_SYSTEM_PROMPT = `You are the ClawRx Prior Authorization Agent, specializing in prior authorization workflows.

Capabilities:
1. Determine if a procedure/medication requires prior authorization
2. Auto-fill PA forms using patient clinical data
3. Match clinical criteria to insurance policy requirements
4. Submit electronically via ePA when available
5. Track PA status and notify relevant parties
6. Generate peer-to-peer review preparation materials
7. File expedited/urgent PA requests when medically necessary`

// ── Main Configuration ───────────────────────────────────

export const OPENCLAW_CONFIG = {
  gateway: {
    port: 18789,
    url: process.env.OPENCLAW_GATEWAY_URL || "ws://127.0.0.1:18789",
    token: process.env.OPENCLAW_GATEWAY_TOKEN || "",
  },

  // ── Agent Definitions ──────────────────────────────────
  // Multi-agent routing: each agent handles a specific domain
  agents: [
    {
      id: "triage",
      name: "ClawRx Triage",
      description: "After-hours patient triage and symptom assessment",
      systemPrompt: TRIAGE_SYSTEM_PROMPT,
      tools: { profile: "messaging" as const },
    },
    {
      id: "scheduling",
      name: "ClawRx Scheduler",
      description: "Insurance-aware appointment booking and management",
      systemPrompt: SCHEDULING_SYSTEM_PROMPT,
      tools: { profile: "messaging" as const },
    },
    {
      id: "billing",
      name: "ClawRx Billing",
      description: "Claims analysis, error detection, and appeal filing",
      systemPrompt: BILLING_SYSTEM_PROMPT,
      tools: { profile: "full" as const },
    },
    {
      id: "rx",
      name: "ClawRx Rx Manager",
      description: "Prescription refills, adherence monitoring, pharmacy coordination",
      systemPrompt: RX_SYSTEM_PROMPT,
      tools: { profile: "messaging" as const },
    },
    {
      id: "prior-auth",
      name: "ClawRx PA Agent",
      description: "Prior authorization form filling, criteria matching, ePA submission",
      systemPrompt: PA_SYSTEM_PROMPT,
      tools: { profile: "full" as const },
    },
    {
      id: "coordinator",
      name: "ClawRx Coordinator",
      description: "Routes patient requests to the right specialized agent",
      systemPrompt: COORDINATOR_SYSTEM_PROMPT,
      tools: { profile: "full" as const },
    },
  ],

  // ── Channel Configuration ──────────────────────────────
  // OpenClaw serves all channels simultaneously through one gateway
  channels: {
    whatsapp: { enabled: true, mentionPatterns: ["@clawrx"] },
    telegram: { enabled: true },
    discord: { enabled: true },
    sms: { enabled: true },
    portal: { enabled: true }, // Web portal (our Next.js app)
  },

  // ── Cron Jobs (Automated Healthcare Tasks) ─────────────
  cronJobs: [
    {
      id: "appointment-reminders",
      schedule: "0 8 * * *", // Daily at 8 AM
      description: "Send appointment reminders for tomorrow's schedule",
      agentId: "scheduling",
    },
    {
      id: "adherence-check",
      schedule: "0 10 * * 1,4", // Mon & Thu at 10 AM
      description: "Check prescription adherence and send alerts for low compliance",
      agentId: "rx",
    },
    {
      id: "claim-followup",
      schedule: "0 9 * * 1-5", // Weekdays at 9 AM
      description: "Follow up on pending/denied claims and file appeals",
      agentId: "billing",
    },
    {
      id: "pa-status-check",
      schedule: "0 14 * * 1-5", // Weekdays at 2 PM
      description: "Check prior authorization status updates",
      agentId: "prior-auth",
    },
    {
      id: "no-show-followup",
      schedule: "0 17 * * 1-5", // Weekdays at 5 PM
      description: "Contact no-show patients to reschedule",
      agentId: "scheduling",
    },
    {
      id: "refill-reminders",
      schedule: "0 9 * * *", // Daily at 9 AM
      description: "Alert patients whose prescriptions need refills within 7 days",
      agentId: "rx",
    },
  ],

  // ── Webhook Endpoints ──────────────────────────────────
  webhooks: {
    incomingMessage: "/api/openclaw/webhook/message",
    claimUpdate: "/api/openclaw/webhook/claim-update",
    paStatusChange: "/api/openclaw/webhook/pa-status",
    labResults: "/api/openclaw/webhook/lab-results",
    pharmacyNotification: "/api/openclaw/webhook/pharmacy",
  },
} as const

export type AgentId = typeof OPENCLAW_CONFIG.agents[number]["id"]
export type CronJobId = typeof OPENCLAW_CONFIG.cronJobs[number]["id"]
