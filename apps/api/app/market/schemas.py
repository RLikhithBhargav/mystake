from datetime import datetime

from pydantic import BaseModel, Field


class QuoteRequestItem(BaseModel):
    symbol: str = Field(..., min_length=1)
    market: str = Field(..., pattern="^(US|IN)$")


class QuotesRequest(BaseModel):
    symbols: list[QuoteRequestItem] = Field(..., min_length=1, max_length=50)
    force_refresh: bool = False


class QuoteResult(BaseModel):
    symbol: str
    market: str
    currency: str
    price: float
    previous_close: float | None = None
    as_of: datetime | None = None
    source: str
    cache_hit: bool
    fetched_at: datetime
    expires_at: datetime


class QuotesResponse(BaseModel):
    quotes: list[QuoteResult]
    cache_hits: int
    fetched: int
