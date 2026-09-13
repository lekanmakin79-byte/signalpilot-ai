from app.signal_ranking import (
    calculate_ranking_score,
    rank_signals,
)


def test_ranking_score_is_calculated():
    score = calculate_ranking_score(
        quality_score=90.0,
        confidence=85.0,
        directional_score=0.80,
    )

    assert score == 87.2


def test_ranking_score_is_bounded():
    score = calculate_ranking_score(
        quality_score=150.0,
        confidence=150.0,
        directional_score=5.0,
    )

    assert score == 100.0


def test_ranking_score_uses_absolute_directional_strength():
    up_score = calculate_ranking_score(
        quality_score=80.0,
        confidence=80.0,
        directional_score=0.80,
    )

    down_score = calculate_ranking_score(
        quality_score=80.0,
        confidence=80.0,
        directional_score=-0.80,
    )

    assert up_score == down_score


def test_rank_signals_orders_strongest_first():
    signals = [
        {
            "symbol": "EUR/USD",
            "confidence": 80.0,
            "scores": {
                "directional": 0.70,
            },
            "quality": {
                "quality_score": 75.0,
            },
        },
        {
            "symbol": "GBP/USD",
            "confidence": 90.0,
            "scores": {
                "directional": 0.90,
            },
            "quality": {
                "quality_score": 92.0,
            },
        },
        {
            "symbol": "USD/JPY",
            "confidence": 70.0,
            "scores": {
                "directional": 0.40,
            },
            "quality": {
                "quality_score": 65.0,
            },
        },
    ]

    ranked = rank_signals(
        signals
    )

    assert [
        signal["symbol"]
        for signal in ranked
    ] == [
        "GBP/USD",
        "EUR/USD",
        "USD/JPY",
    ]


def test_rank_signals_assigns_positions():
    signals = [
        {
            "symbol": "EUR/USD",
            "confidence": 80.0,
            "scores": {
                "directional": 0.80,
            },
            "quality": {
                "quality_score": 85.0,
            },
        },
        {
            "symbol": "GBP/USD",
            "confidence": 70.0,
            "scores": {
                "directional": 0.50,
            },
            "quality": {
                "quality_score": 70.0,
            },
        },
    ]

    ranked = rank_signals(
        signals
    )

    assert ranked[0]["ranking"]["rank"] == 1
    assert ranked[1]["ranking"]["rank"] == 2


def test_rank_signals_does_not_modify_original_signal():
    signal = {
        "symbol": "EUR/USD",
        "confidence": 85.0,
        "scores": {
            "directional": 0.85,
        },
        "quality": {
            "quality_score": 90.0,
        },
    }

    original = {
        **signal,
        "scores": {
            **signal["scores"],
        },
        "quality": {
            **signal["quality"],
        },
    }

    rank_signals(
        [signal]
    )

    assert signal == original
    assert "ranking" not in signal


def test_empty_signal_list_returns_empty_list():
    assert rank_signals([]) == []
