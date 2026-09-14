from app.data_analytics import (
    build_data_analytics,
    build_descriptive_analytics,
    build_diagnostic_analytics,
    build_predictive_analytics,
    build_prescriptive_analytics,
)


def sample_candles():
    prices = [
        100.0,
        101.0,
        102.0,
        101.5,
        103.0,
        104.0,
        103.5,
        105.0,
        106.0,
        107.0,
        108.0,
        107.5,
    ]

    return [
        {
            "datetime": f"2026-01-01T00:{index:02d}:00",
            "open": price,
            "high": price + 0.5,
            "low": price - 0.5,
            "close": price,
        }
        for index, price in enumerate(prices)
    ]


def test_descriptive_analytics():
    result = build_descriptive_analytics(
        symbol="EUR/USD",
        interval="5m",
        candles=sample_candles(),
    )

    assert result["type"] == "descriptive"
    assert result["data_points"] == 12
    assert result["current_price"] == 107.5
    assert result["high"] == 108.0
    assert result["low"] == 100.0


def test_diagnostic_analytics():
    result = build_diagnostic_analytics(
        symbol="EUR/USD",
        interval="5m",
        candles=sample_candles(),
    )

    assert result["type"] == "diagnostic"
    assert result["available"] is True
    assert result["dominant_direction"] == "UP"


def test_predictive_analytics():
    result = build_predictive_analytics(
        symbol="EUR/USD",
        interval="5m",
        candles=sample_candles(),
    )

    assert result["type"] == "predictive"
    assert result["available"] is True
    assert result["directional_assessment"] in {
        "UP",
        "DOWN",
        "NEUTRAL",
    }


def test_prescriptive_analytics():
    result = build_prescriptive_analytics(
        symbol="EUR/USD",
        interval="5m",
        candles=sample_candles(),
    )

    assert result["type"] == "prescriptive"
    assert result["available"] is True
    assert result["environment"] in {
        "HIGH_VARIABILITY",
        "MODERATE_VARIABILITY",
        "LOW_VARIABILITY",
    }


def test_complete_data_analytics():
    result = build_data_analytics(
        symbol="EUR/USD",
        interval="5m",
        candles=sample_candles(),
    )

    assert result["symbol"] == "EUR/USD"
    assert "descriptive" in result
    assert "diagnostic" in result
    assert "predictive" in result
    assert "prescriptive" in result