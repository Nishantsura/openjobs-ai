# Phase 3 Checklist (Resume Optimization)

## Objective

Generate job-specific resume versions that emphasize relevant experience without fabrication and use them during Smart Apply.

## Preconditions

1. Backend running with `OPENAI_API_KEY` configured.
2. Supabase `resume_versions` table and storage bucket ready.
3. Extension configured with backend URL and access token.

## Functional Checks

1. Open a LinkedIn Easy Apply job and click Smart Apply.
2. Confirm `/api/optimize-resume` is called and returns `dataUrl`.
3. Confirm optimized resume is uploaded instead of base resume.
4. Confirm reuse: same job description should reuse cached resume version.
5. Confirm different job description generates a new version.

## Storage Checks

1. `resume_versions` row created with `job_fingerprint`.
2. Optimized PDF stored in Supabase bucket.
3. Base resume remains unchanged.

## Safety Checks

1. If optimize fails, fallback to base resume.
2. If AI output is empty, still produce a valid PDF without crash.
3. No auto-submit behavior changes.
