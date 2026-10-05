# MyStake

Personal investment **coaching copilot** for US and India markets. Goal- and risk-aware recommendations with visible multi-agent reasoning. You stay in control — MyStake does not place trades.

**Status:** Private · pre-MVP · architecture signed off

## Stack

Next.js (Vercel) · Supabase (Auth + Postgres) · FastAPI + self-hosted LangGraph · OpenAI → OpenRouter fallback · cheap market APIs · LangSmith (tracing/evals)

**Layout:** monorepo (`apps/web`, `apps/api`, …).

## Docs

| Doc | What it covers |
|-----|----------------|
| [Architecture](docs/architecture.md) | System design, agents, hosting, caching |
| [Product](docs/product.md) | Scope, users, access, need / later / never |
| [Implementation plan](docs/implementation-plan.md) | Phase-by-phase build order for agents |
| [AGENTS.md](AGENTS.md) | Short index for coding agents |
| [supabase/README.md](supabase/README.md) | Migrations + Google OAuth setup |

UI/UX guidelines will land as the app matures.

## Getting started

pnpm monorepo with Next.js (`apps/web`) and FastAPI (`apps/api`). Phase 1 adds Supabase Auth (Google) + allowlist/invite gate on the web app.

**Prerequisites:** Node 20+, pnpm, Python 3.11+ (with `python3-venv`), a Supabase project (for auth).

```bash
# From the repo root
pnpm install                       # JS workspace deps

# Python API venv
cd apps/api
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
cd ../..

# Web env (Phase 1)
cp apps/web/.env.example apps/web/.env.local
# Fill NEXT_PUBLIC_SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY, OWNER_EMAILS
# Apply supabase/migrations (see supabase/README.md) and enable Google OAuth

# Run both apps (in separate shells)
pnpm dev:web                                                   # web  → http://localhost:3000
cd apps/api && .venv/bin/uvicorn app.main:app --reload --port 8000   # api → http://localhost:8000
```

### Access + portfolio flow

1. Open `/login` → Continue with Google.
2. If your email is in `OWNER_EMAILS` (and service role is set), you are auto-allowlisted as admin.
3. Otherwise you land on `/access` until an admin adds your email or you redeem an invite.
4. First visit after access → `/onboarding` (goals → risk → money → holdings).
5. Then `/app` shows your picture; `/app/holdings` for manual CRUD + CSV (API must be running for CSV normalize + quotes).

Apply Supabase migrations in `supabase/migrations/` in filename order (auth → portfolio → market cache).

### Market quotes (Phase 3)

```bash
# apps/api/.env — optional but recommended for shared Postgres cache
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
QUOTE_CACHE_TTL_SECONDS=600
```

`POST /market/quotes` returns prices; repeats within TTL are cache hits. Holdings page shows marks and hit/miss counts.

### Coach (Phase 4)

```bash
# apps/api/.env — add to Phase 3 Supabase vars
SUPABASE_ANON_KEY=...          # JWT user lookup (same anon key as web)
OPENAI_API_KEY=...             # optional; else deterministic coach
# OPENROUTER_API_KEY=...       # fallback
LANGSMITH_API_KEY=...          # optional tracing
LANGSMITH_PROJECT=mystake
```

Apply the Phase 4 migration, restart the API, sign in, and click **Run coach** on `/app`. `POST /coach/run` with `Authorization: Bearer <access_token>` returns a recommendation + reasoning trail.

### Checks

```bash
pnpm lint                 # web (next lint)
pnpm format:check         # prettier
cd apps/api && .venv/bin/pytest && .venv/bin/ruff check .
```

The same checks run on every PR and on pushes to `main` via GitHub Actions (workflow **CI**, required gate job **`ci`**). After the first green run, add check name `ci` under the **Protect main** ruleset → Required status checks.

## Disclaimer

MyStake is a research and coaching tool for informational purposes only. It is not a broker and not a registered investment advisor. Recommendations are not guarantees; users execute trades elsewhere at their own risk.
