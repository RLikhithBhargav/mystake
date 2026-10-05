"""Orchestrate quotes → LangGraph coach → persistence."""

from __future__ import annotations

from typing import Any

from app.coach.graph import get_compiled_graph
from app.coach.persist import persist_coach_run
from app.coach.portfolio_loader import SEED_PORTFOLIO, load_portfolio
from app.coach.schemas import CoachRunResponse, ReasoningStep
from app.config import settings
from app.market.deps import get_quote_service
from app.market.schemas import QuoteRequestItem


def configure_langsmith() -> bool:
    """Enable LangSmith tracing via env if a key is present. Returns whether enabled."""
    import os

    key = settings.langsmith_api_key.strip()
    if not key:
        return False
    os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
    os.environ.setdefault("LANGCHAIN_API_KEY", key)
    if settings.langsmith_project.strip():
        os.environ.setdefault("LANGCHAIN_PROJECT", settings.langsmith_project.strip())
    return True


def run_coach_for_user(
    user_id: str,
    *,
    force_refresh_quotes: bool = False,
    use_seed_portfolio: bool = False,
    portfolio_override: dict[str, Any] | None = None,
) -> CoachRunResponse:
    langsmith_enabled = configure_langsmith()

    if portfolio_override is not None:
        portfolio = portfolio_override
    elif use_seed_portfolio and settings.coach_allow_seed_portfolio:
        portfolio = {**SEED_PORTFOLIO, "user_id": user_id}
    else:
        portfolio = load_portfolio(user_id)

    holdings = portfolio.get("holdings") or []
    quote_items = [
        QuoteRequestItem(symbol=h["symbol"], market=h["market"])
        for h in holdings
        if h.get("symbol") and h.get("market") in {"US", "IN"}
    ]
    # Also quote screener ETF candidates lightly when we have holdings
    for symbol, market in (("VTI", "US"), ("NIFTYBEES", "IN")):
        if not any(i.symbol == symbol and i.market == market for i in quote_items):
            quote_items.append(QuoteRequestItem(symbol=symbol, market=market))

    quotes_payload: list[dict[str, Any]] = []
    if quote_items:
        try:
            quotes_resp = get_quote_service().get_quotes(
                quote_items,
                force_refresh=force_refresh_quotes,
            )
            quotes_payload = [q.model_dump(mode="json") for q in quotes_resp.quotes]
        except Exception:  # noqa: BLE001 — coach can still run without live quotes
            quotes_payload = []

    graph = get_compiled_graph()
    final = graph.invoke(
        {
            "user_id": user_id,
            "portfolio": portfolio,
            "quotes": quotes_payload,
            "reasoning_trail": [],
            "errors": [],
        }
    )

    recommendation = final.get("recommendation") or {}
    trail_raw = final.get("reasoning_trail") or []
    trail = [
        ReasoningStep(
            node=step.get("node", "unknown"),
            summary=step.get("summary", ""),
            detail=step.get("detail") or {},
        )
        for step in trail_raw
    ]
    model = final.get("model") or "deterministic"
    snapshot = {
        "goals_text": portfolio.get("goals_text"),
        "risk_score": portfolio.get("risk_score"),
        "cash_usd": portfolio.get("cash_usd"),
        "cash_inr": portfolio.get("cash_inr"),
        "monthly_deploy_usd": portfolio.get("monthly_deploy_usd"),
        "monthly_deploy_inr": portfolio.get("monthly_deploy_inr"),
        "holdings": holdings,
        "quotes": quotes_payload,
    }

    run_id = None
    if user_id != "seed":
        try:
            run_id = persist_coach_run(
                user_id=user_id,
                status="completed",
                model=model,
                recommendation=recommendation,
                reasoning_trail=[step.model_dump() for step in trail],
                portfolio_snapshot=snapshot,
            )
        except Exception:  # noqa: BLE001
            run_id = None

    return CoachRunResponse(
        run_id=run_id,
        model=model,
        recommendation=recommendation,
        reasoning_trail=trail,
        portfolio_snapshot=snapshot,
        langsmith_enabled=langsmith_enabled,
    )
