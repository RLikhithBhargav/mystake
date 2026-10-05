"""LangGraph node implementations (deterministic core + optional LLM enrichment)."""

from __future__ import annotations

from typing import Any

from app.coach.llm import chat_json, llm_available
from app.coach.state import CoachState


def portfolio_analyst(state: CoachState) -> dict[str, Any]:
    portfolio = state.get("portfolio") or {}
    holdings = portfolio.get("holdings") or []
    by_currency: dict[str, list[dict[str, Any]]] = {"USD": [], "INR": []}
    for h in holdings:
        by_currency.setdefault(h.get("currency") or "USD", []).append(h)

    def _concentration(rows: list[dict[str, Any]]) -> dict[str, Any]:
        if not rows:
            return {"count": 0, "top_weight": 0.0, "top_symbol": None, "herfindahl": 0.0}
        # Weight by qty * avg_cost when available, else equal weight
        weights: list[tuple[str, float]] = []
        for row in rows:
            qty = float(row.get("quantity") or 0)
            cost = row.get("avg_cost")
            w = qty * float(cost) if cost is not None else qty
            weights.append((row.get("symbol") or "?", max(w, 0.0)))
        total = sum(w for _, w in weights) or 1.0
        shares = [(sym, w / total) for sym, w in weights]
        shares.sort(key=lambda x: x[1], reverse=True)
        hhi = sum(s * s for _, s in shares)
        top_sym, top_w = shares[0]
        return {
            "count": len(rows),
            "top_weight": round(top_w, 4),
            "top_symbol": top_sym,
            "herfindahl": round(hhi, 4),
            "symbols": [s for s, _ in shares],
        }

    usd = _concentration(by_currency.get("USD") or [])
    inr = _concentration(by_currency.get("INR") or [])
    gaps: list[str] = []
    if usd["count"] == 0:
        gaps.append("No US (USD) holdings yet.")
    if inr["count"] == 0:
        gaps.append("No India (INR) holdings yet.")
    if usd["top_weight"] and usd["top_weight"] >= 0.45:
        gaps.append(f"US book concentrated in {usd['top_symbol']} ({usd['top_weight']:.0%}).")
    if inr["top_weight"] and inr["top_weight"] >= 0.45:
        gaps.append(f"INR book concentrated in {inr['top_symbol']} ({inr['top_weight']:.0%}).")

    analysis = {
        "usd": usd,
        "inr": inr,
        "gaps": gaps,
        "goals": portfolio.get("goals_text") or "",
        "risk_score": portfolio.get("risk_score"),
    }
    summary = (
        f"Portfolio analyst: {usd['count']} USD / {inr['count']} INR names. "
        f"Gaps: {'; '.join(gaps) if gaps else 'none flagged'}."
    )
    return {
        "analysis": analysis,
        "reasoning_trail": [{"node": "portfolio_analyst", "summary": summary, "detail": analysis}],
    }


def market_screener(state: CoachState) -> dict[str, Any]:
    portfolio = state.get("portfolio") or {}
    holdings = portfolio.get("holdings") or []
    held = {((h.get("symbol") or "").upper(), h.get("market")) for h in holdings}
    quotes = {
        ((q.get("symbol") or "").upper(), q.get("market")): q
        for q in state.get("quotes") or []
    }

    # Cheap static candidate universe (not a paid screener) + prefer names with quotes
    universe = [
        {"symbol": "VTI", "market": "US", "thesis": "Broad US equity exposure"},
        {
            "symbol": "VXUS",
            "market": "US",
            "thesis": "International diversification outside US single names",
        },
        {"symbol": "QQQ", "market": "US", "thesis": "Growth-leaning US tech beta"},
        {"symbol": "NIFTYBEES", "market": "IN", "thesis": "India large-cap index proxy"},
        {"symbol": "ITBEES", "market": "IN", "thesis": "India IT sector diversifier"},
        {"symbol": "GOLDBEES", "market": "IN", "thesis": "INR gold ballast"},
    ]
    candidates: list[dict[str, Any]] = []
    for item in universe:
        key = (item["symbol"], item["market"])
        if key in held:
            continue
        q = quotes.get(key)
        candidates.append(
            {
                **item,
                "currency": "USD" if item["market"] == "US" else "INR",
                "price": q.get("price") if q else None,
            }
        )

    # Prefer filling the thinner book
    analysis = state.get("analysis") or {}
    prefer = "US" if (analysis.get("usd") or {}).get("count", 0) <= (analysis.get("inr") or {}).get(
        "count", 0
    ) else "IN"
    candidates.sort(key=lambda c: (0 if c["market"] == prefer else 1, c["symbol"]))

    screen = {"prefer_market": prefer, "candidates": candidates[:5]}
    summary = (
        f"Market screener: prefer {prefer}; top ideas "
        f"{', '.join(c['symbol'] for c in screen['candidates']) or 'none'}."
    )
    return {
        "screen": screen,
        "reasoning_trail": [{"node": "market_screener", "summary": summary, "detail": screen}],
    }


