# OpenJobs AI Launch Plan V2 (Today-Focused)

Date: 2026-02-25

## Objective

Ship a stable beta today with:
1. LinkedIn Easy Apply working safely.
2. LinkedIn + X feed Smart Email/Smart DM visibility and reliability.
3. Naukri support in native/adapted mode.
4. Mandatory login + payment gating before advanced features.
5. AI provider strategy that supports paid OpenAI later and free local testing now.

## What is done already

1. Core extension + backend architecture is implemented.
2. LinkedIn Easy Apply flow exists with stop-before-submit safeguards.
3. Multi-platform adapters exist for Greenhouse, Lever, Indeed, Glassdoor, Wellfound.
4. LinkedIn feed Smart Email/SmartDM injection exists with floating fallback.
5. Assist Mode exists for unsupported forms.
6. Supabase auth/storage setup and protected backend endpoints exist.

## What is not launch-ready yet

1. Feed reliability is inconsistent on some LinkedIn DOM variants.
2. Naukri is not implemented as a dedicated adapter yet.
3. X (Twitter) feed hiring-post support is not implemented.
4. Smart DM trigger logic is too loose and should be gated by hiring intent.
5. Payment gating is not implemented.
6. Login-to-paid entitlement check is not enforced in extension UX.
7. OpenAI quota dependency can block generation features.

## Hard launch decision

To launch today, we split features into two levels:

## Level A (must work today)

1. Manual-safe core apply assist.
2. Login required for extension usage.
3. Payment required for AI generation features.
4. Clear fallback when AI unavailable.

## Level B (ship if time remains today)

1. Dedicated Naukri adapter.
2. X feed Smart Email/SmartDM.
3. Enhanced analytics/telemetry dashboards.

## Execution plan (priority order)

## P0: Stability and trust (first)

1. Tighten feed action conditions on LinkedIn.
- Smart Email appears only when valid email + hiring-intent keywords are present.
- Smart DM appears only when both are present:
  - DM phrase (`dm me`, `message me`, `inbox me`)
  - hiring/work intent (`hiring`, `role`, `position`, `job`, `open to`, `looking for`)

2. Add explicit action debug banner in dev mode.
- Show why button did not appear (e.g., no hiring intent, no email).

3. Harden backend error surfacing.
- Show real endpoint error in extension toasts.

Acceptance:
1. 20 LinkedIn feed samples -> >=90% correct visibility decision.
2. 0 false positives on non-hiring DM posts in sample set.

## P1: Login + payment gating (second)

1. Auth required at extension startup.
- If not logged in: show "Login" screen in popup.

2. Entitlement check endpoint.
- Backend endpoint returns plan status: `FREE`, `PRO`, `TRIAL`, `EXPIRED`.

3. Payment integration using Stripe hosted checkout.
- Extension opens hosted billing page (web app route), not in-extension card collection.
- On success webhook updates `subscriptions` table.

4. Feature gating rules.
- FREE: basic field fill only.
- PRO: AI generation (answers/email/dm/optimize/cover letter).

Acceptance:
1. Unpaid user cannot trigger AI endpoints from extension.
2. Paid user can access AI features after webhook confirmation.

## P2: Naukri support (third)

1. Add dedicated `naukri.js` adapter and manifest match.
2. Implement robust selectors for native application forms.
3. Keep Assist Mode fallback for variant pages.

Acceptance:
1. 15 Naukri form samples -> >=80% known-field fill.
2. No auto-submit.

## P3: X feed support (fourth)

1. Add `x_feed.js` adapter for `x.com` and `twitter.com`.
2. Detect email + hiring intent + DM intent with same strict rules as LinkedIn.
3. Inject Smart Email/Smart DM actions in timeline cards.

Acceptance:
1. 20 X posts sample -> >=85% action visibility precision.
2. Manual-send only.

## P4: AI provider strategy (parallel)

1. Keep OpenAI as production provider.
2. Add provider abstraction in backend:
- `AI_PROVIDER=openai|ollama`
- shared interface for generate text/json

3. Add Ollama for free local testing only.
- Useful when OpenAI credits are unavailable.
- Expect weaker quality and more prompt tuning.

Recommended Ollama for testing:
1. `llama3.1:8b` for general draft quality.
2. `qwen2.5:7b` as a second option.

Acceptance:
1. With `AI_PROVIDER=ollama`, endpoints return valid shaped responses.
2. Production remains `AI_PROVIDER=openai`.

## Today launch cutline

If we must launch today, launch with this scope:
1. LinkedIn Easy Apply + Assist Mode + stable LinkedIn feed actions.
2. Login + payment gating implemented.
3. AI features enabled only for paid users, with graceful fallback if quota fails.
4. Naukri/X can be released as "rolling support" if not passing acceptance matrix by end of day.

## Risks if forcing everything today

1. Selector drift on live feeds/portals can cause flaky visibility.
2. Payment + webhook misconfiguration can block paid users.
3. Rushed entitlement logic can expose paid endpoints unintentionally.

## Recommended sequence from now

1. Implement P0 reliability fixes.
2. Implement P1 login/payment gating.
3. Run a short production-like smoke test.
4. Decide launch scope:
- Include Naukri/X only if their acceptance checks pass.
