from pydantic import BaseModel, Field


class CsvNormalizeRequest(BaseModel):
    csv_text: str = Field(..., min_length=1)


class NormalizedHolding(BaseModel):
    symbol: str
    name: str | None = None
    market: str
    currency: str
    quantity: float
    avg_cost: float | None = None


class CsvNormalizeResponse(BaseModel):
    holdings: list[NormalizedHolding]
    errors: list[str]
    row_count: int
