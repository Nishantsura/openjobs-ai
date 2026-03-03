# Supabase Setup (Phase 1)

Run this SQL in Supabase SQL Editor:

```sql
create table if not exists public.profiles (
  user_id uuid primary key,
  structured_profile_json jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null check (type in ('base', 'optimized')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_resume_id uuid,
  job_fingerprint text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.generation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null,
  token_estimate int,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan text not null default 'FREE',
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);
```

Create storage bucket:

- Name: `resumes`
- Privacy: private

RLS policy strategy (MVP):

- Service role writes all records.
- Client reads/writes only own rows by `auth.uid() = user_id`.
