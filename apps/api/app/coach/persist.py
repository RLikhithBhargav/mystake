"""Persist coach runs to Supabase."""

from __future__ import annotations

from typing import Any

import httpx

from app.config import settings


def persist_coach_run(
    *,
    user_id: str,
    status: str,
    model: str | None,
    recommendation: dict[str, Any],
    reasoning_trail: list[dict[str, Any]],
    portfolio_snapshot: dict[str, Any],
    error: str | None = None,
) -> str | None:
    """Insert a coach_runs row. Returns id or None if Supabase is not configured."""
    if not settings.supabase_configured:
        return None
    base = settings.supabase_url.rstrip("/") + "/rest/v1"
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    payload = {
        "user_id": user_id,
        "status": status,
        "model": model,
        "recommendation": recommendation,
        "reasoning_trail": reasoning_trail,
        "portfolio_snapshot": portfolio_snapshot,
        "error": error,
    }
    with httpx.Client(timeout=20.0) as client:
        response = client.post(f"{base}/coach_runs", headers=headers, json=payload)
        response.raise_for_status()
        rows = response.json()
    if rows:
        return rows[0].get("id")
    return None
