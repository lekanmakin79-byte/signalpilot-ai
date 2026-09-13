from __future__ import annotations


QUALITY_WEIGHTS = {
    "directional_strength": 0.35,
    "confidence": 0.30,
    "indicator_agreement": 0.15,
    "volatility_quality": 0.10,
    "risk_quality": 0.10,
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


def calculate_directional_strength(
    directional_score: float,
) -> float:
    """
    Convert directional score (-1 to +1)
    into a 0-100 strength score.
    """
    return round(
        _clamp(
            abs(directional_score) * 100
        ),
        1,
    )


def calculate_indicator_agreement(
    trend_score: float,
    momentum_score: float,
) -> float:
    """
    Measure how strongly trend and momentum
    agree with each other.

    Same-direction signals receive higher scores.
    Opposing signals receive lower scores.
    """
    trend = max(
        -1.0,
        min(1.0, trend_score),
    )

    momentum = max(
        -1.0,
        min(1.0, momentum_score),
    )

    if trend == 0.0 or momentum == 0.0:
        return 50.0

    if trend * momentum > 0:
        alignment = min(
            abs(trend),
            abs(momentum),
        )

        return round(
            50.0 + (alignment * 50.0),
            1,
        )

    conflict = min(
        abs(trend),
        abs(momentum),
    )

    return round(
        50.0 - (conflict * 50.0),
        1,
    )


def calculate_volatility_quality(
    volatility_score: float,
) -> float:
    """
    Convert the existing volatility score
    into a 0-100 quality component.
    """
    return round(
        _clamp(
            volatility_score * 100
        ),
        1,
    )


def calculate_risk_quality(
    risk_level: str,
) -> float:
    """
    Convert the existing risk assessment
    into a ranking-quality component.
    """
    risk_scores = {
        "LOWER": 100.0,
        "MODERATE": 70.0,
        "ELEVATED": 35.0,
    }

    return risk_scores.get(
        risk_level.upper(),
        50.0,
    )


def calculate_quality_score(
    *,
    confidence: float,
    directional_score: float,
    trend_score: float,
    momentum_score: float,
    volatility_score: float,
    risk_level: str,
) -> dict:
    """
    Calculate the overall Signal Quality Score.

    This score measures the strength and consistency
    of the quantitative evidence. It is NOT a
    probability of trade success.
    """
    directional_strength = (
        calculate_directional_strength(
            directional_score
        )
    )

    confidence_score = _clamp(
        confidence
    )

    indicator_agreement = (
        calculate_indicator_agreement(
            trend_score,
            momentum_score,
        )
    )

    volatility_quality = (
        calculate_volatility_quality(
            volatility_score
        )
    )

    risk_quality = calculate_risk_quality(
        risk_level
    )

    quality_score = (
        directional_strength
        * QUALITY_WEIGHTS["directional_strength"]
        + confidence_score
        * QUALITY_WEIGHTS["confidence"]
        + indicator_agreement
        * QUALITY_WEIGHTS["indicator_agreement"]
        + volatility_quality
        * QUALITY_WEIGHTS["volatility_quality"]
        + risk_quality
        * QUALITY_WEIGHTS["risk_quality"]
    )

    quality_score = round(
        _clamp(quality_score),
        1,
    )

    if quality_score >= 90:
        quality_grade = "EXCEPTIONAL"
    elif quality_score >= 80:
        quality_grade = "STRONG"
    elif quality_score >= 70:
        quality_grade = "GOOD"
    elif quality_score >= 60:
        quality_grade = "MODERATE"
    else:
        quality_grade = "WEAK"

    return {
        "quality_score": quality_score,
        "quality_grade": quality_grade,
        "components": {
            "directional_strength": directional_strength,
            "confidence": round(
                confidence_score,
                1,
            ),
            "indicator_agreement": indicator_agreement,
            "volatility_quality": volatility_quality,
            "risk_quality": risk_quality,
        },
    }
