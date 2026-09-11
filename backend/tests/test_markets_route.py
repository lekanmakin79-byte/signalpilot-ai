from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def make_market_quote(
    symbol: str = "EUR/USD",
    price: float = 1.16312,
):
    return {
        "symbol": symbol,
        "price": price,
        "change_percent": -0.0077,
        "direction": "FLAT",
        "timestamp": "2026-09-10T05:10:31.181554+00:00",
    }


def test_markets_returns_all_market_quotes():
    markets = [
        make_market_quote("EUR/USD", 1.16312),
        make_market_quote("GBP/USD", 1.35473),
        make_market_quote("USD/JPY", 153.67391),
        make_market_quote("XAU/USD", 4415.27204),
    ]

    with patch(
        "app.routes.markets.get_all_market_quotes",
        new=AsyncMock(return_value=markets),
    ) as mocked_quotes:
        response = client.get("/markets/")

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert body["markets"] == markets

    mocked_quotes.assert_awaited_once()


def test_markets_returns_empty_market_list():
    with patch(
        "app.routes.markets.get_all_market_quotes",
        new=AsyncMock(return_value=[]),
    ):
        response = client.get("/markets/")

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert body["markets"] == []


def test_market_returns_single_quote():
    market = make_market_quote(
        "EUR/USD",
        1.16312,
    )

    with patch(
        "app.routes.markets.get_market_quote",
        new=AsyncMock(return_value=market),
    ) as mocked_quote:
        response = client.get("/markets/EUR/USD")

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert body["market"] == market

    mocked_quote.assert_awaited_once_with(
        "EUR/USD"
    )


def test_market_passes_symbol_to_market_data_layer():
    market = make_market_quote(
        "GBP/USD",
        1.35473,
    )

    with patch(
        "app.routes.markets.get_market_quote",
        new=AsyncMock(return_value=market),
    ) as mocked_quote:
        response = client.get("/markets/GBP/USD")

    assert response.status_code == 200

    mocked_quote.assert_awaited_once_with(
        "GBP/USD"
    )


def test_market_maps_value_error_to_404():
    with patch(
        "app.routes.markets.get_market_quote",
        new=AsyncMock(
            side_effect=ValueError(
                "Unsupported market symbol."
            )
        ),
    ):
        response = client.get("/markets/INVALID")

    assert response.status_code == 404
    assert response.json()["detail"] == (
        "Unsupported market symbol."
    )


def test_market_accepts_forex_symbol_with_slash():
    market = make_market_quote(
        "USD/JPY",
        153.67391,
    )

    with patch(
        "app.routes.markets.get_market_quote",
        new=AsyncMock(return_value=market),
    ):
        response = client.get("/markets/USD/JPY")

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert body["market"]["symbol"] == "USD/JPY"


def test_market_accepts_xau_usd_symbol():
    market = make_market_quote(
        "XAU/USD",
        4415.27204,
    )

    with patch(
        "app.routes.markets.get_market_quote",
        new=AsyncMock(return_value=market),
    ):
        response = client.get("/markets/XAU/USD")

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert body["market"]["symbol"] == "XAU/USD"