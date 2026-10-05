# MyStake API

FastAPI backend: CSV normalize, market quotes, and a self-hosted LangGraph coach.

## Local development

```bash
cd apps/api
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt

.venv/bin/uvicorn app.main:app --reload --port 8000

.venv/bin/pytest
.venv/bin/ruff check .
```

### Endpoints

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health` | Liveness |
| POST | `/portfolio/csv/normalize` | Parse holdings CSV |
| POST | `/market/quotes` | Cache-aware US/IN quotes |
| POST | `/coach/run` | Auth’d LangGraph coach (Bearer Supabase JWT) |

Interactive docs: `/docs`.

### Env

Copy `.env.example` to `.env`.

**Coach needs:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (to validate the user JWT and load/persist portfolio + `coach_runs`).

**LLM (optional):** `OPENAI_API_KEY` and/or `OPENROUTER_API_KEY`. Without keys the graph still runs with a deterministic synthesis (good for local/CI).

**LangSmith (optional):** `LANGSMITH_API_KEY` + `LANGSMITH_PROJECT` — traces only, not LangGraph Platform hosting.
