# MyStake — Product

Companion to [`architecture.md`](architecture.md). Product scope and v1 boundaries for agents and humans.

---

## Positioning

MyStake is a **research / coaching copilot**, not a broker and not a budgeting app clone.

- Ingests the user’s financial picture (manual + CSV)
- Reasons with a multi-agent graph (analysis → screen → risk/size → debate/synthesis)
- Surfaces **actionable** ideas with **visible why** (reasoning trail)
- User executes elsewhere

**Disclaimer (always true):** informational coaching only — not registered investment advice; no guaranteed returns.

---

## Users & access

| Concern | v1 |
|---------|-----|
| Audience | Multi-user |
| Gate | Owner-controlled **email allowlist** + **invite codes** |
| Auth | Supabase Auth + **Google OAuth** |
| Onboarding | Short: goals → risk questionnaire → net worth/cash/monthly deploy budget → holdings (manual and/or CSV) |
| Auth later | Magic link (not v1) |

---

## v1 capabilities

### Inputs

- Manual net worth, cash, monthly deploy budget
- Goals in plain language (e.g. aggressive growth, $X to deploy)
- Risk-profile questionnaire
- Holdings entered by hand
- Brokerage **CSV** upload

### Markets & money

- **US + India** only
- **USD and INR tracked separately**
- Free/cheap market data; accept rate limits (caching required — see architecture)

### Coach (must-have)

- Portfolio analysis (concentration, sector tilt)
- Market screening
- Risk-alignment / position sizing vs user budget
- Multi-agent debate (growth vs risk) with visible reasoning
- Chat as primary agent experience
- Light watchlist: save rec + price-at-recommend + later % change / acted vs ignored
- LangSmith tracing + evals from day one

---

## Out of scope for v1

- Live broker sync (Plaid)
- PDF/OCR / heavy document ingestion / RAG corpus
- Fuller paper trading P&L (beyond light watchlist outcomes)
- Options/crypto depth, tax optimization, social, native mobile apps
- Dedicated vector DB or Redis (upgrade paths exist; not required to start)
- Cloudflare as a hard dependency
- LangGraph Platform / managed graph hosting

---

## Need / later / never

### Need (v1)

Whitelist + invites, Google auth, onboarding, CSV/manual portfolio, US+IN dual currency, coach graph + visible debate, chat, light watchlist/outcomes, market + analysis caching, LangSmith, Vercel FE + always-on API + Supabase.

### Later

Magic link, fuller paper P&L, PDF/RAG, Plaid, `pgvector`, Redis, Cloudflare hardening, LangGraph Platform, per-PR ephemeral APIs, broader asset classes, dedicated UX design system doc.

### Never (this product)

Auto-execution, ungated public access, presenting coach output as regulated advice without disclaimers.

---

## Success for v1

A whitelisted user can complete onboarding, see their portfolio picture, chat with the coach, get a sized recommendation with a reasoning trail, and save it to a light watchlist — without the system placing any trades.
