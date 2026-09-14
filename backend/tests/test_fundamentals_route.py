from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_fundamental_route_returns_explicit_unavailable_state():
    analysis = {
        "symbol": "EUR/USD",
        "available": False,
        "score": None,
        "bias": "NEUTRAL",
        "factor_count": 0,
        "factors": [],
        "method": (
            "Market-specific weighted fundamental "
            "factor assessment"
        ),
        "disclaimer": (
            "Fundamental analysis is an analytical "
            "assessment based on verified economic "
            "data. It is not financial advice and "
            "does not guarantee future market "
            "performance."
        ),
        "providers": [],
        "source_count": 0,
    }

    with patch(
        "app.routes.fundamentals."
        "get_market_fundamental_analysis",
        new=AsyncMock(
            return_value=analysis
        ),
    ):
        response = client.get(
            "/fundamentals/EUR/USD"
        )

    assert response.status_code == 200

    payload = response.json()

    assert payload["success"] is True
    assert (
        payload["fundamental"]["symbol"]
        == "EUR/USD"
    )
    assert (
        payload["fundamental"]["available"]
        is False
    )
    assert (
        payload["fundamental"]["score"]
        is None
    )
    assert (
        payload["fundamental"]["bias"]
        == "NEUTRAL"
    )


def test_fundamental_route_returns_provider_data():
    analysis = {
        "symbol": "GBP/USD",
        "available": True,
        "score": 35.0,
        "bias": "POSITIVE",
        "factor_count": 1,
        "factors": [
            {
                "name": "interest_rate_differential",
                "value": 35,
                "direction": "positive",
                "importance": "high",
            }
        ],
        "method": (
            "Market-specific weighted fundamental "
            "factor assessment"
        ),
        "disclaimer": (
            "Fundamental analysis is an analytical "
            "assessment based on verified economic "
            "data. It is not financial advice and "
            "does not guarantee future market "
            "performance."
        ),
        "providers": [
            "test-provider"
        ],
        "source_count": 1,
    }

    with patch(
        "app.routes.fundamentals."
        "get_market_fundamental_analysis",
        new=AsyncMock(
            return_value=analysis
        ),
    ):
        response = client.get(
            "/fundamentals/GBP/USD"
        )

    assert response.status_code == 200

    payload = response.json()

    assert payload["success"] is True

    fundamental = payload[
        "fundamental"
    ]

    assert (
        fundamental["symbol"]
        == "GBP/USD"
    )
    assert (
        fundamental["available"]
        is True
    )
    assert (
        fundamental["score"]
        == 35.0
    )
    assert (
        fundamental["bias"]
        == "POSITIVE"
    )
    assert (
        fundamental["factor_count"]
        == 1
    )
    assert (
        fundamental["providers"]
        == ["test-provider"]
    )


def test_fundamental_route_maps_runtime_error_to_502():
    with patch(
        "app.routes.fundamentals."
        "get_market_fundamental_analysis",
        new=AsyncMock(
            side_effect=RuntimeError(
                "Fundamental provider unavailable."
            )
        ),
    ):
        response = client.get(
            "/fundamentals/EUR/USD"
        )

    assert response.status_code == 502

    payload = response.json()

    assert (
        payload["detail"]
        == "Fundamental provider unavailable."
    )