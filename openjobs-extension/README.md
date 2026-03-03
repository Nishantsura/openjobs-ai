# OpenJobs Extension

## Implemented

- MV3 extension shell with required permissions.
- LinkedIn Easy Apply detection (`Easy Apply` text/aria).
- Smart Apply button injection near native Easy Apply button.
- Modal-driven automation loop for:
- Known field fill (name, email, phone, LinkedIn URL, city)
- Optimized resume upload (Phase 3) with cache reuse
- Screening answer generation via backend API
- Step progression (`Next`/`Review`) with safety cap
- Stop-before-submit banner (`Review and Submit`)
- CAPTCHA pause behavior
- Session cap of 25 Smart Applies per day
- Validation blocker detection and manual-safe fallback

## Reliability Core

- Shared heuristics live in `core.js`.
- `content.js` consumes core for deterministic behavior.
- Unit tests validate critical classification logic.

## Setup

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click `Load unpacked`.
4. Select `/Users/mac/Documents/Openjobs AI/openjobs-extension`.
5. Open extension popup and fill:
- Backend URL
- Supabase access token
- Profile fields
- Base resume PDF

## Usage

1. Open a LinkedIn job with Easy Apply.
2. Click `Smart Apply`.
3. Review AI-filled fields.
4. Submit manually.

## Test Command

```bash
cd /Users/mac/Documents/Openjobs\ AI/openjobs-extension
npm test
```

## Notes

- Smart Apply never clicks submit.
- API calls are proxied through background script for cross-origin reliability.
