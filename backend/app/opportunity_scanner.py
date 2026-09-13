from __future__ import annotations


OPPORTUNITY_WEIGHTS = {
    "ranking": 0.45,
    "quality": 0.30,
    "confidence": 0.15,
    "risk": 0.10,
}


def _clamp(
    value: float,
    minimum: float = 0.0,
    maximum: float = 100.0,
) -> float:
    return max(
        minimum,
        min(maximum, value),
    )


def calculate_opportunity_score(
    *,
    ranking_score: float,
    quality_score: float,
    confidence: float,
    risk_level: str,
) -> float:
    """
    Calculate an opportunity score for comparing
    currently generated market signals.

    This score measures the strength of the available
    quantitative evidence. It is NOT a probability
    of trade success.
    """
    ranking = _clamp(
        ranking_score
    )

    quality = _clamp(
        quality_score
    )

    confidence_value = _clamp(
        confidence
    )

    risk_scores = {
        "LOWER": 100.0,
        "MODERATE": 70.0,
        "ELEVATED": 35.0,
    }

    risk = risk_scores.get(
        risk_level.upper(),
        50.0,
    )

    opportunity_score = (
        ranking
        * OPPORTUNITY_WEIGHTS["ranking"]
        + quality
        * OPPORTUNITY_WEIGHTS["quality"]
        + confidence_value
        * OPPORTUNITY_WEIGHTS["confidence"]
        + risk
        * OPPORTUNITY_WEIGHTS["risk"]
    )

    return round(
        _clamp(opportunity_score),
        1,
    )


def scan_opportunities(
    signals: list[dict],
) -> list[dict]:
    """
    Scan ranked signals and return opportunities
    ordered from strongest to weakest.

    The original signal dictionaries are not modified.
    """
    opportunities = []

    for signal in signals:
        quality = signal.get(
            "quality",
            {},
        )

        ranking = signal.get(
            "ranking",
            {},
        )

        risk = signal.get(
            "risk",
            {},
        )

        opportunity_score = calculate_opportunity_score(
            ranking_score=ranking.get(
                "score",
                0.0,
            ),
            quality_score=quality.get(
                "quality_score",
                0.0,
            ),
            confidence=signal.get(
                "confidence",
                0.0,
            ),
            risk_level=risk.get(
                "risk_level",
                "UNKNOWN",
            ),
        )

        opportunity = {
            **signal,
            "opportunity": {
                "score": opportunity_score,
            },
        }

        opportunities.append(
            opportunity
        )

    opportunities.sort(
        key=lambda item: item["opportunity"]["score"],
        reverse=True,
    )

    for position, opportunity in enumerate(
        opportunities,
        start=1,
    ):
        opportunity["opportunity"]["rank"] = position

    return opportunities