-- Phase 1: profiles, allowlist, invites, RLS, and access RPCs.
-- Apply to your Supabase project (SQL editor or `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  access_granted boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (lower(email));

create table public.allowlist_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint allowlist_emails_email_unique unique (email)
);

create index allowlist_emails_email_lower_idx on public.allowlist_emails (lower(email));

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  redeemed_by uuid references auth.users (id) on delete set null,
  redeemed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invites_code_nonempty check (char_length(code) >= 6)
);

create index invites_code_idx on public.invites (code);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.current_access_granted()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select access_granted from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Grant access when the signed-in user's email is allowlisted.
create or replace function public.grant_access_if_allowlisted()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
  granted boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  select lower(email) into user_email from public.profiles where id = auth.uid();
  if user_email is null or user_email = '' then
    select lower(email) into user_email from auth.users where id = auth.uid();
    if user_email is not null then
      insert into public.profiles (id, email)
      values (auth.uid(), user_email)
      on conflict (id) do update
        set email = excluded.email,
            updated_at = now();
    end if;
  end if;

  if exists (
    select 1 from public.allowlist_emails a
    where lower(a.email) = user_email
  ) then
    update public.profiles
    set access_granted = true,
        updated_at = now()
    where id = auth.uid();
  end if;

  select access_granted into granted from public.profiles where id = auth.uid();
  return coalesce(granted, false);
end;
$$;

-- Single-use invite redemption for the signed-in user.
create or replace function public.redeem_invite(invite_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.invites%rowtype;
  already boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select access_granted into already from public.profiles where id = auth.uid();
  if coalesce(already, false) then
    return true;
  end if;

  select * into invite_row
  from public.invites
  where code = trim(invite_code)
  for update;

  if not found then
    raise exception 'Invalid invite code';
  end if;

  if invite_row.redeemed_by is not null then
    raise exception 'Invite already used';
  end if;

  if invite_row.expires_at is not null and invite_row.expires_at < now() then
    raise exception 'Invite expired';
  end if;

  update public.invites
  set redeemed_by = auth.uid(),
      redeemed_at = now()
  where id = invite_row.id;

  insert into public.profiles (id, email, access_granted)
  values (
    auth.uid(),
    coalesce((select email from auth.users where id = auth.uid()), ''),
    true
  )
  on conflict (id) do update
    set access_granted = true,
        updated_at = now();

  return true;
end;
$$;

revoke all on function public.grant_access_if_allowlisted() from public;
revoke all on function public.redeem_invite(text) from public;
revoke all on function public.is_admin() from public;
revoke all on function public.current_access_granted() from public;

grant execute on function public.grant_access_if_allowlisted() to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_access_granted() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.allowlist_emails enable row level security;
alter table public.invites enable row level security;

create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

-- Access flags are changed only via security definer RPCs or admin.
create policy profiles_admin_update
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admins manage allowlist; non-admins cannot read the full list.
create policy allowlist_admin_all
  on public.allowlist_emails for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy invites_admin_all
  on public.invites for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Authenticated users may see invites they redeemed (optional audit).
create policy invites_select_own_redeemed
  on public.invites for select
  to authenticated
  using (redeemed_by = auth.uid() or public.is_admin());
