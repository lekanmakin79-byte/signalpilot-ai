import pytest

from app.confidence_engine import (
    build_risk_assessment,
    calculate_confidence,
    calculate_momentum_score,
    calculate_trend_score,
    calculate_volatility_score,
)


def test_trend_score_requires_50_prices():
    score, state = calculate_trend_score(
        [1.0] * 49
    )

    assert score == 0.0
    assert state == "INSUFFICIENT_DATA"


def test_strong_bullish_trend():
    prices = [
        1.0 + (index * 0.01)
        for index in range(100)
    ]

    score, state = calculate_trend_score(
        prices
    )

    assert score == 1.0
    assert state == "STRONG_BULLISH"


def test_strong_bearish_trend():
    prices = [
        2.0 - (index * 0.01)
        for index in range(100)
    ]

    score, state = calculate_trend_score(
        prices
    )

    assert score == -1.0
    assert state == "STRONG_BEARISH"


def test_neutral_trend_with_flat_prices():
    prices = [1.0] * 100

    score, state = calculate_trend_score(
        prices
    )

    assert score == 0.0
    assert state == "NEUTRAL"


def test_positive_momentum_from_rsi_and_macd():
    score, state = calculate_momentum_score(
        rsi=60.0,
        macd={
            "histogram": 0.001,
        },
    )

    assert score == 1.0
    assert state == "STRONG_POSITIVE"


def test_negative_momentum_from_rsi_and_macd():
    score, state = calculate_momentum_score(
        rsi=40.0,
        macd={
            "histogram": -0.001,
        },
    )

    assert score == -1.0
    assert state == "STRONG_NEGATIVE"


def test_positive_momentum_from_rsi_only():
    score, state = calculate_momentum_score(
        rsi=60.0,
        macd={
            "histogram": 0.0,
        },
    )

    assert score == 0.5
    assert state == "POSITIVE"


def test_negative_momentum_from_macd_only():
    score, state = calculate_momentum_score(
        rsi=None,
        macd={
            "histogram": -0.001,
        },
    )

    assert score == -0.5
    assert state == "NEGATIVE"


def test_neutral_momentum():
    score, state = calculate_momentum_score(
        rsi=50.0,
        macd={
            "histogram": 0.0,
        },
    )

    assert score == 0.0
    assert state == "NEUTRAL"


def test_momentum_handles_missing_histogram():
    score, state = calculate_momentum_score(
        rsi=50.0,
        macd={},
    )

    assert score == 0.0
    assert state == "NEUTRAL"


def test_low_volatility_score():
    score, state = calculate_volatility_score(
        "LOW"
    )

    assert score == 1.0
    assert state == "LOW"


def test_medium_volatility_score():
    score, state = calculate_volatility_score(
        "MEDIUM"
    )

    assert score == 0.75
    assert state == "MEDIUM"


def test_high_volatility_score():
    score, state = calculate_volatility_score(
        "HIGH"
    )

    assert score == 0.35
    assert state == "HIGH"


def test_unknown_volatility_score():
    score, state = calculate_volatility_score(
        "UNKNOWN_VALUE"
    )

    assert score == 0.0
    assert state == "UNKNOWN"


def test_confidence_returns_up_direction():
    result = calculate_confidence(
        trend_score=1.0,
        momentum_score=1.0,
        volatility_score=1.0,
    )

    assert result["direction"] == "UP"
    assert result["confidence"] == 93.2
    assert result["directional_score"] == 0.85


def test_confidence_returns_down_direction():
    result = calculate_confidence(
        trend_score=-1.0,
        momentum_score=-1.0,
        volatility_score=1.0,
    )

    assert result["direction"] == "DOWN"
    assert result["confidence"] == 93.2
    assert result["directional_score"] == -0.85


def test_confidence_returns_neutral_direction():
    result = calculate_confidence(
        trend_score=0.0,
        momentum_score=0.0,
        volatility_score=1.0,
    )

    assert result["direction"] == "NEUTRAL"
    assert result["confidence"] == 55.0
    assert result["directional_score"] == 0.0


def test_confidence_neutral_is_capped_at_60():
    result = calculate_confidence(
        trend_score=0.1,
        momentum_score=0.0,
        volatility_score=1.0,
    )

    assert result["direction"] == "NEUTRAL"
    assert result["confidence"] <= 60.0


def test_confidence_direction_threshold_for_up():
    result = calculate_confidence(
        trend_score=0.4,
        momentum_score=0.0,
        volatility_score=0.0,
    )

    assert result["direction"] == "UP"
    assert result["directional_score"] == 0.2


def test_confidence_direction_threshold_for_down():
    result = calculate_confidence(
        trend_score=-0.4,
        momentum_score=0.0,
        volatility_score=0.0,
    )

    assert result["direction"] == "DOWN"
    assert result["directional_score"] == -0.2


def test_confidence_below_direction_threshold_is_neutral():
    result = calculate_confidence(
        trend_score=0.39,
        momentum_score=0.0,
        volatility_score=0.0,
    )

    assert result["direction"] == "NEUTRAL"


def test_confidence_has_minimum_of_50():
    result = calculate_confidence(
        trend_score=0.0,
        momentum_score=0.0,
        volatility_score=0.0,
    )

    assert result["confidence"] == 50.0


def test_confidence_has_maximum_of_95():
    result = calculate_confidence(
        trend_score=1.0,
        momentum_score=1.0,
        volatility_score=1.0,
    )

    assert result["confidence"] <= 95.0


def test_risk_high_volatility_adds_factor():
    result = build_risk_assessment(
        direction="UP",
        confidence=75.0,
        volatility="HIGH",
        trend_score=1.0,
        momentum_score=1.0,
    )

    assert result["risk_level"] == "MODERATE"
    assert (
        "High volatility increases uncertainty."
        in result["factors"]
    )


def test_risk_detects_trend_momentum_conflict():
    result = build_risk_assessment(
        direction="UP",
        confidence=75.0,
        volatility="LOW",
        trend_score=1.0,
        momentum_score=-1.0,
    )

    assert (
        "Trend and momentum are not strongly aligned."
        in result["factors"]
    )


def test_risk_detects_low_confidence():
    result = build_risk_assessment(
        direction="NEUTRAL",
        confidence=60.0,
        volatility="LOW",
        trend_score=0.0,
        momentum_score=0.0,
    )

    assert result["risk_level"] == "ELEVATED"
    assert (
        "Directional confidence is relatively low."
        in result["factors"]
    )


def test_risk_lower_for_high_confidence_low_volatility():
    result = build_risk_assessment(
        direction="UP",
        confidence=85.0,
        volatility="LOW",
        trend_score=1.0,
        momentum_score=1.0,
    )

    assert result["risk_level"] == "LOWER"
    assert result["factors"] == [
        "No major analytical conflict detected."
    ]


def test_risk_moderate_for_mid_confidence():
    result = build_risk_assessment(
        direction="UP",
        confidence=70.0,
        volatility="MEDIUM",
        trend_score=1.0,
        momentum_score=1.0,
    )

    assert result["risk_level"] == "MODERATE"


def test_risk_elevated_for_low_confidence():
    result = build_risk_assessment(
        direction="NEUTRAL",
        confidence=50.0,
        volatility="LOW",
        trend_score=0.0,
        momentum_score=0.0,
    )

    assert result["risk_level"] == "ELEVATED"