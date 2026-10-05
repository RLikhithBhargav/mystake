"""Normalize MyStake holdings symbols to provider tickers."""

from __future__ import annotations


def normalize_symbol(symbol: str, market: str) -> str:
    sym = symbol.strip().upper()
    if market == "IN":
        for suffix in (".NS", ".BO"):
            if sym.endswith(suffix):
                sym = sym[: -len(suffix)]
                break
    return sym


def yahoo_ticker(symbol: str, market: str) -> str:
    sym = normalize_symbol(symbol, market)
    if market == "IN":
        return f"{sym}.NS"
    return sym


def default_currency(market: str) -> str:
    return "INR" if market == "IN" else "USD"
