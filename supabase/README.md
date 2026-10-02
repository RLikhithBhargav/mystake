# Supabase (MyStake)

SQL migrations for Auth, Postgres, and RLS. Apply to a **dev** Supabase project for Phase 1.

## Apply migrations

**Option A — SQL editor:** open the Supabase dashboard → SQL → paste and run files in `migrations/` in filename order.

Phase 2 adds `portfolio_profiles` + `holdings` (`20261002010000_phase2_portfolio.sql`) — run it after Phase 1 if your project already has auth tables.

**Option B — CLI:** link the project and run `supabase db push` (requires [Supabase CLI](https://supabase.com/docs/guides/cli) and a linked project).

## Auth setup (Google OAuth)

1. Authentication → Providers → enable **Google**; set Client ID / Secret from Google Cloud Console.
2. Authentication → URL configuration:
   - Site URL: `http://localhost:3000` (local)
   - Redirect URLs: `http://localhost:3000/auth/callback`
3. Copy Project URL + anon key (+ service role for owner bootstrap) into `apps/web/.env.local`.

## Bootstrap the first admin

1. Set `OWNER_EMAILS` in `apps/web/.env.local` to your Google account email.
2. Sign in once via the web app — the app grants allowlist + `is_admin` for owner emails using the service role.
3. Or run SQL manually after your first sign-in:

```sql
insert into public.allowlist_emails (email, note)
values ('you@example.com', 'owner')
on conflict (email) do nothing;

update public.profiles
set access_granted = true, is_admin = true
where lower(email) = lower('you@example.com');
```
