# Test Strategy

## Test Layers

1. Unit tests
- Field label matching
- Delay/rate-control utilities
- Endpoint validators

2. Integration tests
- Endpoint auth guard behavior
- Resume parse pipeline success/failure
- AI response schema validation

3. Extension E2E/manual matrix
- LinkedIn page variants
- Modal timing/race conditions
- File upload control variants
- Screening Q/A insertion
- Stop-before-submit assertion

## Stress Tests

1. Slow DOM rendering (>4s modal open)
2. Multiple candidate selectors for same field
3. Intermittent network failures (AI timeout/retry)
4. CAPTCHAs appearing mid-flow
5. Burst apply attempt over session cap
6. Unsupported portal fallback to Assist Mode

## Exit Criteria (Phase 2)

- >=80% success across curated LinkedIn Easy Apply test set.
- 0 auto-submit incidents.
