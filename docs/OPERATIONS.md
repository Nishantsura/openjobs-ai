# Operations

## Runtime Targets

- Frontend/backend hosting: Vercel
- Database/storage/auth: Supabase
- AI provider: OpenAI API

## Environments

- Local: developer machine + Chrome dev extension mode
- Production: Vercel + Supabase production project

## Minimum Observability

- Endpoint request IDs
- Error categorization (auth, validation, upstream, internal)
- Basic usage counters per endpoint/user/day

## Incident Basics

1. Stop risky behavior pathways (feature flags).
2. Preserve logs and request IDs.
3. Patch and redeploy.
4. Document in changelog.
