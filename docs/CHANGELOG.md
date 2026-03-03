# Changelog

## 2026-02-23

- Initialized monorepo structure.
- Added project reference docs for PRD, architecture, phases, API, security, testing, and DOM strategy.

## 2026-02-23 (Phase 2 core)

- Added LinkedIn Easy Apply Smart Apply detection and injection.
- Added modal observer automation loop with multi-step progression.
- Added known-field mapping with React event dispatch.
- Added screening question generation integration (`/api/generate-answer`).
- Added resume upload from popup-configured PDF.
- Added CAPTCHA pause, daily session cap, and stop-before-submit banner.
- Added popup configuration UI for backend URL/token/profile/resume.
- Added Phase 2 validation and stress checklist.

## 2026-02-23 (Phase 2 reliability hardening)

- Added shared extension core module (`core.js`) for reusable heuristics.
- Wired core module into manifest before content script.
- Added action-intent classification and unknown-step safe fallback.
- Added validation blocker detection before and after navigation steps.
- Added extension unit tests using Vitest (10 tests passing).
- Added reliability plan and repeatable stress-run protocol.

## 2026-02-23 (Phase 3 start)

- Added optimized resume generation endpoint using PDF output.
- Added resume version caching with job fingerprint reuse.
- Added extension-side optimized resume cache and upload selection.
- Added Phase 3 checklist and API spec updates.

## 2026-02-24 (Phase 4 platform adapters)

- Hardened Greenhouse adapter for pre-form and form-visible states.
- Added shared platform selector module and shared form-adapter core.
- Added platform adapters: Lever, Indeed, Glassdoor, Wellfound.
- Updated manifest for platform-specific content scripts.
- Added selector stress tests with JSDOM fixtures for all platform adapters.

## 2026-02-24 (Phase 5 start)

- Added LinkedIn feed hiring-post detection for email and DM intent.
- Added `Smart Email` button with `/api/generate-email` integration and Gmail compose draft open.
- Added `Smart DM` button with `/api/generate-dm` integration and clipboard copy flow.
- Added Phase 5 checklist and stress test criteria.

## 2026-02-24 (Phase 6 Assist Mode)

- Added generic Assist Mode content script for unsupported portals.
- Added confidence-like fallback behavior: fill known fields, highlight uncertain fields.
- Added side panel with generated suggestions for textareas via `/api/generate-answer`.
- Added manifest wiring for generic non-native domains.

## 2026-02-25 (P1 login/payment gating scaffold)

- Added `GET /api/entitlement` for plan/status checks.
- Added `GET /api/billing-link` for hosted billing redirect.
- Added extension popup actions: `Check Access` and `Upgrade`.
- Added extension-side AI gating via stored entitlement state.
- Added subscriptions schema entry and payment/login checklist docs.

## 2026-02-25 (AI provider abstraction + cover letter endpoint)

- Added provider-aware AI backend support with `AI_PROVIDER=openai|openrouter`.
- Added OpenRouter configuration envs (`OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`).
- Updated generation layer to route text/json prompts through selected AI provider using OpenAI-compatible API base URL.
- Added `POST /api/generate-cover-letter` endpoint.
