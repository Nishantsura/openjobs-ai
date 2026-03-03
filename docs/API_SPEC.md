# API Specification (MVP)

All endpoints require authenticated user context.

## `POST /api/parse-resume`

Input:
- Multipart form with PDF file

Behavior:
1. Validate session and file type.
2. Extract text.
3. Prompt OpenAI for structured JSON.
4. Store original PDF and parsed JSON.
5. Return parsed profile payload.

## `POST /api/optimize-resume`

Input:
- job description text
- source resume reference

Output:
- optimized resume metadata + storage path

## `POST /api/generate-answer`

Input:
- question text
- job description
- profile JSON

Output:
- concise professional answer

## `POST /api/generate-email`

Input:
- post context + profile

Output:
- email subject + body + recommended resume version

## `POST /api/generate-dm`

Input:
- post context + profile

Output:
- concise recruiter DM draft

## `POST /api/generate-cover-letter`

Input:
- job description
- profile JSON

Output:
- tailored cover letter text

## Endpoint Controls

- Auth required
- Rate limit required
- Token budgeting
- Structured error envelope
- Provider switch via `AI_PROVIDER=openai|openrouter`

## `POST /api/optimize-resume`

Input:
- `jobDescription` (string)
- `profile` (optional object)

Output:
- `jobFingerprint`
- `storagePath`
- `dataUrl` (base64 PDF data)
- `fileName`
- `reused` (boolean)

Behavior:
- Returns cached optimized resume when available.
- Generates new PDF and stores in `resume_versions` when not cached.
