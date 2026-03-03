# Release Notes 0.2.0

## Highlights
- New onboarding-first popup flow (sign-in, resume parse, profile capture, readiness check).
- Hidden debug panel (7-title-click unlock + passphrase) for development diagnostics.
- Smart DM removed; Smart Email retained.
- Cover letter auto-generation + autofill added to Smart Apply flows.
- Naukri beta adapter added behind feature flag.
- Backend reliability upgrades:
  - structured error codes in API failures
  - trace id in API responses
  - OpenRouter retry with backoff and fallback models
  - new `/api/readiness`, `/api/onboarding/profile`, `/api/auth/session-exchange`

## Migration Notes
- Extension local storage now uses:
  - `openjobsAuthSession`
  - `openjobsOnboardingState`
  - `openjobsUserPreferences`
  - `openjobsDebugUnlocked`
  - `openjobsFeatureFlags`

