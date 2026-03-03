# Payment + Login Checklist

## Objective

Require login and paid entitlement for AI features while preserving basic form-fill for free users.

## Backend

1. Set `BILLING_URL` in backend `.env.local`.
2. Ensure `subscriptions` table exists in Supabase.
3. Start backend and verify:
- `GET /api/entitlement` with bearer token
- `GET /api/billing-link` with bearer token

## Extension popup

1. Save backend URL + token.
2. Click `Check Access` and verify status shows:
- `Plan: FREE | AI: locked` or
- `Plan: PRO | AI: enabled`
3. Click `Upgrade` and verify hosted billing page opens.

## Feature gating behavior

1. FREE plan:
- Smart Apply known field fill works.
- AI generation actions show upgrade-required message.

2. PRO/TRIAL plan:
- Smart Email / Smart DM / AI answers / optimize resume available.

## Notes

- This is gating scaffold; Stripe webhook and subscription lifecycle sync must be completed for production billing automation.
