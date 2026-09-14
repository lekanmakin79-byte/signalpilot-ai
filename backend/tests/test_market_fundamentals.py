import pytest

from app.market_fundamentals import (
    build_market_fundamental_analysis,
    build_market_fundamental_factors,
    calculate_market_fundamental_score,
    calculate_rate_differential,
    calculate_rate_differential_factor,
)


def test_rate_differential():
    result = calculate_rate_differential(
        base_rate=4.25,
        quote_rate=3.50,
    )

    assert result == 0.75


def test_negative_rate_differential():
    result = calculate_rate_differential(
        base_rate=3.25,
        quote_rate=4.00,
    )

    assert result == -0.75


def test_rate_differential_factor_positive():
    result = calculate_rate_differential_factor(
        differential=0.75,
        base_currency="GBP",
        quote_currency="USD",
    )

    assert result["name"] == (
        "interest_rate_differential"
    )
    assert result["value"] == 0.75
    assert result["direction"] == "positive"
    assert result["base_currency"] == "GBP"
    assert result["quote_currency"] == "USD"


def test_rate_differential_factor_negative():
    result = calculate_rate_differential_factor(
        differential=-0.75,
        base_currency="USD",
        quote_currency="JPY",
    )

    assert result["direction"] == "negative"


def test_eur_usd_factor_mapping():
    data = {
        "policy_rates": {
            "EUR": [
                {"period": "2026-01", "value": 2.00},
            ],
            "USD": [
                {"period": "2026-01", "value": 4.00},
            ],
        },
        "inflation": {
            "EUR": [
                {"period": "2026-01", "value": 2.0},
                {"period": "2026-02", "value": 2.2},
            ],
            "USD": [
                {"period": "2026-01", "value": 2.5},
                {"period": "2026-02", "value": 2.7},
            ],
        },
    }

    factors = build_market_fundamental_factors(
        symbol="EUR/USD",
        data=data,
    )

    names = {
        factor["name"]
        for factor in factors
    }

    assert (
        "interest_rate_differential"
        in names
    )

    assert (
        "inflation_euro_area"
        in names
    )

    assert (
        "inflation_us"
        in names
    )


def test_gbp_usd_factor_mapping():
    data = {
        "policy_rates": {
            "GBP": [
                {"period": "2026-01", "value": 4.00},
            ],
            "USD": [
                {"period": "2026-01", "value": 3.50},
            ],
        }
    }

    factors = build_market_fundamental_factors(
        symbol="GBP/USD",
        data=data,
    )

    assert len(factors) == 1
    assert (
        factors[0]["name"]
        == "interest_rate_differential"
    )
    assert factors[0]["value"] == 0.5
    assert factors[0]["direction"] == "positive"


def test_usd_jpy_factor_mapping():
    data = {
        "policy_rates": {
            "USD": [
                {"period": "2026-01", "value": 4.00},
            ],
            "JPY": [
                {"period": "2026-01", "value": 0.50},
            ],
        }
    }

    factors = build_market_fundamental_factors(
        symbol="USD/JPY",
        data=data,
    )

    assert len(factors) == 1
    assert factors[0]["value"] == 3.5
    assert factors[0]["direction"] == "positive"


def test_xau_usd_uses_us_policy_rate():
    data = {
        "policy_rates": {
            "USD": [
                {"period": "2026-01", "value": 4.00},
            ]
        }
    }

    factors = build_market_fundamental_factors(
        symbol="XAU/USD",
        data=data,
    )

    assert len(factors) == 1
    assert (
    factors[0]["name"]
    == "us_policy_rate"
    )
    assert factors[0]["value"] == 4.0
    assert factors[0]["base_currency"] == "USD"
    assert factors[0]["quote_currency"] == "GOLD"
    assert factors[0]["direction"] == "neutral"


def test_missing_data_is_not_fabricated():
    factors = build_market_fundamental_factors(
        symbol="EUR/USD",
        data={},
    )

    assert factors == []


def test_fundamental_score_positive():
    factors = [
        {
            "name": "rate",
            "direction": "positive",
            "importance": "high",
        },
        {
            "name": "growth",
            "direction": "positive",
            "importance": "medium",
        },
    ]

    result = calculate_market_fundamental_score(
        factors
    )

    assert result["available"] is True
    assert result["score"] == 100.0
    assert result["bias"] == "POSITIVE"


def test_fundamental_score_negative():
    factors = [
        {
            "name": "rate",
            "direction": "negative",
            "importance": "high",
        },
        {
            "name": "growth",
            "direction": "negative",
            "importance": "medium",
        },
    ]

    result = calculate_market_fundamental_score(
        factors
    )

    assert result["score"] == -100.0
    assert result["bias"] == "NEGATIVE"


def test_empty_fundamental_score():
    result = calculate_market_fundamental_score(
        []
    )

    assert result["available"] is False
    assert result["score"] is None
    assert result["bias"] == "NEUTRAL"


def test_complete_market_fundamental_analysis():
    data = {
        "policy_rates": {
            "GBP": [
                {"period": "2026-01", "value": 4.00},
            ],
            "USD": [
                {"period": "2026-01", "value": 3.50},
            ],
        },
        "growth": {
            "GBP": [
                {"period": "2026-Q1", "value": 0.1},
                {"period": "2026-Q2", "value": 0.3},
            ],
            "USD": [
                {"period": "2026-Q1", "value": 0.2},
                {"period": "2026-Q2", "value": 0.4},
            ],
        },
    }

    result = build_market_fundamental_analysis(
        symbol="GBP/USD",
        data=data,
    )

    assert result["symbol"] == "GBP/USD"
    assert result["available"] is True
    assert result["factor_count"] == 3
    assert len(result["factors"]) == 3
    assert result["score"] is not None


def test_unsupported_market_is_rejected():
    with pytest.raises(
        ValueError,
        match="Unsupported fundamental market",
    ):
        build_market_fundamental_analysis(
            symbol="AUD/USD",
            data={},
        )