# Product Requirements (MVP)

## Product Positioning

OpenJobs AI is not a job board, not a resume builder, and not a hidden auto-apply bot. It is a user-controlled browser assistant.

## MVP Supported Platforms

- LinkedIn Easy Apply
- LinkedIn feed hiring posts
- Wellfound
- Greenhouse
- Lever
- Glassdoor
- Indeed
- Naukri

Not in MVP: Workday and heavily customized enterprise portals.

## Core User Flow

1. Install extension.
2. Sign in (Google or email/password).
3. Upload resume and confirm extracted profile.
4. Browse jobs normally.
5. Smart Apply appears on supported pages.
6. Assistant fills data and generates answers.
7. Assistant stops at `Review and Submit`.
8. User manually submits.

## Safety

- No automatic submission.
- No automatic sending of email/DM.
- CAPTCHA pause behavior.
- Human-like delays.
- Session-level application cap.

## Architecture

Browser -> Extension -> Backend API -> OpenAI -> Extension fills form -> User submits.
