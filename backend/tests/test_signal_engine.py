import math

import pytest

from app.signal_engine import (
    MINIMUM_CANDLES,
    build_signal_explanation,
    generate_signal,
)


def make_candles(
    prices: list[float],
    start_index: int = 0,
) -> list[dict]:
    candles = []

    for index, price in enumerate(
        prices,
        start=start_index,
    ):
        candles.append(
            {
                "datetime": (
                    f"2026-01-01 00:"
                    f"{index % 60:02d}:00"
                ),
                "open": price,
                "high": price + 0.0002,
                "low": price - 0.0002,
                "close": price,
            }
        )

    return candles


def make_trending_candles(
    count: int = 100,
    direction: str = "UP",
) -> list[dict]:
    if direction == "UP":
        prices = [
            1.1000 + (index * 0.0005)
            for index in range(count)
        ]
    else:
        prices = [
            1.2000 - (index * 0.0005)
            for index in range(count)
        ]

    return make_candles(prices)


def test_minimum_candles_constant():
    assert MINIMUM_CANDLES == 50


def test_generate_signal_rejects_empty_candles():
    with pytest.raises(ValueError, match="No market candles"):
        generate_signal(
            symbol="EUR/USD",
            candles=[],
            timeframe="5m",
        )


def test_generate_signal_rejects_insufficient_candles():
    candles = make_trending_candles(
        count=49,
        direction="UP",
    )

    with pytest.raises(
        ValueError,
        match="At least 50 candles",
    ):
        generate_signal(
            symbol="EUR/USD",
            candles=candles,
            timeframe="5m",
        )


def test_generate_signal_rejects_invalid_close_price():
    candles = make_trending_candles(
        count=100,
        direction="UP",
    )

    candles[-1]["close"] = "invalid"

    with pytest.raises(
        ValueError,
        match="closing price",
    ):
        generate_signal(
            symbol="EUR/USD",
            candles=candles,
            timeframe="5m",
        )


def test_generate_signal_rejects_non_positive_close_price():
    candles = make_trending_candles(
        count=100,
        direction="UP",
    )

    candles[-1]["close"] = 0

    with pytest.raises(
        ValueError,
        match="non-positive",
    ):
        generate_signal(
            symbol="EUR/USD",
            candles=candles,
            timeframe="5m",
        )


def test_generate_signal_requires_timestamp():
    candles = make_trending_candles(
        count=100,
        direction="UP",
    )

    candles[-1].pop("datetime")

    with pytest.raises(
        ValueError,
        match="timestamp",
    ):
        generate_signal(
            symbol="EUR/USD",
            candles=candles,
            timeframe="5m",
        )


def test_generate_signal_returns_expected_structure():
    candles = make_trending_candles(
        count=100,
        direction="UP",
    )

    result = generate_signal(
        symbol="EUR/USD",
        candles=candles,
        timeframe="5m",
    )

    assert isinstance(result, dict)

    expected_keys = {
        "symbol",
        "timeframe",
        "price",
        "signal_timestamp",
        "direction",
        "confidence",
        "trend",
        "momentum",
        "volatility",
        "scores",
        "indicators",
        "risk",
        "data_points",
        "explanation",
    }

    assert expected_keys.issubset(
        result.keys()
    )


def test_generate_signal_preserves_symbol_and_timeframe():
    candles = make_trending_candles(
        count=100,
        direction="UP",
    )

    result = generate_signal(
        symbol="EUR/USD",
        candles=candles,
        timeframe="15m",
    )

    assert result["symbol"] == "EUR/USD"
    assert result["timeframe"] == "15m"


def test_generate_signal_returns_valid_direction():
    candles = make_trending_candles(
        count=100,
        direction="UP",
    )

    result = generate_signal(
        symbol="EUR/USD",
        candles=candles,
        timeframe="5m",
    )

    assert result["direction"] in {
        "UP",
        "DOWN",
        "NEUTRAL",
    }


def test_generate_signal_returns_valid_confidence():
    candles = make_trending_candles(
        count=100,
        direction="UP",
    )

    result = generate_signal(
        symbol="EUR/USD",
        candles=candles,
        timeframe="5m",
    )

    confidence = result["confidence"]

    assert isinstance(confidence, (int, float))
    assert math.isfinite(confidence)
    assert 0 <= confidence <= 100


