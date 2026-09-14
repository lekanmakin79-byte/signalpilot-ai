from __future__ import annotations

from statistics import mean


VALID_DIRECTIONS = {
    "positive",
    "negative",
    "neutral",
}


def normalize_factor(
    name: str,
    value: float | int | None,
    direction: str,
    source: str | None = None,
    provider: str | None = None,
    observed_at: str | None = None,
    updated_at: str | None = None,
    unit: str | None = None,
    importance: str = "medium",
) -> dict:
    """
    Normalise one verified fundamental observation.

    The function does not create or infer economic values.
    Direction must be supplied by the upstream analytical
    layer or provider mapping.
    """

    name = name.strip()

    if not name:
        raise ValueError(
            "Fundamental factor name is required."
        )

    direction = direction.strip().lower()

    if direction not in VALID_DIRECTIONS:
        raise ValueError(
            "Fundamental factor direction must be "
            "positive, negative or neutral."
        )

    if value is not None:
        try:
            value = float(value)
        except (TypeError, ValueError) as error:
            raise ValueError(
                "Fundamental factor value must be numeric."
            ) from error

    return {
        "name": name,
        "value": value,
        "direction": direction,
        "source": source,
        "provider": provider,
        "observed_at": observed_at,
        "updated_at": updated_at,
        "unit": unit,
        "importance": importance,
    }


def _factor_weight(
    importance: str,
) -> float:
    weights = {
        "low": 0.5,
        "medium": 1.0,
        "high": 1.5,
    }

    return weights.get(
        importance.strip().lower(),
        1.0,
    )


def _direction_score(
    direction: str,
) -> float:
    direction = direction.strip().lower()

    if direction == "positive":
        return 1.0

    if direction == "negative":
        return -1.0

    return 0.0


def calculate_fundamental_score(
    factors: list[dict],
) -> dict:
    """
    Calculate a weighted fundamental score.

    Score range:
        -100 to +100

    The score reflects the supplied verified factors.
    It is an analytical assessment, not a prediction.
    """

    if not factors:
        return {
            "available": False,
            "score": None,
            "bias": "NEUTRAL",
            "factor_count": 0,
        }

    weighted_scores = []
    total_weight = 0.0

    for factor in factors:
        direction = factor.get(
            "direction",
            "neutral",
        )

        weight = _factor_weight(
            factor.get(
                "importance",
                "medium",
            )
        )

        weighted_scores.append(
            _direction_score(direction)
            * weight
        )

        total_weight += weight

    if total_weight == 0:
        return {
            "available": False,
            "score": None,
            "bias": "NEUTRAL",
            "factor_count": len(factors),
        }

    weighted_average = (
        sum(weighted_scores)
        / total_weight
    )

    score = round(
        weighted_average * 100,
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


def build_fundamental_factor_summary(
    symbol: str,
    factors: list[dict],
) -> dict:
    """
    Build the standard SignalPilot fundamental
    intelligence record.
    """

    normalized_factors = []

    for factor in factors:
        normalized_factors.append(
            normalize_factor(
                name=factor.get(
                    "name",
                    "",
                ),
                value=factor.get(
                    "value"
                ),
                direction=factor.get(
                    "direction",
                    "neutral",
                ),
                source=factor.get(
                    "source"
                ),
                provider=factor.get(
                    "provider"
                ),
                observed_at=factor.get(
                    "observed_at"
                ),
                updated_at=factor.get(
                    "updated_at"
                ),
                unit=factor.get(
                    "unit"
                ),
                importance=factor.get(
                    "importance",
                    "medium",
                ),
            )
        )

    score_result = (
        calculate_fundamental_score(
            normalized_factors
        )
    )

    return {
        "symbol": symbol,
        "available": score_result[
            "available"
        ],
        "score": score_result[
            "score"
        ],
        "bias": score_result[
            "bias"
        ],
        "factor_count": score_result[
            "factor_count"
        ],
        "factors": normalized_factors,
        "method": (
            "Weighted fundamental-factor "
            "assessment"
        ),
        "disclaimer": (
            "Fundamental scoring is an analytical "
            "assessment based on supplied data. "
            "It is not financial advice and does "
            "not guarantee future market performance."
        ),
    }