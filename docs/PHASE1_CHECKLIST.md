# Phase 1 Checklist

## Goal

By the end of Phase 1, a user can install the extension, authenticate, upload a resume PDF, and see LinkedIn test injection.

## Setup Checklist

1. Create Supabase project.
2. Create private storage bucket (`resumes` by default).
3. Apply SQL schema from `docs/SUPABASE_SETUP.md`.
4. Set backend env from `openjobs-backend/.env.example`.
5. Start backend: `npm run dev` in `openjobs-backend`.
6. Load extension in Chrome from `openjobs-extension`.

## Validation Checklist

1. Open LinkedIn job page (`/jobs/view/...`) and confirm floating `OpenJobs AI Test` button.
2. Click button and confirm test alert appears.
3. Call `GET /api/health` and confirm healthy response.
4. Call `POST /api/parse-resume` with bearer token + PDF and confirm:
- PDF stored in Supabase storage bucket.
- Parsed profile upserted to `profiles` table.
- Resume metadata inserted into `resumes` table.

## Exit Criteria

- LinkedIn injection works reliably on navigation changes.
- Resume parse endpoint handles valid/invalid PDFs.
- All protected endpoints reject missing/invalid auth.
