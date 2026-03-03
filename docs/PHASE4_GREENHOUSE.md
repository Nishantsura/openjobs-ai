# Phase 4: Greenhouse Adapter

## Goal

Support Greenhouse hosted job applications with Smart Apply fill + resume upload.

## Implemented

- Content script matches Greenhouse pages.
- Injects `Smart Apply` button into the application form.
- Fills known fields (name, email, phone, LinkedIn URL, city).
- Uploads base resume PDF.

## Files

- `/Users/mac/Documents/Openjobs AI/openjobs-extension/greenhouse.js`
- `/Users/mac/Documents/Openjobs AI/openjobs-extension/manifest.json`

## Manual Test

1. Open a Greenhouse job page (boards.greenhouse.io).
2. Confirm `Smart Apply` appears above the form.
3. Click `Smart Apply`.
4. Confirm fields are filled and resume is attached.
5. Confirm no auto-submit occurs.
