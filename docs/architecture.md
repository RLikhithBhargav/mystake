# MyStake — Architecture

**Status:** Signed off for v1 planning  
**Product:** Personal investment coach — goal- and risk-aware, actionable recommendations with visible agent reasoning  
**Repo:** https://github.com/RLikhithBhargav/mystake (private)

---

## 1. Product framing

| Decision | Choice |
|----------|--------|
| Role | **Research / coaching copilot** (user acts in their own broker) |
| Not | Auto-trading, broker execution, “guaranteed returns” |
| Users | **Multi-user**, gated by the owner |
| Access | **Email allowlist + invite codes** |
| Onboarding | Short: goals, risk quiz, budget/net worth, holdings |

---

## 2. What users can do in v1

### Inputs

- Manual net worth, cash, monthly deploy budget
- Goals in plain language
- Risk-profile questionnaire
- Holdings entered by hand
- Brokerage **CSV** upload

### Markets & money

- **US + India** only
- **USD and INR tracked separately** (no forced single home currency)
- Free/cheap market data (e.g. Alpha Vantage–class for US, Yahoo-style for India); accept rate limits

### Coach behavior (must)

- Portfolio analysis (concentration, sector tilt)
- Market screening (“what’s interesting now”)
- Risk-alignment / position sizing vs the user’s budget
- Multi-agent debate (growth vs risk) with **visible reasoning**
- **Chat** as the main agent UX
- **Light watchlist:** save recommendation + price-at-recommend + later % change / acted vs ignored
- **LangSmith** tracing + evals from day one

### Explicitly out of v1

- Live broker sync (Plaid)
- PDF/OCR / heavy document ingestion
- Paper P&L beyond light outcomes
- Options/crypto depth, tax, social, mobile
- Magic-link auth
- Dedicated vector DB / Redis (unless proven needed)
- Cloudflare as a hard dependency
- LangGraph Platform / LangSmith **deployment** (hosting the graph)

---

## 3. System shape

```text
                    ┌─────────────────────────────────┐
                    │  Next.js (Vercel)                 │
                    │  Onboarding · Dashboard · Chat    │
                    │  Watchlist · Admin whitelist      │
                    └────────────┬──────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                                     ▼
   ┌─────────────────────┐              ┌──────────────────────────┐
   │ Supabase            │              │ FastAPI + LangGraph      │
   │ · Auth (Google)     │              │ · Coach orchestration    │
   │ · Postgres + RLS    │◄────────────►│ · Market data adapters   │
   │ · Allowlist/invites │              │ · CSV normalize          │
   └─────────────────────┘              │ Always-on (VPS / paid)   │
                                        └────────────┬─────────────┘
                                                     │
                              ┌──────────────────────┼──────────────┐
                              ▼                      ▼              ▼
                        OpenAI (primary)      OpenRouter      Free market APIs
                              └──────────► LangSmith (traces/evals only)
```

**Not serverless for the graph.** The frontend can be serverless on Vercel; agents run on a long-lived Python process.

**Not LangGraph Platform hosting** — self-host the graph; LangSmith is observability (tracing + evals) only.

---

## 4. Agent topology (LangGraph)

1. **Portfolio analyst** — holdings → exposure, concentration, gaps
2. **Market screener** — US/IN candidates from cheap APIs (respecting cache)
3. **Risk / sizing guardrail** — budget, risk quiz, dual-currency constraints
4. **Debate → synthesis** — growth vs risk-control; final recommendation + reasoning trail
5. Persist recommendation + trail; optional add to **light watchlist**

Chat drives these runs; the dashboard shows portfolio, recommendations, and watchlist.

---

## 5. Data, auth, caching & memory

| Concern | v1 approach |
|---------|-------------|
| Source of truth | **Supabase Postgres** (users, portfolios, recommendations, watchlist, outcomes, cache tables) |
| Auth | **Supabase Auth + Google OAuth** — **not Clerk** |
| Access control | RLS + app checks; whitelist/invites after login |
| Caching | **Postgres-first:** quotes/screener TTLs; portfolio snapshots invalidated on holdings/goal/risk change; coach outputs versioned / short-lived |
| Vector search | **None in v1**; upgrade path = **`pgvector` on Supabase** |
| Redis | **Later** if concurrent cache load needs it |
| Files | CSV processed then discarded or stored lightly; no RAG corpus |

### Caching details

| What | Policy |
|------|--------|
| Market quotes / screeners | Must cache (e.g. 5–15 min TTL by symbol) — free APIs rate-limit hard |
| Fundamentals / sector metadata | Hours–day TTL |
| Portfolio analytics | Recompute when holdings/budget/goals change; else serve snapshot |
| Coach run output | Key by user + portfolio version + goal/risk hash + as-of market time; short TTL or pin until holdings change |

---

## 6. Models & external APIs

- **LLMs:** OpenAI primary → **OpenRouter** on rate limits / fallback
- **Market data:** free/cheap; heavy caching mandatory
- **LangSmith:** traces + evals only (not the agent runtime host)

---

## 7. Hosting & delivery (cost-aware)

| Layer | Dev | Prod | PRs |
|-------|-----|------|-----|
| Frontend | Local | **Vercel** | Vercel preview URLs |
| API + LangGraph | Local | **Cheap VPS (e.g. Hetzner)** preferred over Render free | Point previews at **staging API** |
| DB / Auth | Local or free Supabase | **Supabase Free → Pro when needed** | Shared **staging** project (no DB-per-PR until paid branching) |
| Cloudflare | — | **Optional** later (DNS / API shield) | — |

### Why not Render free for the API

- Spins down after ~15 minutes idle; ~1 minute cold start
- 750 free instance-hours per workspace per month; exhaustion suspends services
- Tight RAM/CPU for LangGraph; free Postgres expires (~30 days)

Paid Render (no sleep) is an alternative to a VPS if less ops is preferred at higher cost.

**Note:** LLM token spend will dominate infra cost once chat is in real use.

---

## 8. Need / later / never

### Need (v1)

Whitelist + invites, Google auth, onboarding, CSV/manual portfolio, US+IN dual currency, four-node coach graph + visible debate, chat, light watchlist/outcomes, market + analysis caching, LangSmith, Vercel FE + always-on API + Supabase.

### Later

Magic link, fuller paper P&L, PDF/RAG, Plaid, `pgvector`, Redis, Cloudflare hardening, LangGraph Platform, per-PR ephemeral APIs, broader asset classes.

### Never (this product framing)

Auto-execution, ungated public access, treating coach output as regulated advice without disclaimers.

---

## 9. One-line stack

**Next.js (Vercel) + Supabase (Auth/Postgres) + FastAPI/LangGraph on a small VPS + OpenAI/OpenRouter + cheap market APIs + LangSmith tracing.**

---

## 10. Disclaimers (product)

MyStake is a research and coaching tool, not a broker and not a registered investment advisor. Recommendations are informational; users execute trades elsewhere at their own risk.
