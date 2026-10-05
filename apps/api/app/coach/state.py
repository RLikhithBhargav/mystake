"""Shared LangGraph state for a coach run."""

from __future__ import annotations

import operator
from typing import Annotated, Any, TypedDict


def _merge_dicts(left: dict[str, Any] | None, right: dict[str, Any] | None) -> dict[str, Any]:
    out = dict(left or {})
    out.update(right or {})
    return out


class CoachState(TypedDict, total=False):
    user_id: str
    portfolio: dict[str, Any]
    quotes: list[dict[str, Any]]
    analysis: dict[str, Any]
    screen: dict[str, Any]
    risk: dict[str, Any]
    recommendation: dict[str, Any]
    # Append-only reasoning trail across nodes
    reasoning_trail: Annotated[list[dict[str, Any]], operator.add]
    model: str
    errors: Annotated[list[str], operator.add]
