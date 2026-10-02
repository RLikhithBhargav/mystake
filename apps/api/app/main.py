from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import settings
from app.portfolio.csv_normalize import normalize_csv
from app.portfolio.schemas import CsvNormalizeRequest, CsvNormalizeResponse

app = FastAPI(
    title="MyStake API",
    version=__version__,
    description="FastAPI + LangGraph coach backend.",
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


@app.post("/portfolio/csv/normalize", response_model=CsvNormalizeResponse)
def portfolio_csv_normalize(body: CsvNormalizeRequest) -> CsvNormalizeResponse:
    """Parse a brokerage-like CSV into normalized holdings (no persistence)."""
    result = normalize_csv(body.csv_text)
    return CsvNormalizeResponse(**result)
