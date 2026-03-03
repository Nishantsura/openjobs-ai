# Phase Plan

## Phase 1: Foundation

Definition of done:
- Extension injects visible test button on LinkedIn job pages.
- Backend supports auth and protected API skeleton.
- Resume PDF upload and parse flow stores source + structured JSON.

Tasks:
1. Monorepo and docs baseline.
2. Extension MV3 shell.
3. LinkedIn job-page detector and test button injector.
4. Next.js backend scaffold.
5. Supabase auth integration.
6. `POST /parse-resume` endpoint.
7. Storage + DB persistence paths.
8. Smoke tests and manual QA checklist.

## Phase 2: LinkedIn Easy Apply

Definition of done:
- Smart Apply reliably handles >=80% tested Easy Apply jobs.
- Stops before submit and shows `Review and Submit` banner.

Tasks:
1. Easy Apply detector.
2. Modal observer and readiness gate.
3. Field matcher (label/placeholder/aria).
4. Resume upload.
5. Screening question generation via `/generate-answer`.
6. Safety controls and retry logic.
7. Reliability test suite.

## Phase 3: Resume Optimization

Tasks:
1. Job description extractor.
2. Keyword extraction endpoint.
3. Resume reweighting generator.
4. PDF version output and storage.
5. Resume version selection cache.

## Phase 4: Platform Expansion

Order:
1. Greenhouse
2. Lever
3. Indeed
4. Glassdoor
5. Wellfound

Each platform gets dedicated adapters and tests.

## Phase 5: LinkedIn Feed Hiring Posts

Tasks:
1. Email detection + Smart Email.
2. DM-intent detection + Smart DM.
3. Gmail compose prefill.
4. Manual send confirmation UX.

## Phase 6: Assist Mode

Tasks:
1. Generic DOM field scan.
2. Confidence-based autofill.
3. Side panel generated answers.
4. Highlight uncertain fields.

## Modified Launch Plan

For launch sequencing and billing-independent path, see:
- `docs/LAUNCH_READINESS_PLAN.md`

## Launch Plan V2

Current launch execution reference:
- `/Users/mac/Documents/Openjobs AI/docs/LAUNCH_PLAN_V2.md`
