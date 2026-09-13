from __future__ import annotations


RANKING_WEIGHTS = {
    "quality": 0.60,
    "confidence": 0.25,
    "directional_strength": 0.15,
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


def calculate_ranking_score(
    *,
    quality_score: float,
    confidence: float,
    directional_score: float,
) -> float:
    """
    Calculate a comparative ranking score.

    This score is used to compare signals against
    each other. It is NOT a probability of trade success.
    """
    quality = _clamp(
        quality_score
    )

    confidence_value = _clamp(
        confidence
    )

    directional_strength = _clamp(
        abs(directional_score) * 100
    )

    ranking_score = (
        quality
        * RANKING_WEIGHTS["quality"]
        + confidence_value
        * RANKING_WEIGHTS["confidence"]
        + directional_strength
        * RANKING_WEIGHTS["directional_strength"]
    )

    return round(
        _clamp(ranking_score),
        1,
    )


def rank_signals(
    signals: list[dict],
) -> list[dict]:
    """
    Rank a collection of generated signals from
    strongest to weakest.

    The original signal dictionaries are not modified.
    """
    ranked = []

    for signal in signals:
        quality = signal.get(
            "quality",
            {},
        )

        scores = signal.get(
            "scores",
            {},
        )

        ranking_score = calculate_ranking_score(
            quality_score=quality.get(
                "quality_score",
                0.0,
            ),
            confidence=signal.get(
                "confidence",
                0.0,
            ),
            directional_score=scores.get(
                "directional",
                0.0,
            ),
        )

        ranked_signal = {
            **signal,
            "ranking": {
                "score": ranking_score,
            },
        }

        ranked.append(
            ranked_signal
        )

    ranked.sort(
        key=lambda item: item["ranking"]["score"],
        reverse=True,
    )

    for position, signal in enumerate(
        ranked,
        start=1,
    ):
        signal["ranking"]["rank"] = position

    return ranked
