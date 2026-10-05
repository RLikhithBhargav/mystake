from fastapi.testclient import TestClient

from app.auth.supabase_auth import AuthUser
from app.coach.portfolio_loader import SEED_PORTFOLIO
from app.coach.service import run_coach_for_user
from app.main import app, require_user

client = TestClient(app)


def test_run_coach_seeded_portfolio_returns_recommendation_and_trail() -> None:
    result = run_coach_for_user(
        "00000000-0000-0000-0000-000000000001",
        portfolio_override=SEED_PORTFOLIO,
    )
    assert result.recommendation.get("symbol")
    assert result.recommendation.get("action") in {"buy", "hold", "watch"}
    assert len(result.reasoning_trail) >= 4
    nodes = [step.node for step in result.reasoning_trail]
    assert nodes == [
        "portfolio_analyst",
        "market_screener",
        "risk_sizing",
        "debate_synthesis",
    ]
    assert "thesis" in result.recommendation
    assert result.model


def test_coach_run_requires_auth() -> None:
    response = client.post("/coach/run", json={})
    assert response.status_code == 401


def test_coach_run_endpoint_authenticated() -> None:
    app.dependency_overrides[require_user] = lambda: AuthUser(id="user-1", email="a@b.com")
    try:
        # Patch load path by overriding service via monkeypatch on portfolio load
        from unittest.mock import patch

        with patch(
            "app.coach.service.load_portfolio",
            return_value={**SEED_PORTFOLIO, "user_id": "user-1"},
        ):
            with patch("app.coach.service.persist_coach_run", return_value="run-123"):
                with patch("app.coach.service.get_quote_service") as qs:
                    qs.return_value.get_quotes.return_value.quotes = []
                    # Skip live quotes in this unit test
                    qs.return_value.get_quotes.side_effect = RuntimeError("skip quotes")
                    response = client.post("/coach/run", json={})
        assert response.status_code == 200
        body = response.json()
        assert body["recommendation"]["symbol"]
        assert len(body["reasoning_trail"]) >= 4
        assert body["run_id"] == "run-123"
    finally:
        app.dependency_overrides.clear()
