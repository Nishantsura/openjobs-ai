# OpenJobs AI

OpenJobs AI is a browser-native assistant that helps users apply faster while preserving user control.

## Monorepo Layout

- `openjobs-extension/` Chrome extension (execution layer)
- `openjobs-backend/` Next.js API backend (AI/auth/data layer)
- `docs/` product, architecture, security, testing, and API references

## Core Non-Negotiables

- Never auto-submit applications.
- Never auto-send emails or DMs.
- User always reviews and submits manually.

## Build Sequence

1. Phase 1: Foundation (extension shell, auth, resume upload/parse)
2. Phase 2: LinkedIn Easy Apply automation
3. Phase 3: Resume optimization engine
4. Phase 4: Platform expansion (Greenhouse, Lever, Indeed, Glassdoor, Wellfound)
5. Phase 5: LinkedIn feed Smart Email/Smart DM
6. Phase 6: Assist Mode fallback

See `docs/PHASE_PLAN.md` for detailed tasks and definitions of done.
