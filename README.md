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

UI/UX guidelines will land as the app matures.

## Getting started

The Phase 0 skeleton is in place: a pnpm monorepo with a Next.js web app (`apps/web`) and a
FastAPI backend (`apps/api`), both bootable locally with no secrets.

**Prerequisites:** Node 20+, pnpm, Python 3.11+ (with `python3-venv`).

```bash
# From the repo root
pnpm install                       # JS workspace deps

# Python API venv
cd apps/api
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
cd ../..

# Run both apps (in separate shells)
pnpm dev:web                                                   # web  → http://localhost:3000
cd apps/api && .venv/bin/uvicorn app.main:app --reload --port 8000   # api → http://localhost:8000
```

The web home page pings the API's `GET /health` to show the two services are wired together.
Copy each app's `.env.example` to `.env`/`.env.local` for local config — Phase 0 needs no secrets.

### Checks

```bash
pnpm lint                 # web (next lint)
pnpm format:check         # prettier
cd apps/api && .venv/bin/pytest && .venv/bin/ruff check .
```

The same checks run on every PR and on pushes to `main` via GitHub Actions (workflow **CI**, required gate job **`ci`**). After the first green run, add check name `ci` under the **Protect main** ruleset → Required status checks.

## Disclaimer

MyStake is a research and coaching tool for informational purposes only. It is not a broker and not a registered investment advisor. Recommendations are not guarantees; users execute trades elsewhere at their own risk.
