# OpenRx

AI-powered healthcare clinic management platform — powered by [OpenClaw](https://openclaw.ai).

**Live:** [openrx.health](https://openrx.health)

## Features

- **Dashboard** — Real-time metrics, today's schedule, revenue chart, AI agent activity feed
- **Patients** — Searchable patient registry with detailed profiles and AI actions
- **Scheduling** — Insurance-aware appointment management with AI slot suggestions
- **Billing & Claims** — Claims analysis, error detection, AI-powered appeals
- **Prescriptions** — Adherence monitoring, refill coordination, AI outreach
- **Prior Authorization** — Status tracking, AI form submission, appeal preparation
- **Provider Search** — Live NPI Registry search with natural language input
- **Pharmacy Finder** — Pharmacy search with Rx transfer, refill, and formulary actions
- **Messages** — Multi-channel conversations (WhatsApp, SMS, portal) with AI triage
- **AI Agent** — Interactive chat with 6 specialized healthcare agents

## OpenClaw Integration

OpenRx uses OpenClaw as its AI backbone with 6 specialized agents:

| Agent | Responsibility |
|-------|---------------|
| Coordinator | Routes patient messages to the right specialist |
| Triage | After-hours symptom assessment and urgency classification |
| Scheduling | Insurance-aware booking, reminders, no-show follow-up |
| Billing | Claims error detection, appeal generation, revenue optimization |
| Rx Manager | Adherence monitoring, refill reminders, pharmacy coordination |
| PA Agent | Prior auth form filling, criteria matching, ePA submission |

6 automated cron jobs handle appointment reminders, adherence checks, claim follow-ups, and more.

## Live API Integrations

- **NPI Registry (NPPES)** — Real-time provider search by city, ZIP, specialty, or name. Free CMS API, no key needed.
- **NPI Registry (Organizations)** — Pharmacy finder by location. Same free API.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## OpenClaw Gateway (optional)

To connect the live AI gateway:

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

Create `.env.local`:

```env
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=your-token-here
```

The app detects the gateway automatically and switches from demo to live mode.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS with custom design system
- **Charts:** Recharts
- **Icons:** Lucide React
- **AI Gateway:** OpenClaw
- **APIs:** NPPES NPI Registry (free, no key)
- **Deployment:** Vercel

## Project Structure

```
app/
├── (app)/            # Authenticated layout (sidebar + topbar + agent bar)
│   ├── dashboard/    # Metrics, schedule, chart, agent activity feed
│   ├── patients/     # Patient list + [id] detail pages
│   ├── scheduling/   # Appointment management
│   ├── billing/      # Claims and billing
│   ├── prescriptions/
│   ├── prior-auth/
│   ├── providers/    # Live NPI provider search
│   ├── pharmacy/     # Pharmacy finder
│   ├── messages/     # Multi-channel messaging
│   └── chat/         # AI agent interface
├── api/
│   ├── openclaw/     # Chat, status, webhook routes
│   ├── providers/    # NPI provider search proxy
│   └── pharmacy/     # NPI pharmacy search proxy
├── page.tsx          # Landing page
└── layout.tsx        # Root layout (fonts, metadata, SEO)
components/
├── layout/           # Sidebar, topbar, agent bar
├── dashboard/        # Revenue chart
└── ai-action.tsx     # Reusable AI action button (3 variants)
lib/
├── openclaw/         # Gateway client + 6-agent configuration
├── seed-data.ts      # Demo clinic data
└── utils.ts          # Formatting utilities
```

## License

MIT
