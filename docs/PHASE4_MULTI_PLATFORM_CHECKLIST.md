# Phase 4 Multi-Platform Checklist

## Important

After manifest/content-script changes, reload extension in `chrome://extensions`.

## Greenhouse

1. Open `boards.greenhouse.io` or `job-boards.greenhouse.io` job page.
2. If form already visible: `Smart Apply` should appear above the form.
3. If only apply CTA visible: floating `Smart Apply` appears bottom-right.
4. Click `Smart Apply` and verify known fields + resume fill.
5. Confirm no auto-submit.

## Lever

1. Open a Lever job page (`jobs.lever.co`).
2. Confirm `Smart Apply` appears above form.
3. Click and verify known fields + resume fill.
4. Confirm no auto-submit.

## Indeed

1. Open an Indeed native apply form page.
2. Confirm `Smart Apply` appears above form.
3. Click and verify known fields + resume fill where fields are standard controls.
4. Confirm no auto-submit.

## Glassdoor

1. Open a Glassdoor native apply form page.
2. Confirm `Smart Apply` appears above form.
3. Click and verify known fields + resume fill where fields are standard controls.
4. Confirm no auto-submit.

## Wellfound

1. Open a Wellfound apply form page.
2. Confirm `Smart Apply` appears above form.
3. Click and verify known fields + resume fill.
4. Confirm no auto-submit.

## Local Stress Tests Run

- Selector stress tests for all five platforms.
- Adapter script syntax checks.

Command:

```bash
cd /Users/mac/Documents/Openjobs\ AI/openjobs-extension
npm test
```
