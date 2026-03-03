# OpenJobs AI Extension Permissions Audit

## Extension Permissions
- `activeTab`: reload current tab for script reinjection after setup.
- `scripting`: platform-specific Smart Apply content scripts.
- `storage`: local onboarding/profile/resume/feature flag state.

## Host Permissions and Rationale
- `https://*.linkedin.com/*`: LinkedIn Smart Apply + Smart Email actions.
- `https://*.greenhouse.io/*`, `https://boards.greenhouse.io/*`, `https://job-boards.greenhouse.io/*`: Greenhouse forms.
- `https://*.lever.co/*`: Lever forms.
- `https://*.indeed.com/*`, `https://*.indeed.co.in/*`: Indeed forms.
- `https://*.glassdoor.com/*`, `https://*.glassdoor.co.in/*`: Glassdoor forms.
- `https://*.wellfound.com/*`, `https://*.angel.co/*`: Wellfound forms.
- `https://*.naukri.com/*`: Naukri beta adapter (feature-flagged).
- `https://*.supabase.co/*`: production auth/session calls.
- `http://localhost/*`, `http://127.0.0.1/*`: local backend development.
- `https://*.vercel.app/*`: hosted backend deployment support.

## Reduction Strategy
- Keep Naukri behind feature flag until pass matrix complete.
- Remove localhost/127 permissions from production package once hosted backend is finalized.
- Reassess wildcard host scopes after platform-specific URL stability review.

