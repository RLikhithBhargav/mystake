from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import settings

app = FastAPI(
    title="MyStake API",
    version=__version__,
    description="FastAPI + LangGraph coach backend (Phase 0 skeleton).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe used by the web app and future deploy checks."""
    return {"status": "ok", "service": settings.service_name, "version": __version__}


@app.get("/")
def root() -> dict[str, str]:
    return {"service": settings.service_name, "docs": "/docs", "health": "/health"}
