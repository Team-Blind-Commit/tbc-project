# Podium AI

**Train your voice. Own the room.**

**Live demo:** [tbc-project-delta.vercel.app](https://tbc-project-delta.vercel.app/)

Podium AI is an AI-powered speaking coach that gives you real-time voice practice and expert-style feedback — without the cost of a human coach. Talk live with personality-driven AI coaches, or record a speech and face a panel of three AI judges who score your delivery, language, and content.

> **Currently free for testing.** We’re actively improving the product and welcome your feedback. Paid subscriptions and additional features are planned for the future.

---

## The Problem

Most people never improve their speaking skills because:

- **Practicing alone gives zero feedback** — you repeat the same mistakes without knowing it
- **Human coaches cost $100–$300/hour** — out of reach for most learners
- **Text-based apps feel nothing like the real thing** — typing isn’t speaking

Podium AI closes that gap with live voice sessions and structured, scored feedback that mirrors how real coaches and judges evaluate you.

---

## Features

### Practice With AI Coaches

Talk live with AI coaches in four high-stakes modes — no typing, just speaking:

| Mode | Coach | What it simulates |
|------|-------|-------------------|
| **Interview** | Marcus | FAANG-style recruiter grilling your answers |
| **Debate** | Ava | Relentless counter-arguments that expose logic gaps |
| **Presentation** | Olivia | Delivery coaching for clarity and impact |
| **Impromptu** | Olivia | Random topic, 30 seconds — think on your feet |

Each session ends with a spoken summary, homework action points, and coach memory that carries into your next practice.

### Face The Panel

Record a speech (up to 3 minutes) and get scored by three expert AI judges:

| Judge | Focus |
|-------|-------|
| **Grace** | Language, grammar, and vocabulary |
| **Marco** | Delivery, filler words, and pace |
| **Alex** | Content, structure, and impact |

You receive a composite score, annotated transcript, and spoken feedback from every judge.

### Dashboard & Progress Tracking

- Session history across Voice Coach and The Panel
- Overall score trends and weekly improvement stats
- Filler word tracking over time
- Homework action points from your coach
- Personalized coach memory between sessions

---

## How It Works

```
Choose your mode  →  Practice or speak  →  Get your score
     ↓                      ↓                    ↓
 Interview, Debate,    Live voice with      Breakdown: score,
 Presentation, or      AI coach — or        confidence, clarity,
 Impromptu / Panel     record for judges    filler words, strengths,
                                              and improvements
```

1. **Choose your mode** — pick a coach scenario or submit a speech to The Panel
2. **Practice or speak** — talk live with your AI coach, or record and get instant transcription
3. **Get your score** — receive a full breakdown with spoken feedback you can replay

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) + TypeScript |
| UI | React 19, [Tailwind CSS v4](https://tailwindcss.com) |
| Auth & Database | [Supabase](https://supabase.com) (Auth, Postgres, Row Level Security) |
| Voice Coach | [ElevenLabs Conversational AI](https://elevenlabs.io) (WebRTC) |
| Speech Analysis | [Groq](https://groq.com) (transcription & evaluation) |
| Summaries & Tasks | [OpenAI](https://openai.com) (post-session summaries, homework) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- API keys for ElevenLabs, Groq, and OpenAI

### Installation

```bash
git clone https://github.com/Team-Blind-Commit/tbc-project.git
cd tbc-project
npm install
```

### Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local   # Windows: copy .env.example .env.local
```

| Variable | Purpose |
|----------|---------|
| `ELEVENLABS_API_KEY` | ElevenLabs API key (server-side only) |
| `ELEVENLABS_VOICE_COACH_AGENT_ID` | Conversational AI agent ID |
| `OPENAI_API_KEY` | Post-session summaries and homework tasks |
| `GROQ_API_KEY` | Speech transcription and panel evaluation |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (JWT format, `eyJ...`) |

> **Important:** Keep all API keys server-side. Never prefix secrets with `NEXT_PUBLIC_`.

### Database Setup

Apply Supabase migrations in filename order before running the app:

```bash
# Run each file in supabase/migrations/ via Supabase Dashboard SQL editor,
# or apply supabase/all_migrations.sql on a fresh project.
```

See [`docs/supabase-persistence.md`](docs/supabase-persistence.md) for the full schema reference and deploy checklist.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up or log in to access the dashboard, Voice Coach, and Face The Panel.

Or try the hosted demo at [tbc-project-delta.vercel.app](https://tbc-project-delta.vercel.app/) — no local setup required.

---

## Project Structure

```
app/
├── (protected)/          # Auth-gated routes (dashboard, voice-coach, speech-eval)
├── api/                  # Server-side API routes (analyze, speak, voice-coach, profile)
├── auth/callback/        # OAuth callback handler
├── login/ & signup/      # Authentication pages
└── page.tsx              # Public landing page

components/
├── landing/              # Marketing site sections
├── dashboard/            # Dashboard shell, stats, history, settings
├── voice-coach/          # Live voice session UI
└── auth/                 # Login and sign-up forms

lib/                      # Server utilities, Supabase clients, AI integrations
supabase/migrations/      # Database schema migrations
```

---

## Security

Podium AI is built with security in mind, especially around voice data and API keys.

### Authentication & Data Isolation

- All practice features require authentication via Supabase Auth (email/password and Google OAuth)
- Protected routes under `app/(protected)/` redirect unauthenticated users to `/login`
- Database access uses **Row Level Security (RLS)** — users can only read and write their own sessions, profiles, and coach memory

### API Key Protection

- ElevenLabs, OpenAI, and Groq keys are **server-only** — never exposed to the browser
- ElevenLabs signed URLs are generated on the server for secure WebRTC connections
- `.env.local` is gitignored; use `.env.example` as a template only

### Rate Limiting & Input Validation

- API routes enforce per-IP rate limits (e.g. 8 analyze requests/minute, 30 TTS requests/minute)
- Audio uploads are capped at **10 MB** (~3 minutes of speech)
- Recording length is limited to **180 seconds**
- TTS input is capped at **2,000 characters** to prevent abuse

### What We Don't Do

- We do not sell or share your voice recordings or session data with third parties
- Session audio is processed for transcription and feedback, not stored permanently as raw audio files
- Coach memory and session history are tied to your account and deletable via your profile

> **Note:** Rate limiting currently uses in-memory buckets suitable for development and early testing. A distributed limiter (e.g. Redis) will be added before production scale.

---

## Roadmap

Podium AI is under active development. Planned improvements include:

- **Subscription tiers** — free testing today; paid plans for extended usage and premium features
- **Distributed rate limiting** — Redis-backed limits for production reliability
- **Privacy & Terms pages** — formal legal documentation
- **Enhanced analytics** — deeper progress insights and goal tracking
- **Additional coach modes** — more scenarios and specialties
- **Team & organization plans** — group practice for schools and companies
- **Mobile-optimized experience** — smoother practice on phones and tablets

Have a feature request? [Open an issue](https://github.com/Team-Blind-Commit/tbc-project/issues) — we read every one.

---

## Feedback

We're in an open testing phase and your input directly shapes what we build next.

- **Found a bug or have feedback?** [Open a GitHub issue](https://github.com/Team-Blind-Commit/tbc-project/issues/new) — this is the best way to reach us
- **Have ideas or want early access to subscriptions?** Tell us what worked, what didn't, and what you'd pay for in an issue
- **Prefer email?** [maalikhassan1@gmail.com](mailto:maalikhassan1@gmail.com) · [Info.pramudithalakshan@gmail.com](mailto:Info.pramudithalakshan@gmail.com)

---

## License

This project is maintained by [Team Blind Commit](https://github.com/Team-Blind-Commit). All rights reserved.

---

<p align="center">
  <strong>Podium AI</strong> — Built with ElevenLabs · Powered by Groq · © 2026
</p>
