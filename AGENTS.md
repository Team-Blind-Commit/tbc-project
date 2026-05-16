# Agent Instructions

Read `.cursor/rules/voxen-core.mdc` before writing any code. It is always applied.

- Use Next.js App Router (`app/` directory). TypeScript only.
- All API keys are server-side only — inside `app/api/` routes, never in client components.
- Tailwind CSS for all styling. No inline styles, no extra CSS files.
- Respect folder ownership — do not edit another subteam's folder without coordination.
- Do not commit `.env.local` or any file containing secrets.
