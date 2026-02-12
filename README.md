# OpenRx

AI-powered healthcare clinic management platform — powered by [OpenClaw](https://openclaw.ai).

**Live demo:** [openrx-rho.vercel.app](https://openrx-rho.vercel.app)

## Features

- **Dashboard** — Real-time metrics, today's schedule, AI agent activity feed
- **Patients** — Searchable patient registry with detailed profiles
- **Scheduling** — Insurance-aware appointment management with status tracking
- **Billing & Claims** — Claims analysis, error detection, denial tracking
- **Prescriptions** — Adherence monitoring, refill coordination, pharmacy integration
- **Prior Authorization** — Status tracking, clinical notes, urgency flagging
- **Messages** — Multi-channel conversations (WhatsApp, SMS, portal) via OpenClaw
- **AI Agent** — Interactive chat with 6 specialized healthcare agents

## OpenClaw Integration

OpenRx uses OpenClaw as its AI backbone:

| Agent | Responsibility |
|-------|---------------|
| Coordinator | Routes patient messages to the right specialist |
| Triage | After-hours symptom assessment and urgency classification |
| Scheduling | Insurance-aware booking, reminders, no-show follow-up |
| Billing | Claims error detection, appeal generation, revenue optimization |
| Rx Manager | Adherence monitoring, refill reminders, pharmacy coordination |
| PA Agent | Prior auth form filling, criteria matching, ePA submission |

Automated cron jobs handle appointment reminders, adherence checks, claim follow-ups, and more.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000).

## OpenClaw Gateway (optional)

To connect the live AI gateway:

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

Then create `.env.local`:

```env
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=your-token-here
```

The app automatically detects the gateway and switches from demo to live mode.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS with custom design system
- **Charts:** Recharts
- **Icons:** Lucide React
- **AI Gateway:** OpenClaw
- **Deployment:** Vercel

## Project Structure

```
app/
├── (app)/           # Authenticated routes with sidebar layout
│   ├── dashboard/   # Main dashboard with metrics + agent feed
│   ├── patients/    # Patient list + [id] detail pages
│   ├── scheduling/  # Appointment management
│   ├── billing/     # Claims and billing
│   ├── prescriptions/
│   ├── prior-auth/
│   ├── messages/    # Multi-channel messaging
│   └── chat/        # AI agent interface
├── api/openclaw/    # OpenClaw gateway API routes
├── page.tsx         # Landing page
└── layout.tsx       # Root layout with fonts + metadata
components/layout/   # Sidebar, topbar, agent bar
lib/
├── openclaw/        # Gateway client + agent configuration
├── seed-data.ts     # Demo clinic data
└── utils.ts         # Formatting utilities
```

## License

MIT
