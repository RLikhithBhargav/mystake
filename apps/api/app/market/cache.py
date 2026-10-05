"""Quote cache backends: in-memory (tests/dev) and Supabase Postgres."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Protocol

import httpx


@dataclass
class CachedQuote:
    symbol: str
    market: str
    currency: str
    price: float
    previous_close: float | None
    as_of: datetime | None
    source: str
    fetched_at: datetime
    expires_at: datetime
    raw: dict[str, Any]

    def is_fresh(self, now: datetime | None = None) -> bool:
        now = now or datetime.now(UTC)
        exp = self.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=UTC)
        return exp > now


class QuoteCache(Protocol):
    def get(self, symbol: str, market: str) -> CachedQuote | None: ...

    def put(self, quote: CachedQuote) -> None: ...


class MemoryQuoteCache:
    def __init__(self) -> None:
        self._store: dict[tuple[str, str], CachedQuote] = {}

    def get(self, symbol: str, market: str) -> CachedQuote | None:
        return self._store.get((symbol, market))

    def put(self, quote: CachedQuote) -> None:
        self._store[(quote.symbol, quote.market)] = quote

    def clear(self) -> None:
        self._store.clear()


class SupabaseQuoteCache:
    """Read/write `market_quotes` via PostgREST with the service role key."""

    def __init__(self, url: str, service_role_key: str) -> None:
        self._base = url.rstrip("/") + "/rest/v1"
        self._headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=representation",
        }

    def get(self, symbol: str, market: str) -> CachedQuote | None:
        with httpx.Client(timeout=15.0) as client:
            response = (
                client.get(
                    f"{self._base}/market_quotes",
                    headers=self._headers,
                    params={
                        "select": "*",
                        "symbol": f"eq.{symbol}",
                        "market": f"eq.{market}",
                        "limit": "1",
                    },
                )
            )
            response.raise_for_status()
            rows = response.json()
        if not rows:
            return None
        return _row_to_quote(rows[0])

    def put(self, quote: CachedQuote) -> None:
        payload = {
            "symbol": quote.symbol,
            "market": quote.market,
            "currency": quote.currency,
            "price": quote.price,
            "previous_close": quote.previous_close,
            "as_of": quote.as_of.isoformat() if quote.as_of else None,
            "source": quote.source,
            "fetched_at": quote.fetched_at.isoformat(),
            "expires_at": quote.expires_at.isoformat(),
            "raw": quote.raw,
        }
        with httpx.Client(timeout=15.0) as client:
            response = client.post(
                f"{self._base}/market_quotes",
                headers=self._headers,
                json=payload,
            )
            response.raise_for_status()


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt


def _row_to_quote(row: dict[str, Any]) -> CachedQuote:
    return CachedQuote(
        symbol=row["symbol"],
        market=row["market"],
        currency=row["currency"],
        price=float(row["price"]),
        previous_close=(
            float(row["previous_close"]) if row.get("previous_close") is not None else None
        ),
        as_of=_parse_dt(row.get("as_of")),
        source=row.get("source") or "unknown",
        fetched_at=_parse_dt(row["fetched_at"]) or datetime.now(UTC),
        expires_at=_parse_dt(row["expires_at"]) or datetime.now(UTC),
        raw=row.get("raw") or {},
    )
