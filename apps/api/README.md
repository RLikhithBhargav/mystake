# MyStake API

FastAPI backend. Hosts CSV normalize, market quotes (Phase 3), and later the self-hosted LangGraph coach.

## Local development

From the repo root, a Python virtualenv lives at `apps/api/.venv`.

```bash
cd apps/api
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt

# Run the dev server
.venv/bin/uvicorn app.main:app --reload --port 8000

# Run tests / lint
.venv/bin/pytest
.venv/bin/ruff check .
```

### Endpoints

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health` | Liveness |
| POST | `/portfolio/csv/normalize` | Parse holdings CSV (no persistence) |
| POST | `/market/quotes` | Cache-aware US/IN quotes |

Interactive docs: `/docs`.

### Env

Copy `.env.example` to `.env`.

- Without Supabase keys: quotes use **in-memory** cache (fine for solo local testing).
- With `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`: quotes persist in `market_quotes` (apply Phase 3 migration first).
- Optional `ALPHA_VANTAGE_API_KEY` for US; Yahoo is the default for US + India (`.NS`).
