# Phase 5 Checklist (LinkedIn Feed Smart Email / Smart DM)

## Objective

Support non-form LinkedIn hiring posts with manual-send drafts.

## Preconditions

1. Backend running with valid OpenAI key.
2. Extension configured with backend URL + access token.
3. Extension reloaded in Chrome after latest changes.

## Smart Email checks

1. Open LinkedIn feed post containing a hiring email address.
2. Confirm `Smart Email` button appears on that post.
3. Click `Smart Email`.
4. Confirm Gmail compose tab opens with prefilled:
- recipient email
- subject
- body
5. Confirm no automatic send action occurs.

## Smart DM checks

1. Open LinkedIn feed post containing DM intent text (`DM me`, `message me`, etc.).
2. Confirm `Smart DM` button appears on that post.
3. Click `Smart DM`.
4. Confirm DM draft is generated and copied to clipboard.
5. Confirm no automatic send action occurs.

## Stress checks

1. Post with multiple emails: first valid email used for draft.
2. Post with no email and no DM intent: no feed action buttons.
3. Repeated scrolling/lazy loading: buttons still inject once per post.
4. Backend failure: clear error notice shown, no page breakage.
