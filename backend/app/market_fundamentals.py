from __future__ import annotations

from typing import Any

SUPPORTED_FUNDAMENTAL_MARKETS = {
    "EUR/USD",
    "GBP/USD",
    "USD/JPY",
    "XAU/USD",
}


def _validate_market(symbol: str) -> str:
    symbol = symbol.strip().upper()

    if symbol not in SUPPORTED_FUNDAMENTAL_MARKETS:
        raise ValueError(
            f"Unsupported fundamental market: {symbol}"
        )

    return symbol


def calculate_rate_differential(
    base_rate: float | int,
    quote_rate: float | int,
) -> float:
    """
    Calculate base-currency policy rate minus
    quote-currency policy rate.
    """

    try:
        base = float(base_rate)
        quote = float(quote_rate)
    except (TypeError, ValueError) as error:
        raise ValueError(
            "Policy rates must be numeric."
        ) from error

    return round(
        base - quote,
        6,
    )


def calculate_rate_differential_factor(
    differential: float,
    base_currency: str,
    quote_currency: str,
) -> dict:
    """
    Convert a rate differential into a directional
    analytical factor.

    Positive differential means the base currency has
    the higher policy rate.

    This is an analytical relationship only and does
    not imply a guaranteed currency movement.
    """

    base_currency = (
        base_currency.strip().upper()
    )
    quote_currency = (
        quote_currency.strip().upper()
    )

    if differential > 0:
        direction = "positive"
    elif differential < 0:
        direction = "negative"
    else:
        direction = "neutral"

    return {
        "name": "interest_rate_differential",
        "value": round(
            float(differential),
            6,
        ),
        "direction": direction,
        "base_currency": base_currency,
        "quote_currency": quote_currency,
        "unit": "percentage_points",
        "importance": "high",
    }


def calculate_change_factor(
    name: str,
    current_value: float | None,
    previous_value: float | None,
    importance: str = "medium",
) -> dict[str, Any] | None:
    if current_value is None or previous_value is None:
        return None

    try:
        current = float(current_value)
        previous = float(previous_value)
    except (TypeError, ValueError):
        return None

    if previous == 0:
        return None

    percentage_change = (
        (current - previous)
        / abs(previous)
    ) * 100

    if percentage_change > 0:
        direction = "positive"
    elif percentage_change < 0:
        direction = "negative"
    else:
        direction = "neutral"

    return {
        "name": name,
        "value": round(percentage_change, 4),
        "current_value": current,
        "previous_value": previous,
        "direction": direction,
        "importance": importance,
        "source_data": {
            "current": current,
            "previous": previous,
        },
    }


def _latest_value(
    observations: list[dict],
) -> float | None:
    if not observations:
        return None

    value = observations[-1].get(
        "value"
    )

    if value is None:
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _previous_value(
    observations: list[dict],
) -> float | None:
    if len(observations) < 2:
        return None

    value = observations[-2].get(
        "value"
    )

    if value is None:
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def build_market_fundamental_factors(
    symbol: str,
    data: dict,
) -> list[dict]:
    """
    Build market-specific fundamental factors from
    verified provider observations.

    Expected data structure:

        {
            "policy_rates": {
                "EUR": [...],
                "USD": [...],
                "GBP": [...],
                "JPY": [...]
            },
            "inflation": {
                "EUR": [...],
                "USD": [...],
                "GBP": [...],
                "JPY": [...]
            },
            "growth": {
                ...
            },
            "employment": {
                ...
            }
        }

    Missing provider data is skipped rather than
    fabricated.
    """

    symbol = _validate_market(symbol)

    factors: list[dict] = []

    policy_rates = data.get(
        "policy_rates",
        {},
    )

    inflation = data.get(
        "inflation",
        {},
    )

    growth = data.get(
        "growth",
        {},
    )

    employment = data.get(
        "employment",
        {},
    )

    if symbol == "EUR/USD":
        _add_rate_differential(
            factors,
            policy_rates,
            "EUR",
            "USD",
        )

        _add_economic_change(
            factors,
            inflation,
            "EUR",
            "inflation_euro_area",
        )

        _add_economic_change(
            factors,
            inflation,
            "USD",
            "inflation_us",
        )

        _add_economic_change(
            factors,
            growth,
            "EUR",
            "growth_euro_area",
        )

        _add_economic_change(
            factors,
            growth,
            "USD",
            "growth_us",
        )

        _add_economic_change(
            factors,
            employment,
            "EUR",
            "employment_euro_area",
        )

        _add_economic_change(
            factors,
            employment,
            "USD",
            "employment_us",
        )

    elif symbol == "GBP/USD":
        _add_rate_differential(
            factors,
            policy_rates,
            "GBP",
            "USD",
        )

        _add_economic_change(
            factors,
            inflation,
            "GBP",
            "inflation_uk",
        )

        _add_economic_change(
            factors,
            inflation,
            "USD",
            "inflation_us",
        )

        _add_economic_change(
            factors,
            growth,
            "GBP",
            "growth_uk",
        )

        _add_economic_change(
            factors,
            growth,
            "USD",
            "growth_us",
        )

        _add_economic_change(
            factors,
            employment,
            "GBP",
            "employment_uk",
        )

        _add_economic_change(
            factors,
            employment,
            "USD",
            "employment_us",
        )

    elif symbol == "USD/JPY":
        _add_rate_differential(
            factors,
            policy_rates,
            "USD",
            "JPY",
        )

        _add_economic_change(
            factors,
            inflation,
            "USD",
            "inflation_us",
        )

        _add_economic_change(
            factors,
            inflation,
            "JPY",
            "inflation_japan",
        )

        _add_economic_change(
            factors,
            growth,
            "USD",
            "growth_us",
        )

        _add_economic_change(
            factors,
            growth,
            "JPY",
            "growth_japan",
        )

        _add_economic_change(
            factors,
            employment,
            "USD",
            "employment_us",
        )

        _add_economic_change(
            factors,
            employment,
            "JPY",
            "employment_japan",
        )

    elif symbol == "XAU/USD":
        _add_rate_differential(
            factors,
            policy_rates,
            "USD",
            "GOLD",
        )

        _add_economic_change(
            factors,
            inflation,
            "USD",
            "inflation_us",
        )

        _add_economic_change(
            factors,
            growth,
            "USD",
            "growth_us",
        )

        _add_economic_change(
            factors,
            employment,
            "USD",
            "employment_us",
        )

    return factors


