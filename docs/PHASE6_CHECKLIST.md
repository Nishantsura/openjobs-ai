# Phase 6 Checklist (Assist Mode)

## Objective

Fallback assistance for unsupported portals without breaking user flow.

## Implemented

- Floating `Assist Mode` button on non-native domains.
- Generic form scan (`input`, `textarea`, `select`).
- Known-field auto-fill via profile mapping.
- Uncertain-field highlighting.
- Side panel for generated answer suggestions.

## Manual checks

1. Open a non-supported portal or company career form page.
2. Confirm floating `Assist Mode` button appears.
3. Click it and verify known fields are filled.
4. Verify uncertain fields are highlighted.
5. Verify side panel appears with textarea suggestions.
6. Confirm no auto-submit behavior.

## OpenAI dependency

- AI suggestions require valid `OPENAI_API_KEY` in backend `.env.local`.
- Without key, form fill still works, but suggestion panel will show fallback messages.
