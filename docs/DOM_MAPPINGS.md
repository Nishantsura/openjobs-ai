# DOM Mapping Notes

## LinkedIn Easy Apply (Phase 2)

Selectors and heuristics:
- Trigger button text/aria includes `Easy Apply`
- Form controls: `input`, `textarea`, `select`
- Matching signals: label text, placeholder, aria-label
- Events after assignment: `input` then `change`

Guardrails:
- Wait for modal readiness via `MutationObserver`
- Never click final submit
- Inject explicit `Review and Submit` banner

## Generic Assist Mode (Phase 6)

- Detect all standard form controls
- Confidence score per match
- Fill high-confidence fields only
- Highlight low-confidence fields for manual completion
