-- Phase 2: portfolio profile (onboarding) + holdings. USD and INR tracked separately.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.portfolio_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  goals_text text not null default '',
  risk_answers jsonb not null default '{}'::jsonb,
  risk_score integer,
  net_worth_usd numeric(18, 2) not null default 0,
  net_worth_inr numeric(18, 2) not null default 0,
  cash_usd numeric(18, 2) not null default 0,
  cash_inr numeric(18, 2) not null default 0,
  monthly_deploy_usd numeric(18, 2) not null default 0,
  monthly_deploy_inr numeric(18, 2) not null default 0,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_profiles_risk_score_range
    check (risk_score is null or (risk_score >= 1 and risk_score <= 5)),
  constraint portfolio_profiles_nonneg_money check (
    net_worth_usd >= 0
    and net_worth_inr >= 0
    and cash_usd >= 0
    and cash_inr >= 0
    and monthly_deploy_usd >= 0
    and monthly_deploy_inr >= 0
  )
);

create table public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  symbol text not null,
  name text,
  market text not null,
  currency text not null,
  quantity numeric(18, 6) not null,
  avg_cost numeric(18, 6),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint holdings_market_check check (market in ('US', 'IN')),
  constraint holdings_currency_check check (currency in ('USD', 'INR')),
  constraint holdings_quantity_nonneg check (quantity >= 0),
  constraint holdings_avg_cost_nonneg check (avg_cost is null or avg_cost >= 0),
  constraint holdings_symbol_nonempty check (char_length(trim(symbol)) > 0),
  constraint holdings_user_symbol_market_unique unique (user_id, symbol, market)
);

create index holdings_user_id_idx on public.holdings (user_id);
create index holdings_user_currency_idx on public.holdings (user_id, currency);

create trigger portfolio_profiles_set_updated_at
  before update on public.portfolio_profiles
  for each row execute function public.set_updated_at();

create trigger holdings_set_updated_at
  before update on public.holdings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — users only see/edit their own rows
-- ---------------------------------------------------------------------------

alter table public.portfolio_profiles enable row level security;
alter table public.holdings enable row level security;

create policy portfolio_profiles_select_own
  on public.portfolio_profiles for select
  to authenticated
  using (user_id = auth.uid());

create policy portfolio_profiles_insert_own
  on public.portfolio_profiles for insert
  to authenticated
  with check (user_id = auth.uid());

create policy portfolio_profiles_update_own
  on public.portfolio_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy holdings_select_own
  on public.holdings for select
  to authenticated
  using (user_id = auth.uid());

create policy holdings_insert_own
  on public.holdings for insert
  to authenticated
  with check (user_id = auth.uid());

create policy holdings_update_own
  on public.holdings for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy holdings_delete_own
  on public.holdings for delete
  to authenticated
  using (user_id = auth.uid());
