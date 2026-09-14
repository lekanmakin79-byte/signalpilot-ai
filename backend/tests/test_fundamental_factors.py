import pytest

from app.fundamental_factors import (
    build_fundamental_factor_summary,
    calculate_fundamental_score,
    normalize_factor,
)


def test_normalize_factor_preserves_verified_metadata():
    result = normalize_factor(
        name="policy_rate",
        value=4.25,
        direction="positive",
        source="Bank of England",
        provider="Bank of England",
        observed_at="2026-09-01",
        updated_at="2026-09-02",
        unit="percent",
        importance="high",
    )

    assert result["name"] == "policy_rate"
    assert result["value"] == 4.25
    assert result["direction"] == "positive"
    assert result["source"] == "Bank of England"
    assert result["provider"] == "Bank of England"
    assert result["unit"] == "percent"
    assert result["importance"] == "high"


def test_normalize_factor_rejects_invalid_direction():
    with pytest.raises(
        ValueError,
        match="positive, negative or neutral",
    ):
        normalize_factor(
            name="inflation",
            value=3.0,
            direction="bullish",
        )


def test_fundamental_score_returns_positive_bias():
    factors = [
        {
            "name": "policy_rate",
            "value": 4.25,
            "direction": "positive",
            "importance": "high",
        },
        {
            "name": "inflation",
            "value": 2.0,
            "direction": "positive",
            "importance": "medium",
        },
    ]

    result = calculate_fundamental_score(
        factors
    )

    assert result["available"] is True
    assert result["score"] == 100.0
    assert result["bias"] == "POSITIVE"
    assert result["factor_count"] == 2


def test_fundamental_score_returns_negative_bias():
    factors = [
        {
            "name": "inflation",
            "value": 5.0,
            "direction": "negative",
            "importance": "high",
        },
        {
            "name": "growth",
            "value": -1.0,
            "direction": "negative",
            "importance": "medium",
        },
    ]

    result = calculate_fundamental_score(
        factors
    )

    assert result["available"] is True
    assert result["score"] == -100.0
    assert result["bias"] == "NEGATIVE"


def test_neutral_factors_return_neutral_bias():
    factors = [
        {
            "name": "inflation",
            "value": 2.5,
            "direction": "neutral",
            "importance": "high",
        },
        {
            "name": "growth",
            "value": 0.0,
            "direction": "neutral",
            "importance": "medium",
        },
    ]

    result = calculate_fundamental_score(
        factors
    )

    assert result["available"] is True
    assert result["score"] == 0.0
    assert result["bias"] == "NEUTRAL"


def test_empty_factors_are_unavailable():
    result = calculate_fundamental_score(
        []
    )

    assert result["available"] is False
    assert result["score"] is None
    assert result["bias"] == "NEUTRAL"
    assert result["factor_count"] == 0


def test_factor_summary_contains_sources():
    factors = [
        {
            "name": "policy_rate",
            "value": 4.25,
            "direction": "positive",
            "source": "Bank of England",
            "provider": "Bank of England",
            "unit": "percent",
            "importance": "high",
        },
        {
            "name": "inflation",
            "value": 2.0,
            "direction": "neutral",
            "source": "Official statistics",
            "provider": "Test Provider",
            "unit": "percent",
            "importance": "medium",
        },
    ]

    result = build_fundamental_factor_summary(
        symbol="GBP/USD",
        factors=factors,
    )

    assert result["symbol"] == "GBP/USD"
    assert result["available"] is True
    assert result["factor_count"] == 2
    assert len(result["factors"]) == 2
    assert (
        result["factors"][0]["source"]
        == "Bank of England"
    )
    assert (
        result["factors"][1]["provider"]
        == "Test Provider"
    )