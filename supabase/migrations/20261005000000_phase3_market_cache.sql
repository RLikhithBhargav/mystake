-- Phase 3: Postgres-first market quote + light fundamentals cache (TTL'd).

create table public.market_quotes (
  symbol text not null,
  market text not null,
  currency text not null,
  price numeric(18, 6) not null,
  previous_close numeric(18, 6),
  as_of timestamptz,
  source text not null default 'unknown',
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  raw jsonb not null default '{}'::jsonb,
  primary key (symbol, market),
  constraint market_quotes_market_check check (market in ('US', 'IN')),
  constraint market_quotes_currency_check check (currency in ('USD', 'INR')),
  constraint market_quotes_price_nonneg check (price >= 0)
);

create index market_quotes_expires_at_idx on public.market_quotes (expires_at);

create table public.market_fundamentals (
  symbol text not null,
  market text not null,
  currency text not null,
  sector text,
  market_cap numeric(24, 2),
  pe_ratio numeric(18, 6),
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  raw jsonb not null default '{}'::jsonb,
  primary key (symbol, market),
  constraint market_fundamentals_market_check check (market in ('US', 'IN')),
  constraint market_fundamentals_currency_check check (currency in ('USD', 'INR'))
);

create index market_fundamentals_expires_at_idx on public.market_fundamentals (expires_at);

alter table public.market_quotes enable row level security;
alter table public.market_fundamentals enable row level security;

-- Shared reference data: authenticated users may read; writes via service role (API).
create policy market_quotes_select_authenticated
  on public.market_quotes for select
  to authenticated
  using (true);

create policy market_fundamentals_select_authenticated
  on public.market_fundamentals for select
  to authenticated
  using (true);
