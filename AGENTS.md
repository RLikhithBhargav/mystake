# MyStake

Personal investment **coaching copilot** for US + India markets. Goal- and risk-aware recommendations with visible multi-agent reasoning. Users execute trades in their own brokers — MyStake does not trade or give regulated advice.

## Stack (v1)

Next.js (Vercel) · Supabase (Auth + Postgres) · FastAPI + self-hosted LangGraph (always-on VPS) · OpenAI → OpenRouter fallback · cheap market APIs · LangSmith tracing/evals only

**Layout:** monorepo (`apps/web`, `apps/api`, …).

## Read first

| Doc | When |
|-----|------|
| [`docs/architecture.md`](docs/architecture.md) | System design, hosting, caching, agents overview |
| [`docs/product.md`](docs/product.md) | Scope, users, access, inputs, need/later/never |
| [`docs/implementation-plan.md`](docs/implementation-plan.md) | **Phase order** — build step by step; meet exit criteria before advancing |

UI/UX guidelines are intentionally deferred — do not invent a heavy design system until `docs/ux.md` exists.

## Non-negotiables

- **Auth:** Supabase Auth + Google OAuth — not Clerk
- **Access:** email allowlist + invite codes (owner-controlled)
- **Agents:** self-host LangGraph; LangSmith = traces/evals only (not LangGraph Platform hosting)
- **API:** long-lived process — not serverless for the coach graph
- **Data:** CSV + manual holdings only in v1 — no PDF/RAG corpus, no dedicated vector DB
- **Markets:** US + India; USD and INR tracked separately
- **Never:** auto-trading / broker execution; ungated public access

## When building

Follow [`docs/implementation-plan.md`](docs/implementation-plan.md) **one phase at a time**. Prefer extending documented decisions over re-deriving architecture from the codebase. If something conflicts with architecture, product, or the implementation plan, update those docs in the same change or ask before diverging.
