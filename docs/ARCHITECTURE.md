# Architecture

## Components

1. Chrome Extension (`openjobs-extension`)
- Injects UI on supported job pages.
- Detects apply flows and form fields.
- Calls backend for AI-generated content.
- Performs in-browser field filling and resume uploads.

2. Backend (`openjobs-backend`)
- Auth session validation via Supabase.
- Resume parsing, optimization, and response generation endpoints.
- Request logging, token budgeting, error handling.

3. Supabase
- Auth (Google + email/password).
- Postgres tables for profile, resume metadata, generated artifacts.
- Storage bucket for resume PDFs.

4. OpenAI
- Resume parsing into structured JSON.
- Screening answer generation.
- Email/DM generation.
- Resume optimization signals.

## Initial Data Model (MVP)

- `profiles` (user_id, structured_profile_json, preferences)
- `resumes` (id, user_id, type, storage_path, hash, created_at)
- `resume_versions` (id, user_id, source_resume_id, job_fingerprint, storage_path)
- `generation_logs` (id, user_id, endpoint, token_estimate, status, created_at)
- `session_limits` (user_id, date, smart_apply_count)

## Trust Boundary

- Extension never stores platform credentials.
- Backend never executes browser actions.
- Submit action always remains user-driven.
