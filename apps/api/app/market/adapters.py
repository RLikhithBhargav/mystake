"""Cheap market data adapters (Yahoo primary; optional Alpha Vantage for US)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import httpx

from app.market.symbols import default_currency, yahoo_ticker


@dataclass
class LiveQuote:
    symbol: str
    market: str
    currency: str
    price: float
    previous_close: float | None
    as_of: datetime | None
    source: str
    raw: dict[str, Any]


class MarketDataError(Exception):
    pass


def fetch_yahoo_quote(symbol: str, market: str, client: httpx.Client | None = None) -> LiveQuote:
    ticker = yahoo_ticker(symbol, market)
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
    params = {"interval": "1d", "range": "5d"}
    headers = {"User-Agent": "Mozilla/5.0 (compatible; MyStake/0.1; +https://localhost)"}

    owns_client = client is None
    client = client or httpx.Client(timeout=20.0)
    try:
        response = client.get(url, params=params, headers=headers)
        response.raise_for_status()
        payload = response.json()
    finally:
        if owns_client:
            client.close()

    try:
        result = payload["chart"]["result"][0]
        meta = result["meta"]
        price = meta.get("regularMarketPrice")
        if price is None:
            closes = result["indicators"]["quote"][0].get("close") or []
            closes = [c for c in closes if c is not None]
            if not closes:
                raise MarketDataError(f"No price for {ticker}")
            price = closes[-1]
        previous = meta.get("chartPreviousClose") or meta.get("previousClose")
        currency = (meta.get("currency") or default_currency(market)).upper()
        if currency not in {"USD", "INR"}:
            currency = default_currency(market)
        as_of_ts = meta.get("regularMarketTime")
        as_of = datetime.fromtimestamp(as_of_ts, tz=UTC) if as_of_ts else datetime.now(UTC)
        return LiveQuote(
            symbol=symbol,
            market=market,
            currency=currency,
            price=float(price),
            previous_close=float(previous) if previous is not None else None,
            as_of=as_of,
            source="yahoo",
            raw={"ticker": ticker, "meta": meta},
        )
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise MarketDataError(f"Unexpected Yahoo payload for {ticker}: {exc}") from exc


def fetch_alpha_vantage_quote(
    symbol: str,
    api_key: str,
    client: httpx.Client | None = None,
) -> LiveQuote:
    """US-only optional adapter when ALPHA_VANTAGE_API_KEY is set."""
    url = "https://www.alphavantage.co/query"
    params = {
        "function": "GLOBAL_QUOTE",
        "symbol": symbol,
        "apikey": api_key,
    }
    owns_client = client is None
    client = client or httpx.Client(timeout=20.0)
    try:
        response = client.get(url, params=params)
        response.raise_for_status()
        payload = response.json()
    finally:
        if owns_client:
            client.close()

    quote = payload.get("Global Quote") or {}
    price_raw = quote.get("05. price")
    if not price_raw:
        raise MarketDataError(f"Alpha Vantage returned no price for {symbol}")
    previous_raw = quote.get("08. previous close")
    return LiveQuote(
        symbol=symbol,
        market="US",
        currency="USD",
        price=float(price_raw),
        previous_close=float(previous_raw) if previous_raw else None,
        as_of=datetime.now(UTC),
        source="alpha_vantage",
        raw=quote,
    )


def fetch_live_quote(
    symbol: str,
    market: str,
    *,
    alpha_vantage_key: str | None = None,
    client: httpx.Client | None = None,
) -> LiveQuote:
    if market == "US" and alpha_vantage_key:
        try:
            return fetch_alpha_vantage_quote(symbol, alpha_vantage_key, client=client)
        except (MarketDataError, httpx.HTTPError):
            # Fall through to Yahoo
            pass
    return fetch_yahoo_quote(symbol, market, client=client)
