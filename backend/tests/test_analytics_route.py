from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def make_candles(count: int = 100):
    return [
        {
            "datetime": f"2026-09-10 10:{index:02d}:00",
            "open": 1.16000,
            "high": 1.16100,
            "low": 1.15900,
            "close": 1.16000 + (index * 0.00001),
        }
        for index in range(count)
    ]


def test_analytics_route_returns_all_four_analytics_types():
    candles = make_candles()

    with patch(
        "app.routes.analytics.get_candles",
        new=AsyncMock(return_value=candles),
    ):
        response = client.get(
            "/analytics/EUR/USD?interval=5m&limit=100"
        )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert "analytics" in body

    analytics = body["analytics"]

    assert analytics["symbol"] == "EUR/USD"
    assert analytics["interval"] == "5m"

    assert "descriptive" in analytics
    assert "diagnostic" in analytics
    assert "predictive" in analytics
    assert "prescriptive" in analytics


def test_analytics_route_passes_market_parameters():
    candles = make_candles(120)

    with patch(
        "app.routes.analytics.get_candles",
        new=AsyncMock(return_value=candles),
    ) as mocked_candles:
        response = client.get(
            "/analytics/GBP/USD?interval=15m&limit=120"
        )

    assert response.status_code == 200

    mocked_candles.assert_awaited_once_with(
        symbol="GBP/USD",
        interval="15m",
        outputsize=120,
    )


def test_analytics_route_maps_runtime_error_to_502():
    with patch(
        "app.routes.analytics.get_candles",
        new=AsyncMock(
            side_effect=RuntimeError(
                "Market-data provider rate limit reached."
            )
        ),
    ):
        response = client.get(
            "/analytics/EUR/USD"
        )

    assert response.status_code == 502