def _add_rate_differential(
    factors: list[dict],
    policy_rates: dict,
    base_currency: str,
    quote_currency: str,
) -> None:
    base_observations = policy_rates.get(
        base_currency,
        []
    )

    base_value = _latest_value(
        base_observations
    )

    if base_value is None:
        return

    # XAU/USD does not have a "gold policy rate".
    # For gold, the relevant monetary-policy input
    # is the USD policy rate itself. Do not fabricate
    # a second rate for GOLD.
    if quote_currency == "GOLD":
        factors.append(
            {
                "name": "us_policy_rate",
                "value": round(
                    base_value,
                    6,
                ),
                "direction": "neutral",
                "base_currency": base_currency,
                "quote_currency": quote_currency,
                "unit": "percent",
                "importance": "high",
                "source_data": {
                    "base_latest": base_value,
                    "quote_latest": None,
                },
            }
        )
        return

    quote_observations = policy_rates.get(
        quote_currency,
        []
    )

    quote_value = _latest_value(
        quote_observations
    )

    if quote_value is None:
        return

    differential = calculate_rate_differential(
        base_rate=base_value,
        quote_rate=quote_value,
    )

    factor = calculate_rate_differential_factor(
        differential=differential,
        base_currency=base_currency,
        quote_currency=quote_currency,
    )

    factor["source_data"] = {
        "base_latest": base_value,
        "quote_latest": quote_value,
    }

    factors.append(factor)


def _add_economic_change(
    factors: list[dict],
    dataset: dict,
    currency: str,
    factor_name: str,
) -> None:
    observations = dataset.get(
        currency,
        [],
    )

    current = _latest_value(
        observations
    )

    previous = _previous_value(
        observations
    )

    if (
        current is None
        or previous is None
    ):
        return

    factor = calculate_change_factor(
        name=factor_name,
        current_value=current,
        previous_value=previous,
    )

    factor["source_data"] = {
        "current": current,
        "previous": previous,
    }

    factors.append(
        factor
    )


def calculate_market_fundamental_score(
    factors: list[dict[str, Any]],
) -> dict[str, Any]:
    if not factors:
        return {
            "available": False,
            "score": None,
            "bias": "NEUTRAL",
            "factor_count": 0,
        }

    importance_weights = {
        "low": 0.5,
        "medium": 1.0,
        "high": 1.5,
    }

    total_weight = 0.0
    weighted_signal = 0.0

    for factor in factors:
        direction = factor.get(
            "direction",
            "neutral",
        )

        importance = factor.get(
            "importance",
            "medium",
        )

        weight = importance_weights.get(
            importance,
            importance_weights["medium"],
        )

        if direction == "neutral":
            continue

        value = factor.get("value")

        try:
            magnitude = abs(float(value))
            magnitude_available = True
        except (TypeError, ValueError):
            magnitude = 0.0
            magnitude_available = False

        factor_name = str(
            factor.get("name", "")
        ).lower()

        if "interest_rate_differential" in factor_name:
            magnitude_scale = 2.0
        else:
            magnitude_scale = 2.0

        if magnitude_available:
            magnitude_strength = min(
                magnitude / magnitude_scale,
                1.0,
            )

            signal_strength = (
                0.5
                + (
                    0.5
                    * magnitude_strength
                )
            )
        else:
            signal_strength = 1.0

        direction_multiplier = (
            1.0
            if direction == "positive"
            else -1.0
        )

        weighted_signal += (
            direction_multiplier
            * weight
            * signal_strength
        )

        total_weight += weight

    if total_weight == 0:
        return {
            "available": True,
            "score": 0.0,
            "bias": "NEUTRAL",
            "factor_count": len(factors),
        }

    raw_score = (
        weighted_signal
        / total_weight
    ) * 100

    score = round(
        max(
            -100.0,
            min(100.0, raw_score),
        ),
        2,
    )

    if score > 10:
        bias = "POSITIVE"
    elif score < -10:
        bias = "NEGATIVE"
    else:
        bias = "NEUTRAL"

    return {
        "available": True,
        "score": score,
        "bias": bias,
        "factor_count": len(factors),
    }


def build_market_fundamental_analysis(
    symbol: str,
    data: dict,
) -> dict:
    """
    Build the complete market-specific fundamental
    assessment.
    """

    symbol = _validate_market(symbol)

    factors = build_market_fundamental_factors(
        symbol=symbol,
        data=data,
    )

    score = calculate_market_fundamental_score(
        factors
    )

    return {
        "symbol": symbol,
        "available": score["available"],
        "score": score["score"],
        "bias": score["bias"],
        "factor_count": score["factor_count"],
        "factors": factors,
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
    }