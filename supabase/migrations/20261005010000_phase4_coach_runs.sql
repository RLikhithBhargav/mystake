-- Phase 4: persist coach runs (recommendation + visible reasoning trail).

create table public.coach_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'completed',
  model text,
  recommendation jsonb not null default '{}'::jsonb,
  reasoning_trail jsonb not null default '[]'::jsonb,
  portfolio_snapshot jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  constraint coach_runs_status_check check (status in ('completed', 'failed'))
);

create index coach_runs_user_id_created_at_idx
  on public.coach_runs (user_id, created_at desc);

alter table public.coach_runs enable row level security;

create policy coach_runs_select_own
  on public.coach_runs for select
  to authenticated
  using (user_id = auth.uid());

-- Inserts/updates performed by the API with the service role key.