def test_generate_signal_returns_valid_scores():
    candles = make_trending_candles(
        count=100,
        direction="UP",
    )

    result = generate_signal(
        symbol="EUR/USD",
        candles=candles,
        timeframe="5m",
    )

    scores = result["scores"]

    assert {
        "trend",
        "momentum",
        "volatility",
        "directional",
    }.issubset(scores.keys())

    for value in scores.values():
        assert isinstance(value, (int, float))
        assert math.isfinite(value)


def test_generate_signal_returns_indicator_data():
    candles = make_trending_candles(
        count=100,
        direction="UP",
    )

    result = generate_signal(
        symbol="EUR/USD",
        candles=candles,
        timeframe="5m",
    )

    indicators = result["indicators"]

    assert {
        "ema20",
        "ema50",
        "rsi14",
        "macd",
        "atr14",
    }.issubset(indicators.keys())

    assert indicators["ema20"] is not None
    assert indicators["ema50"] is not None
    assert indicators["rsi14"] is not None
    assert indicators["macd"] is not None
    assert indicators["atr14"] is not None


def test_generate_signal_returns_macd_structure():
    candles = make_trending_candles(
        count=100,
        direction="UP",
    )

    result = generate_signal(
        symbol="EUR/USD",
        candles=candles,
        timeframe="5m",
    )

    macd = result["indicators"]["macd"]

    assert {
        "macd",
        "signal",
        "histogram",
    }.issubset(macd.keys())

    assert isinstance(
        macd["macd"],
        (int, float),
    )

    assert isinstance(
        macd["signal"],
        (int, float),
    )

    assert isinstance(
        macd["histogram"],
        (int, float),
    )


def test_generate_signal_returns_risk_assessment():
    candles = make_trending_candles(
        count=100,
        direction="UP",
    )

    result = generate_signal(
        symbol="EUR/USD",
        candles=candles,
        timeframe="5m",
    )

    risk = result["risk"]

    assert isinstance(risk, dict)
    assert "risk_level" in risk
    assert "factors" in risk

    assert isinstance(
        risk["risk_level"],
        str,
    )

    assert isinstance(
        risk["factors"],
        list,
    )


def test_generate_signal_returns_data_point_count():
    candles = make_trending_candles(
        count=100,
        direction="UP",
    )

    result = generate_signal(
        symbol="EUR/USD",
        candles=candles,
        timeframe="5m",
    )

    assert result["data_points"] == 100


def test_generate_signal_returns_current_price():
    candles = make_trending_candles(
        count=100,
        direction="UP",
    )

    result = generate_signal(
        symbol="EUR/USD",
        candles=candles,
        timeframe="5m",
    )

    assert result["price"] == candles[-1]["close"]


def test_generate_signal_returns_explanation():
    candles = make_trending_candles(
        count=100,
        direction="UP",
    )

    result = generate_signal(
        symbol="EUR/USD",
        candles=candles,
        timeframe="5m",
    )

    assert isinstance(
        result["explanation"],
        str,
    )

    assert len(
        result["explanation"]
    ) > 0


def test_up_explanation_contains_bullish_bias():
    explanation = build_signal_explanation(
        direction="UP",
        trend_state="STRONG_BULLISH",
        momentum_state="STRONG_POSITIVE",
        volatility_state="LOW",
    )

    assert "bullish bias" in explanation.lower()
    assert "strong bullish trend structure" in (
        explanation.lower()
    )
    assert "strong positive momentum" in (
        explanation.lower()
    )


def test_down_explanation_contains_bearish_bias():
    explanation = build_signal_explanation(
        direction="DOWN",
        trend_state="STRONG_BEARISH",
        momentum_state="STRONG_NEGATIVE",
        volatility_state="LOW",
    )

    assert "bearish bias" in explanation.lower()
    assert "strong bearish trend structure" in (
        explanation.lower()
    )
    assert "strong negative momentum" in (
        explanation.lower()
    )


def test_neutral_explanation_mentions_volatility():
    explanation = build_signal_explanation(
        direction="NEUTRAL",
        trend_state="NEUTRAL",
        momentum_state="NEUTRAL",
        volatility_state="HIGH",
    )

    assert (
        "sufficiently strong directional bias"
        in explanation.lower()
    )

    assert "high volatility environment" in (
        explanation.lower()
    )