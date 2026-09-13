from app.opportunity_scanner import (
    calculate_opportunity_score,
    scan_opportunities,
)


def test_calculate_opportunity_score():
    score = calculate_opportunity_score(
        ranking_score=90.0,
        quality_score=90.0,
        confidence=90.0,
        risk_level="LOWER",
    )

    assert score == 91.0


def test_opportunity_score_is_bounded():
    score = calculate_opportunity_score(
        ranking_score=500.0,
        quality_score=500.0,
        confidence=500.0,
        risk_level="LOWER",
    )

    assert 0 <= score <= 100


def test_lower_risk_improves_opportunity_score():
    lower_risk = calculate_opportunity_score(
        ranking_score=80.0,
        quality_score=80.0,
        confidence=80.0,
        risk_level="LOWER",
    )

    elevated_risk = calculate_opportunity_score(
        ranking_score=80.0,
        quality_score=80.0,
        confidence=80.0,
        risk_level="ELEVATED",
    )

    assert lower_risk > elevated_risk


def test_scan_opportunities_sorts_strongest_first():
    signals = [
        {
            "symbol": "EUR/USD",
            "confidence": 70.0,
            "quality": {
                "quality_score": 70.0,
            },
            "ranking": {
                "score": 70.0,
            },
            "risk": {
                "risk_level": "MODERATE",
            },
        },
        {
            "symbol": "USD/JPY",
            "confidence": 90.0,
            "quality": {
                "quality_score": 90.0,
            },
            "ranking": {
                "score": 90.0,
            },
            "risk": {
                "risk_level": "LOWER",
            },
        },
    ]

    result = scan_opportunities(
        signals
    )

    assert result[0]["symbol"] == "USD/JPY"
    assert result[0]["opportunity"]["rank"] == 1
    assert result[1]["opportunity"]["rank"] == 2


def test_scan_opportunities_does_not_modify_original_signals():
    signals = [
        {
            "symbol": "GBP/USD",
            "confidence": 85.0,
            "quality": {
                "quality_score": 85.0,
            },
            "ranking": {
                "score": 85.0,
            },
            "risk": {
                "risk_level": "LOWER",
            },
        },
    ]

    original = signals[0].copy()

    result = scan_opportunities(
        signals
    )

    assert "opportunity" not in original
    assert "opportunity" in result[0]


def test_scan_opportunities_empty_list():
    assert scan_opportunities([]) == []