def risk_sizing(state: CoachState) -> dict[str, Any]:
    portfolio = state.get("portfolio") or {}
    risk_score = int(portfolio.get("risk_score") or 3)
    # Map 1–5 risk to max % of monthly deploy / cash sleeve
    risk_fraction = {1: 0.10, 2: 0.15, 3: 0.25, 4: 0.35, 5: 0.45}.get(risk_score, 0.25)
    screen = state.get("screen") or {}
    prefer = screen.get("prefer_market") or "US"
    if prefer == "US":
        deploy = float(portfolio.get("monthly_deploy_usd") or 0)
        cash = float(portfolio.get("cash_usd") or 0)
    else:
        deploy = float(portfolio.get("monthly_deploy_inr") or 0)
        cash = float(portfolio.get("cash_inr") or 0)
    budget = max(deploy, 0.0)
    if budget <= 0:
        budget = max(cash * 0.1, 0.0)
    max_position = round(budget * risk_fraction, 2)
    currency = "USD" if prefer == "US" else "INR"

    candidates = screen.get("candidates") or []
    pick = next(
        (c for c in candidates if c.get("market") == prefer),
        candidates[0] if candidates else None,
    )
    shares = None
    if pick and pick.get("price"):
        shares = round(max_position / float(pick["price"]), 4) if pick["price"] else None

    risk = {
        "risk_score": risk_score,
        "risk_fraction": risk_fraction,
        "prefer_market": prefer,
        "currency": currency,
        "budget_basis": budget,
        "max_position_value": max_position,
        "suggested_symbol": pick.get("symbol") if pick else None,
        "suggested_shares": shares,
        "notes": [
            "USD and INR budgets are never mixed.",
            "Size is capped by risk score × monthly deploy (or 10% of cash if deploy is 0).",
        ],
    }
    summary = (
        f"Risk/sizing: score {risk_score}, max {currency} {max_position} "
        f"toward {risk.get('suggested_symbol') or 'n/a'}."
    )
    return {
        "risk": risk,
        "reasoning_trail": [{"node": "risk_sizing", "summary": summary, "detail": risk}],
    }


def debate_synthesis(state: CoachState) -> dict[str, Any]:
    analysis = state.get("analysis") or {}
    screen = state.get("screen") or {}
    risk = state.get("risk") or {}
    portfolio = state.get("portfolio") or {}

    growth_case = (
        f"Lean into {risk.get('suggested_symbol')} in {risk.get('prefer_market')} to address "
        f"gaps ({', '.join(analysis.get('gaps') or ['none'])}) while staying inside a "
        f"{risk.get('currency')} {risk.get('max_position_value')} size cap."
    )
    caution_case = (
        f"Risk score {risk.get('risk_score')} and concentration "
        f"(US top {((analysis.get('usd') or {}).get('top_weight') or 0):.0%}, "
        f"INR top {((analysis.get('inr') or {}).get('top_weight') or 0):.0%}) argue for patience; "
        "prefer liquid index/ETF-like ideas over adding to an already-large single name."
    )

    model_used = "deterministic"
    synthesis: dict[str, Any] | None = None
    if llm_available():
        try:
            synthesis, model_used = chat_json(
                system=(
                    "You are MyStake's synthesis coach. You do not place trades. "
                    "Return JSON keys: action (buy|hold|watch), symbol, market (US|IN), "
                    "currency (USD|INR), size_value, size_shares (number|null), thesis, "
                    "risks (array of strings), confidence (0-1)."
                ),
                user=(
                    f"Goals: {portfolio.get('goals_text')}\n"
                    f"Analysis: {analysis}\nScreen: {screen}\nRisk: {risk}\n"
                    f"Growth case: {growth_case}\nCaution case: {caution_case}"
                ),
                purpose="debate_synthesis",
            )
        except Exception as exc:  # noqa: BLE001
            synthesis = None
            err = f"LLM synthesis failed, using deterministic fallback: {exc}"
        else:
            err = None
    else:
        err = None

    if not synthesis:
        symbol = risk.get("suggested_symbol") or "VTI"
        market = risk.get("prefer_market") or "US"
        currency = risk.get("currency") or ("USD" if market == "US" else "INR")
        synthesis = {
            "action": "buy" if risk.get("max_position_value", 0) > 0 else "watch",
            "symbol": symbol,
            "market": market,
            "currency": currency,
            "size_value": risk.get("max_position_value") or 0,
            "size_shares": risk.get("suggested_shares"),
            "thesis": growth_case,
            "risks": [caution_case],
            "confidence": 0.55,
        }

    recommendation = {
        "action": synthesis.get("action") or "watch",
        "symbol": synthesis.get("symbol"),
        "market": synthesis.get("market"),
        "currency": synthesis.get("currency"),
        "size_value": synthesis.get("size_value"),
        "size_shares": synthesis.get("size_shares"),
        "thesis": synthesis.get("thesis") or growth_case,
        "risks": synthesis.get("risks") or [caution_case],
        "confidence": synthesis.get("confidence", 0.5),
        "disclaimer": (
            "Informational coaching only — not registered investment advice. "
            "You execute trades in your own broker."
        ),
    }
    trail_entry = {
        "node": "debate_synthesis",
        "summary": (
            f"Synthesis: {recommendation['action']} {recommendation['symbol']} "
            f"({recommendation['market']}) size {recommendation['currency']} "
            f"{recommendation['size_value']}."
        ),
        "detail": {
            "growth_case": growth_case,
            "caution_case": caution_case,
            "recommendation": recommendation,
            "model": model_used,
        },
    }
    out: dict[str, Any] = {
        "recommendation": recommendation,
        "model": model_used,
        "reasoning_trail": [trail_entry],
    }
    if err:
        out["errors"] = [err]
    return out
