from typing import Any

from pydantic import BaseModel, Field


class CoachRunRequest(BaseModel):
    force_refresh_quotes: bool = False
    # Dev/test only — ignored unless COACH_ALLOW_SEED_PORTFOLIO=true
    use_seed_portfolio: bool = False


class ReasoningStep(BaseModel):
    node: str
    summary: str
    detail: dict[str, Any] = Field(default_factory=dict)


class CoachRunResponse(BaseModel):
    run_id: str | None = None
    model: str
    recommendation: dict[str, Any]
    reasoning_trail: list[ReasoningStep]
    portfolio_snapshot: dict[str, Any]
    langsmith_enabled: bool = False
