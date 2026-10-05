"""OpenAI primary → OpenRouter fallback, with deterministic offline mode."""

from __future__ import annotations

import json
import re
from typing import Any

from app.config import settings


def llm_available() -> bool:
    return bool(settings.openai_api_key.strip() or settings.openrouter_api_key.strip())


def chat_json(system: str, user: str, *, purpose: str = "coach") -> tuple[dict[str, Any], str]:
    """Return (parsed_json, model_name). Raises RuntimeError if no keys / both fail."""
    last_error: Exception | None = None

    if settings.openai_api_key.strip():
        try:
            return _openai_compatible(
                base_url="https://api.openai.com/v1",
                api_key=settings.openai_api_key.strip(),
                model=settings.openai_model,
                system=system,
                user=user,
            ), settings.openai_model
        except Exception as exc:  # noqa: BLE001 — fall through to OpenRouter
            last_error = exc

    if settings.openrouter_api_key.strip():
        try:
            return _openai_compatible(
                base_url="https://openrouter.ai/api/v1",
                api_key=settings.openrouter_api_key.strip(),
                model=settings.openrouter_model,
                system=system,
                user=user,
            ), settings.openrouter_model
        except Exception as exc:  # noqa: BLE001
            last_error = exc

    raise RuntimeError(f"LLM unavailable for {purpose}: {last_error}")


def _openai_compatible(
    *,
    base_url: str,
    api_key: str,
    model: str,
    system: str,
    user: str,
) -> dict[str, Any]:
    from langchain_core.messages import HumanMessage, SystemMessage
    from langchain_openai import ChatOpenAI

    llm = ChatOpenAI(
        model=model,
        api_key=api_key,
        base_url=base_url,
        temperature=0.2,
        timeout=60,
        max_retries=1,
    )
    response = llm.invoke(
        [
            SystemMessage(content=system + "\nRespond with valid JSON only."),
            HumanMessage(content=user),
        ]
    )
    content = response.content if isinstance(response.content, str) else str(response.content)
    return _extract_json(content)


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        raise ValueError("Model response was not JSON")
    data = json.loads(match.group(0))
    if not isinstance(data, dict):
        raise ValueError("JSON payload was not an object")
    return data
