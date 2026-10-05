"""Resolve the caller from a Supabase access token."""

from __future__ import annotations

from dataclasses import dataclass

import httpx
from fastapi import Header, HTTPException

from app.config import settings


@dataclass
class AuthUser:
    id: str
    email: str | None


def get_user_from_token(access_token: str) -> AuthUser:
    if not settings.supabase_url.strip():
        raise HTTPException(status_code=503, detail="SUPABASE_URL is not configured on the API")
    url = settings.supabase_url.rstrip("/") + "/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "apikey": settings.supabase_anon_key.strip()
        or settings.supabase_service_role_key.strip(),
    }
    if not headers["apikey"]:
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY required for auth",
        )
    with httpx.Client(timeout=15.0) as client:
        response = client.get(url, headers=headers)
    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    if response.status_code >= 400:
        raise HTTPException(status_code=401, detail="Could not validate session")
    payload = response.json()
    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user payload")
    return AuthUser(id=user_id, email=payload.get("email"))


def require_user(authorization: str | None = Header(default=None)) -> AuthUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    return get_user_from_token(token)
