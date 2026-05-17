# Agent Instructions

Read `.cursor/rules/voxen-core.mdc` first (always applied). Use the other rules when editing matching files:

- **API / lib / middleware:** `.cursor/rules/voxen-api.mdc`
- **React UI:** `.cursor/rules/voxen-ui.mdc`

**Podium AI** — Next.js App Router, TypeScript, Tailwind v4, Supabase Auth + RLS.

- API keys and ElevenLabs agent ID are **server-only** (`app/api/`, `lib/`).
- Protected app lives under `app/(protected)/`; unauthenticated users redirect to `/login`.
- Persistence map: `docs/supabase-persistence.md`.
- Do not commit `.env.local` or secrets.
