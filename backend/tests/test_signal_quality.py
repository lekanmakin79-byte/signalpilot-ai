from app.signal_quality import (
    calculate_indicator_agreement,
    calculate_quality_score,
)


def test_indicator_agreement_is_high_when_trend_and_momentum_align():
    score = calculate_indicator_agreement(
        trend_score=1.0,
        momentum_score=1.0,
    )

    assert score == 100.0


def test_indicator_agreement_is_low_when_trend_and_momentum_conflict():
    score = calculate_indicator_agreement(
        trend_score=1.0,
        momentum_score=-1.0,
    )

    assert score == 0.0


def test_indicator_agreement_is_neutral_when_one_component_is_neutral():
    score = calculate_indicator_agreement(
        trend_score=1.0,
        momentum_score=0.0,
    )

    assert score == 50.0


def test_strong_signal_receives_strong_quality_score():
    result = calculate_quality_score(
        confidence=85.0,
        directional_score=0.85,
        trend_score=1.0,
        momentum_score=1.0,
        volatility_score=0.75,
        risk_level="LOWER",
    )

    assert result["quality_score"] >= 80.0
    assert result["quality_grade"] == "STRONG"


def test_conflicting_signal_receives_lower_quality_score():
    result = calculate_quality_score(
        confidence=70.0,
        directional_score=0.20,
        trend_score=1.0,
        momentum_score=-1.0,
        volatility_score=0.35,
        risk_level="ELEVATED",
    )

    assert result["quality_score"] < 70.0
    assert result["quality_grade"] in {
        "MODERATE",
        "WEAK",
    }


def test_quality_score_is_not_a_probability():
    result = calculate_quality_score(
        confidence=95.0,
        directional_score=1.0,
        trend_score=1.0,
        momentum_score=1.0,
        volatility_score=1.0,
        risk_level="LOWER",
    )

    assert result["quality_score"] == 98.5
    assert result["quality_score"] <= 100.0
