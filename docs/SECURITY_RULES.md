# Security and Compliance Rules

## Must

- Validate authenticated session on every AI endpoint.
- Rate-limit all AI endpoints.
- Store resume PDFs in private Supabase storage.
- Encrypt sensitive auth/session data in transit and at rest.
- Keep auditable logs for failures and abuse controls.

## Must Not

- Store LinkedIn credentials.
- Auto-submit any application.
- Auto-send emails or DMs.
- Use server-side browser bots or hidden background automation.

## Risk Controls

- 300-800 ms delays between field actions.
- Scroll simulation before fill blocks.
- Max 25 Smart Applies per session.
- Pause when CAPTCHA detected.
- No background tab automation.
