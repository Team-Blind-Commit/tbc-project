# Supabase persistence — team reference

## Tables

| Table | Purpose |
|-------|---------|
| `profiles` | Username per `auth.users` row |
| `sessions` | Speech Eval + Voice Coach history (`feature` discriminator) |
| `action_points` | Voice coach homework / tips |
| `user_coach_memory` | Long-term coach memory between voice sessions |

## Product → `sessions.feature`

| Product | Route | `feature` | Other tables |
|---------|-------|-----------|--------------|
| Podium AI coach (4 modes) | `/voice-coach` | `voice_coach` | `user_coach_memory`, `action_points` |
| Panel (3 judges) | `/speech-eval` | `speech_eval` | — |
| Tips / memory | (voice coach flow) | — | `user_coach_memory`, `action_points` |

Voice coach modes: `Interview`, `Debate`, `Presentation`, `Impromptu Speaking`.

## Write checklist

| ID | Trigger | Location | Table |
|----|---------|----------|-------|
| W1 | Sign-up | `sign-up-page` → `POST /api/profile` | `profiles` |
| W2 | OAuth callback | `app/auth/callback/route.ts` | `profiles` |
| W3 | Speech analyzed | `POST /api/analyze` | `sessions` (`speech_eval`) |
| W3b | Same | includes `filler_word_count`, `evaluator_score` | `sessions` |
| W4 | Voice end session | `lib/save-voice-session.ts` | `sessions` (`voice_coach`) |
| W5 | Voice end session | same | `user_coach_memory` |
| W6 | Voice end session | same | `action_points` |
| W7 | Mark homework done | `PATCH /api/voice-coach/tasks` | `action_points` |
| — | Analyze failed cloud save | `lib/speech-eval-history.ts` | `localStorage` fallback only |

## Read checklist

| ID | UI | Location |
|----|-----|----------|
| R1–R2 | Dashboard | `components/dashboard/dashboard-page.tsx` |
| R3 | Speech history | `GET /api/speech-eval/history` + history page |
| R4 | Voice history | `GET /api/voice-coach/history` |
| R5 | Coach prompt + homework | `build-coach-memory.ts`, tasks API |

## Important behaviors

- **Voice coach:** Supabase save only on **End session**, not per message. Browser `sessionStorage` draft on connection loss (`lib/voice-coach-draft.ts`).
- **Speech eval:** Primary save is `POST /api/analyze` (returns `persisted`). `localStorage` only when `persisted === false`.
- **Panel dashboard scores:** Only **Evaluator (Marcus)** score is stored as `evaluator_score`. Counter and Grammarian are qualitative feedback columns.

## Folder ownership

See `.cursor/rules/voxen-core.mdc` — coordinate before editing shared `lib/` or dashboard.
