# OpenJobs Backend (MVP Foundation + Phase 3)

## Implemented APIs

- `GET /api/health`
- `POST /api/parse-resume`
- `POST /api/generate-answer`
- `POST /api/generate-email`
- `POST /api/generate-dm`
- `POST /api/generate-cover-letter`
- `POST /api/optimize-resume`

All POST endpoints require `Authorization: Bearer <supabase_access_token>`.

## Start

1. Copy `.env.example` to `.env.local`.
2. Fill Supabase + OpenAI variables.
3. Install: `npm install`
4. Run: `npm run dev`

## AI provider switch

- `AI_PROVIDER=openrouter` (default): requires `OPENROUTER_API_KEY`.
- `AI_PROVIDER=openai`: requires `OPENAI_API_KEY`.

## Security controls currently wired

- Endpoint auth checks
- Request schema validation
- In-memory per-endpoint rate limiting
- Generation event logging hook

## Phase 3 Notes

- `/api/optimize-resume` now generates a PDF and stores it in Supabase storage.
- Cached optimized resumes are reused by `job_fingerprint`.
- The response includes a `dataUrl` for direct browser upload.
- Production-grade distributed rate limiting should replace in-memory limiter before launch.
