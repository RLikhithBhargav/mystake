"""Normalize brokerage-like CSV text into holding rows (US/IN, USD/INR)."""

from __future__ import annotations

import csv
import io
import re
from typing import Any

SYMBOL_KEYS = ("symbol", "ticker", "sym", "scrip", "nse_symbol", "security")
QTY_KEYS = ("quantity", "qty", "shares", "units", "quantity_available")
NAME_KEYS = ("name", "security_name", "company", "description", "instrument")
COST_KEYS = ("avg_cost", "average_cost", "avg_price", "average_price", "cost_basis", "price")
MARKET_KEYS = ("market", "exchange", "country", "region")
CURRENCY_KEYS = ("currency", "ccy", "curr")


def _norm_header(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def _pick(row: dict[str, str], keys: tuple[str, ...]) -> str | None:
    for key in keys:
        if key in row and row[key].strip():
            return row[key].strip()
    return None


def _parse_number(raw: str | None) -> float | None:
    if raw is None:
        return None
    cleaned = raw.strip().replace(",", "")
    if not cleaned:
        return None
    # Strip leading currency symbols / codes
    cleaned = re.sub(r"^(usd|inr|rs\.?|₹|\$)\s*", "", cleaned, flags=re.I)
    try:
        return float(cleaned)
    except ValueError:
        return None


def _infer_market_currency(
    symbol: str,
    market_raw: str | None,
    currency_raw: str | None,
) -> tuple[str, str]:
    market = (market_raw or "").strip().upper()
    currency = (currency_raw or "").strip().upper()

    if market in {"US", "NYSE", "NASDAQ", "AMEX"}:
        market = "US"
    elif market in {"IN", "INDIA", "NSE", "BSE"}:
        market = "IN"

    if currency in {"USD", "INR"}:
        pass
    elif currency in {"$", "US$"}:
        currency = "USD"
    elif currency in {"RS", "RS.", "₹", "INR."}:
        currency = "INR"
    else:
        currency = ""

    # Heuristics when market/currency omitted
    if not market:
        if symbol.upper().endswith(".NS") or symbol.upper().endswith(".BO"):
            market = "IN"
        elif currency == "INR":
            market = "IN"
        else:
            market = "US"

    if not currency:
        currency = "INR" if market == "IN" else "USD"

    if market not in {"US", "IN"}:
        market = "IN" if currency == "INR" else "US"
    if currency not in {"USD", "INR"}:
        currency = "INR" if market == "IN" else "USD"

    return market, currency


def _clean_symbol(symbol: str, market: str) -> str:
    sym = symbol.strip().upper()
    if market == "IN":
        sym = re.sub(r"\.(NS|BO)$", "", sym)
    return sym


def normalize_csv(csv_text: str) -> dict[str, Any]:
    """Parse CSV text into normalized holdings + row errors."""
    text = csv_text.strip()
    if not text:
        return {"holdings": [], "errors": ["CSV is empty."], "row_count": 0}

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        return {"holdings": [], "errors": ["CSV has no header row."], "row_count": 0}

    # Normalize headers
    field_map = {_norm_header(h): h for h in reader.fieldnames if h}
    holdings: list[dict[str, Any]] = []
    errors: list[str] = []
    seen: set[tuple[str, str]] = set()

    for index, raw in enumerate(reader, start=2):  # header is line 1
        row = {_norm_header(k): (v or "").strip() for k, v in raw.items() if k}
        # Also allow access by normalized keys only
        _ = field_map

        symbol = _pick(row, SYMBOL_KEYS)
        qty_raw = _pick(row, QTY_KEYS)
        if not symbol:
            errors.append(f"Row {index}: missing symbol/ticker.")
            continue
        quantity = _parse_number(qty_raw)
        if quantity is None:
            errors.append(f"Row {index}: missing or invalid quantity for {symbol}.")
            continue
        if quantity < 0:
            errors.append(f"Row {index}: quantity cannot be negative for {symbol}.")
            continue

        market, currency = _infer_market_currency(
            symbol,
            _pick(row, MARKET_KEYS),
            _pick(row, CURRENCY_KEYS),
        )
        symbol = _clean_symbol(symbol, market)
        key = (symbol, market)
        if key in seen:
            errors.append(f"Row {index}: duplicate {symbol} ({market}) — skipped.")
            continue
        seen.add(key)

        name = _pick(row, NAME_KEYS)
        avg_cost = _parse_number(_pick(row, COST_KEYS))

        holdings.append(
            {
                "symbol": symbol,
                "name": name,
                "market": market,
                "currency": currency,
                "quantity": quantity,
                "avg_cost": avg_cost,
            }
        )

    if not holdings and not errors:
        errors.append("No data rows found.")

    return {"holdings": holdings, "errors": errors, "row_count": len(holdings)}
