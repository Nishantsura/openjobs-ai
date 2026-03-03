# Launch Readiness Plan (Modified)

Date: 2026-02-25

## Why this plan

Current build has broad feature coverage, but production readiness is blocked by reliability, security hardening, and billing-dependent AI pathways. This plan splits launch into two tracks so progress does not stop when OpenAI credits are unavailable.

## Current status snapshot

1. Implemented: Phases 1-6 in code.
2. Proven locally: unit tests + syntax/build checks.
3. Proven manually: LinkedIn Easy Apply basic flow, feed action injection, platform adapters visible/fallbacks.
4. Not yet launch-safe: quota-dependent AI generation, end-to-end telemetry, formal reliability gates across all platforms.

## Launch tracks

### Track A: Core Beta (No paid AI required)

Goal: launch a stable user-controlled assistant that fills known fields and never auto-submits.

Scope:
1. LinkedIn Easy Apply field-fill + stop-before-submit.
2. Resume upload from configured base resume.
3. Greenhouse/Lever/Indeed/Glassdoor/Wellfound form-fill adapters.
4. Assist Mode for unsupported forms.
5. Smart Email/Smart DM visible with graceful fallback message when AI unavailable.

Exit gate:
1. Zero auto-submit incidents in test cohort.
2. >=90% button visibility on supported portals in test matrix.
3. >=80% successful known-field fill on supported form pages.
4. Error states always user-readable, no silent failures.

### Track B: AI Quality Launch (Requires OpenAI billing/credits)

Goal: enable high-quality generation for answers, emails, DMs, resume optimization.

Scope:
1. `/generate-answer`, `/generate-email`, `/generate-dm`, `/optimize-resume` fully active.
2. Clear model + token budgeting defaults.
3. Quota/billing monitoring and user-friendly upstream error handling.
4. Dedicated cover-letter endpoint and UI trigger.

Exit gate:
1. >=95% successful AI responses under normal quota.
2. <=2% malformed response rate after schema validation.
3. Graceful degraded mode under 429/upstream failures.

## Priority backlog

## P0 (must do before any public beta)

1. Secret rotation and environment hygiene.
- Rotate Supabase service-role key and OpenAI key (keys were shared during setup).
- Remove leaked keys from docs/screenshots/history where possible.

2. Reliability hardening for non-LinkedIn adapters.
- Add per-platform DOM fixtures and regression tests for button injection + field fill.
- Add fallback selectors for regional variants.

3. Error transparency.
- Surface backend error reasons in extension UI consistently.
- Add request IDs in backend responses for debugging.

4. Token/session UX stability.
- Detect expired Supabase token in extension and prompt refresh.
- Add one-click token status check in popup.

## P1 (strongly recommended before scaled rollout)

1. Observability baseline.
- Structured logs with endpoint, status, error category, request id.
- Basic dashboard counters: success/failure per endpoint and per platform.

2. End-to-end test harness.
- Add Playwright smoke tests for extension injection + critical actions.

3. Security controls.
- Implement explicit CORS/origin allowlist for backend routes.
- Rate-limit strategy upgrade from in-memory to persistent (e.g., Upstash/Redis).

4. Product UX polish.
- Add onboarding checks in popup: backend reachable, token valid, resume loaded.

## P2 (post-beta growth)

1. Resume version quality scoring and reuse heuristics.
2. Cover letter generation flow with manual edit UI.
3. Team analytics and application history timeline.

## Test matrix to enforce before launch

1. LinkedIn Easy Apply: 50-job run, >=80% step completion, 0 auto-submit.
2. Each additional platform: 20-form run, >=80% known-field fill.
3. Feed posts: 30-post run with email/DM mix; action visibility >=90%.
4. Assist Mode: 20 unsupported forms; uncertain fields highlighted in >=95% of ambiguous cases.
5. Failure drills: token expiry, OpenAI 429, backend offline, malformed form DOM.

## What to do now (next 7 days)

1. Day 1: P0 security rotation + token status UX.
2. Day 2-3: non-LinkedIn reliability fixtures and fixes.
3. Day 4: observability + request IDs.
4. Day 5: 50/20/30/20 manual+scripted test runs and bug sweep.
5. Day 6-7: beta candidate freeze and release notes.

## OpenAI billing dependency note

AI generation currently fails when account quota is exhausted. Track A can still launch without paid AI; Track B requires active billing/credits before go-live.
