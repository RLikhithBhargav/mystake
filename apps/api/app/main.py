from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.auth.supabase_auth import AuthUser, require_user
from app.coach.schemas import CoachRunRequest, CoachRunResponse
from app.coach.service import run_coach_for_user
from app.config import settings
from app.market.deps import get_quote_service
from app.market.schemas import QuotesRequest, QuotesResponse
from app.portfolio.csv_normalize import normalize_csv
from app.portfolio.schemas import CsvNormalizeRequest, CsvNormalizeResponse

app = FastAPI(
    title="MyStake API",
    version=__version__,
    description="FastAPI + self-hosted LangGraph coach backend.",
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
    return {
        "service": settings.service_name,
        "docs": "/docs",
        "health": "/health",
        "quotes": "/market/quotes",
        "coach": "/coach/run",
    }


@app.post("/portfolio/csv/normalize", response_model=CsvNormalizeResponse)
def portfolio_csv_normalize(body: CsvNormalizeRequest) -> CsvNormalizeResponse:
    """Parse a brokerage-like CSV into normalized holdings (no persistence)."""
    result = normalize_csv(body.csv_text)
    return CsvNormalizeResponse(**result)


@app.post("/market/quotes", response_model=QuotesResponse)
def market_quotes(body: QuotesRequest) -> QuotesResponse:
    """Return prices for symbols; serves from Postgres/memory cache within TTL."""
    service = get_quote_service()
    return service.get_quotes(body.symbols, force_refresh=body.force_refresh)


@app.post("/coach/run", response_model=CoachRunResponse)
def coach_run(
    body: CoachRunRequest,
    user: AuthUser = Depends(require_user),  # noqa: B008
) -> CoachRunResponse:
    """Run the LangGraph coach synchronously for the authenticated user."""
    return run_coach_for_user(
        user.id,
        force_refresh_quotes=body.force_refresh_quotes,
        use_seed_portfolio=body.use_seed_portfolio,
    )
