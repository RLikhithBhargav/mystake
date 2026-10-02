# MyStake — Implementation plan

Step-by-step build order for agents and humans. Companion to [`architecture.md`](architecture.md) and [`product.md`](product.md).

## How to use

1. Work **one phase at a time**.
2. Do not start the next phase until that phase’s **exit criteria** are met.
3. Prefer vertical slices over big-bang UI polish.
4. Layout is a **monorepo** (`apps/web`, `apps/api`, shared packages as needed).
5. Skip inventing a full design system until `docs/ux.md` exists — keep UI simple and usable (~390px-friendly).
6. If implementation must diverge from this plan, update this doc in the same change or ask first.

---

## Phase 0 — Monorepo & tooling

**Goal:** Empty but bootable monorepo skeleton.

- Monorepo layout: e.g. `apps/web` (Next.js), `apps/api` (FastAPI), optional `packages/*` later
- Package managers, lint/format, `.env.example` files (no secrets committed)
- API `/health` endpoint; web hello/placeholder page
- Optional: Docker Compose for local API only
- PR CI (GitHub Actions): web lint/format + API pytest/ruff — not deploy/preview (that is Phase 7)

**Exit criteria:** `apps/web` and `apps/api` boot locally; monorepo structure is the only layout going forward.

---

## Phase 1 — Supabase Auth + access gate

**Goal:** Only allowlisted / invited users get in.

- Supabase project (dev); Google OAuth via Supabase Auth
- SQL in `supabase/migrations/`: `profiles`, `allowlist_emails`, `invites` + RLS + access RPCs
- Next.js session (`@supabase/ssr`) + gate: signed in **and** allowlisted or valid invite redemption
- Routes: `/login`, `/auth/callback`, `/access` (blocked + redeem), `/app` (shell), `/admin`
- Minimal owner/admin path to add emails and create invite codes (`OWNER_EMAILS` bootstrap)

**Exit criteria:** Non-allowlisted Google user is blocked; allowlisted user reaches an authenticated shell.

---

## Phase 2 — Onboarding + portfolio core

**Goal:** Persist the user’s financial picture.

- Onboarding: goals → risk questionnaire → net worth / cash / monthly deploy budget → holdings
- Manual holdings CRUD
- CSV import → normalize → holdings
- Dual currency: USD and INR tracked separately

**Exit criteria:** User can complete onboarding and see holdings persisted in Supabase.

---

## Phase 3 — Market data + caching

**Goal:** Cheap APIs without burning rate limits.

- Adapters for US + India free/cheap market data
- Postgres cache tables + TTLs (quotes, light fundamentals)
- API: fetch quotes (cache-aware); test that repeats hit cache within TTL

**Exit criteria:** Repeated quote requests are served from cache within TTL; refresh spam does not exhaust API quotas.

---

## Phase 4 — LangGraph coach (API-first)

**Goal:** Real coach runs before polishing chat chrome.

- Self-hosted LangGraph: portfolio analyst → market screener → risk/sizing → debate/synthesis
- Shared state schema; persist recommendation + reasoning trail
- OpenAI primary → OpenRouter fallback
- LangSmith tracing (and basic evals) enabled
- Sync HTTP “run coach” first; async job queue only if needed later

**Exit criteria:** Authenticated API call returns a recommendation + visible reasoning for a seeded portfolio; run appears in LangSmith.

---

## Phase 5 — Chat UI (functional)

**Goal:** Primary product surface in the browser.

- Chat thread wired to coach runs
- Collapsible reasoning / debate trail
- Show size / budget fit + “add to watchlist”
- Usable at ~390px width without a formal UX doc

**Exit criteria:** Allowlisted user can chat, receive a rec, and see why — from the browser.

---

## Phase 6 — Light watchlist + outcomes

**Goal:** Learning loop without a paper broker.

- Save recommendation with price-at-recommend + thesis snapshot
- Later fields: % change vs recommend date; acted / ignored

**Exit criteria:** Watchlist CRUD works; outcome fields can update without paper-trading complexity.

---

## Phase 7 — Staging & prod wiring

**Goal:** Previewable PRs and a real deploy path.

- Vercel frontend (PR previews → staging API)
- Always-on API host (VPS preferred; not Render free)
- Staging + prod Supabase (or carefully split single-project setup)
- Product disclaimers visible in UI
- Expand README “Getting started” with real run/deploy steps

**Exit criteria:** PR gets a Vercel preview against staging; `main` deploy path for FE + API is documented.

---

## Phase 8 — Hardening (as needed)

- LangSmith eval smokes; basic API rate limits; clearer error states
- Optional only if justified: Redis, Cloudflare, magic link, `pgvector`

---

## Out of order / do not pull forward

- Full UX design system (`docs/ux.md` still deferred)
- Plaid, PDF/RAG, dedicated vector DB, LangGraph Platform hosting
- Clerk / Auth0 as default auth
- Auto-trading or broker execution
- Render **free** as production coach API

---

## Phase checklist (agents)

When finishing a phase, confirm in the PR/description:

- [ ] Exit criteria met
- [ ] Docs updated if behavior diverged
- [ ] No secrets committed
- [ ] Next phase not started in the same PR unless explicitly requested
