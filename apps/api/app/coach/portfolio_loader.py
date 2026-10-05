"""Load portfolio profile + holdings from Supabase (service role)."""

from __future__ import annotations

from typing import Any

import httpx
from fastapi import HTTPException

from app.config import settings


def load_portfolio(user_id: str) -> dict[str, Any]:
    if not settings.supabase_configured:
        raise HTTPException(
            status_code=503,
            detail="Supabase service role is required to load portfolio for coach runs",
        )
    base = settings.supabase_url.rstrip("/") + "/rest/v1"
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
    }
    with httpx.Client(timeout=20.0) as client:
        profile_resp = client.get(
            f"{base}/portfolio_profiles",
            headers=headers,
            params={"select": "*", "user_id": f"eq.{user_id}", "limit": "1"},
        )
        profile_resp.raise_for_status()
        profiles = profile_resp.json()
        if not profiles:
            raise HTTPException(
                status_code=400,
                detail="Complete onboarding before running the coach",
            )
        profile = profiles[0]

        holdings_resp = client.get(
            f"{base}/holdings",
            headers=headers,
            params={
                "select": "symbol,name,market,currency,quantity,avg_cost,notes",
                "user_id": f"eq.{user_id}",
                "order": "currency.asc,symbol.asc",
            },
        )
        holdings_resp.raise_for_status()
        holdings = holdings_resp.json()

    return {
        "user_id": user_id,
        "goals_text": profile.get("goals_text") or "",
        "risk_score": profile.get("risk_score"),
        "risk_answers": profile.get("risk_answers") or {},
        "net_worth_usd": float(profile.get("net_worth_usd") or 0),
        "net_worth_inr": float(profile.get("net_worth_inr") or 0),
        "cash_usd": float(profile.get("cash_usd") or 0),
        "cash_inr": float(profile.get("cash_inr") or 0),
        "monthly_deploy_usd": float(profile.get("monthly_deploy_usd") or 0),
        "monthly_deploy_inr": float(profile.get("monthly_deploy_inr") or 0),
        "holdings": holdings,
    }


SEED_PORTFOLIO: dict[str, Any] = {
    "user_id": "seed",
    "goals_text": "Grow US equities; keep INR side diversified and steadier.",
    "risk_score": 3,
    "risk_answers": {},
    "net_worth_usd": 50000,
    "net_worth_inr": 2000000,
    "cash_usd": 5000,
    "cash_inr": 200000,
    "monthly_deploy_usd": 1000,
    "monthly_deploy_inr": 25000,
    "holdings": [
        {
            "symbol": "AAPL",
            "name": "Apple",
            "market": "US",
            "currency": "USD",
            "quantity": 10,
            "avg_cost": 180,
        },
        {
            "symbol": "MSFT",
            "name": "Microsoft",
            "market": "US",
            "currency": "USD",
            "quantity": 5,
            "avg_cost": 400,
        },
        {
            "symbol": "RELIANCE",
            "name": "Reliance",
            "market": "IN",
            "currency": "INR",
            "quantity": 15,
            "avg_cost": 2800,
        },
    ],
}
