# Reliability Plan (Phase 2 Hardening)

## What was hardened

1. Shared core heuristics moved to `openjobs-extension/core.js`.
2. Action intent classification (`next`, `review`, `submit`, `unknown`).
3. Validation blocker detection before/after step transitions.
4. Unknown-step fail-safe now exits to manual-safe mode.
5. Background-proxied API calls to avoid LinkedIn page CORS failures.

## Deterministic Test Layer

Run core unit tests:

```bash
cd /Users/mac/Documents/Openjobs\ AI/openjobs-extension
npm test
```

Current coverage focus:
- Field key detection heuristics
- Action button intent classification
- Question text filtering
- Validation text detection

## Manual Stress Run Protocol

1. Execute 20 LinkedIn Easy Apply flows across mixed roles.
2. Record outcomes by step count and failure reason.
3. Classify failures into:
- selector drift
- validation blocker
- answer generation failure
- upload mismatch
- unknown button intent
4. Patch highest-frequency failure class first.

## Success Gates

- Zero auto-submit incidents.
- Unknown intent always falls back to manual-safe mode.
- >=80% success in 20-flow smoke + 50-flow extended run.
