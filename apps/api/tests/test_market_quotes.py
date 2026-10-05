from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.main import app
from app.market.adapters import LiveQuote
from app.market.cache import MemoryQuoteCache
from app.market.deps import get_quote_service
from app.market.schemas import QuoteRequestItem
from app.market.service import QuoteService

client = TestClient(app)


def _live(symbol: str, market: str, price: float) -> LiveQuote:
    return LiveQuote(
        symbol=symbol,
        market=market,
        currency="USD" if market == "US" else "INR",
        price=price,
        previous_close=price - 1,
        as_of=datetime.now(UTC),
        source="mock",
        raw={},
    )


def test_quote_service_second_call_is_cache_hit() -> None:
    cache = MemoryQuoteCache()
    calls: list[tuple[str, str]] = []

    def fetcher(symbol: str, market: str, **_kwargs: object) -> LiveQuote:
        calls.append((symbol, market))
        return _live(symbol, market, 100.0 + len(calls))

    service = QuoteService(cache, ttl_seconds=600, fetcher=fetcher)
    items = [QuoteRequestItem(symbol="AAPL", market="US")]

    first = service.get_quotes(items)
    second = service.get_quotes(items)

    assert first.fetched == 1
    assert first.cache_hits == 0
    assert second.fetched == 0
    assert second.cache_hits == 1
    assert second.quotes[0].cache_hit is True
    assert second.quotes[0].price == first.quotes[0].price
    assert len(calls) == 1  # refresh spam does not re-hit the adapter


def test_quote_service_expired_cache_refetches() -> None:
    cache = MemoryQuoteCache()
    calls = {"n": 0}

    def fetcher(symbol: str, market: str, **_kwargs: object) -> LiveQuote:
        calls["n"] += 1
        return _live(symbol, market, float(calls["n"]))

    service = QuoteService(cache, ttl_seconds=600, fetcher=fetcher)
    items = [QuoteRequestItem(symbol="MSFT", market="US")]
    service.get_quotes(items)

    # Expire the cached row
    cached = cache.get("MSFT", "US")
    assert cached is not None
    cached.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    cache.put(cached)

    again = service.get_quotes(items)
    assert again.fetched == 1
    assert again.cache_hits == 0
    assert calls["n"] == 2


def test_quote_service_force_refresh_bypasses_cache() -> None:
    cache = MemoryQuoteCache()
    calls = {"n": 0}

    def fetcher(symbol: str, market: str, **_kwargs: object) -> LiveQuote:
        calls["n"] += 1
        return _live(symbol, market, float(calls["n"]))

    service = QuoteService(cache, ttl_seconds=600, fetcher=fetcher)
    items = [QuoteRequestItem(symbol="INFY", market="IN")]
    service.get_quotes(items)
    forced = service.get_quotes(items, force_refresh=True)
    assert forced.fetched == 1
    assert forced.cache_hits == 0
    assert calls["n"] == 2


def test_market_quotes_endpoint_uses_injected_service() -> None:
    cache = MemoryQuoteCache()
    fetcher = MagicMock(side_effect=lambda symbol, market, **_: _live(symbol, market, 42.0))
    service = QuoteService(cache, ttl_seconds=600, fetcher=fetcher)

    app.dependency_overrides.clear()
    # Bypass lru_cached factory by patching on the module used by the route
    import app.main as main_mod

    original = main_mod.get_quote_service
    main_mod.get_quote_service = lambda: service
    try:
        response = client.post(
            "/market/quotes",
            json={"symbols": [{"symbol": "AAPL", "market": "US"}]},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["fetched"] == 1
        assert body["quotes"][0]["price"] == 42.0

        response2 = client.post(
            "/market/quotes",
            json={"symbols": [{"symbol": "AAPL", "market": "US"}]},
        )
        body2 = response2.json()
        assert body2["cache_hits"] == 1
        assert body2["fetched"] == 0
        assert fetcher.call_count == 1
    finally:
        main_mod.get_quote_service = original
        get_quote_service.cache_clear()
