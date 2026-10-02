from fastapi.testclient import TestClient

from app.main import app
from app.portfolio.csv_normalize import normalize_csv

client = TestClient(app)


def test_normalize_us_and_india_rows() -> None:
    csv_text = """symbol,quantity,market,currency,name,avg_cost
AAPL,10,US,USD,Apple,150
RELIANCE,5,IN,INR,Reliance,2500
"""
    result = normalize_csv(csv_text)
    assert result["row_count"] == 2
    assert result["errors"] == []
    by_symbol = {h["symbol"]: h for h in result["holdings"]}
    assert by_symbol["AAPL"]["currency"] == "USD"
    assert by_symbol["RELIANCE"]["market"] == "IN"
    assert by_symbol["RELIANCE"]["currency"] == "INR"


def test_normalize_infers_india_from_ns_suffix() -> None:
    csv_text = """ticker,qty
INFY.NS,12
"""
    result = normalize_csv(csv_text)
    assert result["row_count"] == 1
    holding = result["holdings"][0]
    assert holding["symbol"] == "INFY"
    assert holding["market"] == "IN"
    assert holding["currency"] == "INR"


def test_normalize_endpoint() -> None:
    response = client.post(
        "/portfolio/csv/normalize",
        json={"csv_text": "symbol,quantity\nMSFT,3\n"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["row_count"] == 1
    assert body["holdings"][0]["symbol"] == "MSFT"
    assert body["holdings"][0]["currency"] == "USD"
