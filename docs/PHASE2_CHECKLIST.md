# Phase 2 Checklist (LinkedIn Easy Apply)

## Objective

Smart Apply should automate Easy Apply steps and stop at final submit, with user review preserved.

## Preconditions

1. Backend running and reachable (example: `http://localhost:3000`).
2. Extension loaded from `/Users/mac/Documents/Openjobs AI/openjobs-extension`.
3. Popup setup complete:
- Backend URL
- Supabase access token
- Profile fields
- Resume PDF

## Functional Checks

1. Open a LinkedIn Easy Apply job and confirm `Smart Apply` appears near native `Easy Apply` button.
2. Click `Smart Apply`.
3. Confirm modal opens.
4. Confirm known profile fields are auto-filled.
5. Confirm file upload is attempted on resume input.
6. Confirm screening textareas are filled when backend answer generation is available.
7. Confirm fields touched by AI show `AI filled` marker.
8. Confirm automation advances `Next` / `Review` steps.
9. Confirm it stops before submit and shows `Review and Submit` banner.
10. Confirm no auto-submit action occurs.

## Safety Checks

1. CAPTCHA detection triggers pause and warning.
2. Session limit blocks after 25 Smart Applies in same day.
3. If backend fails, partial fill still completes safely.
4. If selectors fail on a step, user can continue manually.

## Stress Test Matrix

1. Slow network + delayed modal render.
2. Multiple form pages with changing field IDs.
3. Empty/missing labels where aria/placeholder must be used.
4. Hidden dynamic file input that appears only after click.
5. Unexpected validation errors after `Next`.
6. Multiple textarea questions in one step.
7. Large job descriptions (token pressure on answer generation).
8. Intermittent backend 429/500 errors.

## Exit Criteria

- No auto-submit incidents.
- Stable stop-before-submit behavior.
- >=80% success across curated LinkedIn Easy Apply test set.
