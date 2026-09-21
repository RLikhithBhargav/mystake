# MyStake API

FastAPI backend (Phase 0 skeleton). Hosts the self-hosted LangGraph coach in later phases.

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

Endpoints: `GET /health`, `GET /`, and interactive docs at `/docs`.

Copy `.env.example` to `.env` for local config. No secrets are required to boot Phase 0.
