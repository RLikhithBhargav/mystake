"""Cache-aware quote service."""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import httpx

from app.market.adapters import LiveQuote, fetch_live_quote
from app.market.cache import CachedQuote, MemoryQuoteCache, QuoteCache
from app.market.schemas import QuoteRequestItem, QuoteResult, QuotesResponse
from app.market.symbols import normalize_symbol

Fetcher = Callable[..., LiveQuote]


class QuoteService:
    def __init__(
        self,
        cache: QuoteCache,
        *,
        ttl_seconds: int = 600,
        alpha_vantage_key: str | None = None,
        fetcher: Fetcher | None = None,
        http_client: httpx.Client | None = None,
    ) -> None:
        self.cache = cache
        self.ttl_seconds = ttl_seconds
        self.alpha_vantage_key = alpha_vantage_key
        self.fetcher = fetcher or fetch_live_quote
        self.http_client = http_client

    def get_quotes(
        self,
        items: list[QuoteRequestItem],
        *,
        force_refresh: bool = False,
    ) -> QuotesResponse:
        now = datetime.now(UTC)
        results: list[QuoteResult] = []
        cache_hits = 0
        fetched = 0

        # Dedupe while preserving order
        seen: set[tuple[str, str]] = set()
        ordered: list[tuple[str, str]] = []
        for item in items:
            key = (normalize_symbol(item.symbol, item.market), item.market)
            if key in seen:
                continue
            seen.add(key)
            ordered.append(key)

        for symbol, market in ordered:
            if not force_refresh:
                cached = self.cache.get(symbol, market)
                if cached and cached.is_fresh(now):
                    cache_hits += 1
                    results.append(_cached_to_result(cached, cache_hit=True))
                    continue

            live = self.fetcher(
                symbol,
                market,
                alpha_vantage_key=self.alpha_vantage_key,
                client=self.http_client,
            )
            cached = _live_to_cached(live, now=now, ttl_seconds=self.ttl_seconds)
            self.cache.put(cached)
            fetched += 1
            results.append(_cached_to_result(cached, cache_hit=False))

        return QuotesResponse(quotes=results, cache_hits=cache_hits, fetched=fetched)


def _live_to_cached(live: LiveQuote, *, now: datetime, ttl_seconds: int) -> CachedQuote:
    return CachedQuote(
        symbol=normalize_symbol(live.symbol, live.market),
        market=live.market,
        currency=live.currency,
        price=live.price,
        previous_close=live.previous_close,
        as_of=live.as_of,
        source=live.source,
        fetched_at=now,
        expires_at=now + timedelta(seconds=ttl_seconds),
        raw=live.raw,
    )


def _cached_to_result(cached: CachedQuote, *, cache_hit: bool) -> QuoteResult:
    return QuoteResult(
        symbol=cached.symbol,
        market=cached.market,
        currency=cached.currency,
        price=cached.price,
        previous_close=cached.previous_close,
        as_of=cached.as_of,
        source=cached.source,
        cache_hit=cache_hit,
        fetched_at=cached.fetched_at,
        expires_at=cached.expires_at,
    )


# Process-wide memory cache used when Supabase is not configured.
memory_quote_cache = MemoryQuoteCache()
