from app.ai_engine import (
    _build_prompt,
    _normalise_interpretation,
)


def make_enriched_analysis():
    return {
        "symbol": "EUR/USD",
        "interval": "5m",
        "price": 1.16032,
        "direction": "UP",
        "confidence": 93.2,
        "trend": "STRONG_BULLISH",
        "momentum": "STRONG_POSITIVE",
        "volatility": "LOW",
        "scores": {
            "trend": 0.85,
            "momentum": 0.90,
            "volatility": 1.0,
            "directional": 0.85,
        },
        "indicators": {
            "ema20": 1.15950,
            "ema50": 1.15820,
            "rsi14": 68.4,
            "macd": 0.0012,
            "atr14": 0.0008,
        },
        "risk": {
            "risk_level": "LOWER",
            "reason": "Strong trend and momentum with low volatility.",
        },
        "quality": {
            "quality_score": 92.7,
            "quality_grade": "EXCEPTIONAL",
            "components": {
                "directional_strength": 85.0,
                "confidence": 93.2,
                "indicator_agreement": 100.0,
                "volatility_quality": 100.0,
                "risk_quality": 100.0,
            },
        },
        "ranking": {
            "score": 91.7,
            "rank": 1,
        },
        "opportunity": {
            "score": 93.1,
            "rank": 1,
        },
        "data_points": 100,
    }


def test_build_prompt_includes_quality_ranking_and_opportunity():
    analysis = make_enriched_analysis()

    prompt = _build_prompt(
        analysis
    )

    assert "quality" in prompt
    assert "quality_score" in prompt
    assert "quality_grade" in prompt

    assert "ranking" in prompt
    assert "score" in prompt
    assert "rank" in prompt

    assert "opportunity" in prompt

    assert "92.7" in prompt
    assert "EXCEPTIONAL" in prompt
    assert "91.7" in prompt
    assert "93.1" in prompt


def test_build_prompt_preserves_existing_quantitative_context():
    analysis = make_enriched_analysis()

    prompt = _build_prompt(
        analysis
    )

    assert "EUR/USD" in prompt
    assert "5m" in prompt
    assert "1.16032" in prompt
    assert "93.2" in prompt
    assert "STRONG_BULLISH" in prompt
    assert "STRONG_POSITIVE" in prompt
    assert "LOW" in prompt
    assert "ema20" in prompt
    assert "ema50" in prompt
    assert "rsi14" in prompt
    assert "macd" in prompt
    assert "atr14" in prompt


def test_normalise_interpretation_preserves_exactly_seven_fields():
    interpretation = {
        "summary": "The market currently shows bullish conditions.",
        "market_view": "The current direction is upward.",
        "evidence": [
            "Trend is strongly bullish.",
            "Momentum is strongly positive.",
            "Volatility is low.",
        ],
        "uncertainty": "Conditions can change as new market data arrives.",
        "risk_commentary": "The supplied risk classification reflects the current analytical inputs.",
        "confidence_note": "The confidence value is a model-confidence score, not a calibrated probability.",
        "educational_note": "This analysis describes current conditions and does not guarantee future outcomes.",
    }

    result = _normalise_interpretation(
        interpretation,
        make_enriched_analysis(),
    )

    expected_fields = {
        "summary",
        "market_view",
        "evidence",
        "uncertainty",
        "risk_commentary",
        "confidence_note",
        "educational_note",
    }

    assert set(result.keys()) == expected_fields
    assert len(result["evidence"]) == 3


def test_normalise_interpretation_limits_evidence_to_five_items():
    interpretation = {
        "summary": "Summary",
        "market_view": "Market view",
        "evidence": [
            "Evidence 1",
            "Evidence 2",
            "Evidence 3",
            "Evidence 4",
            "Evidence 5",
            "Evidence 6",
            "Evidence 7",
        ],
        "uncertainty": "Uncertainty",
        "risk_commentary": "Risk commentary",
        "confidence_note": "Confidence note",
        "educational_note": "Educational note",
    }

    result = _normalise_interpretation(
        interpretation,
        make_enriched_analysis(),
    )

    assert len(result["evidence"]) == 5


def test_normalise_interpretation_adds_missing_fields():
    interpretation = {
        "summary": "Current market summary.",
    }

    result = _normalise_interpretation(
        interpretation,
        make_enriched_analysis(),
    )

    expected_fields = {
        "summary",
        "market_view",
        "evidence",
        "uncertainty",
        "risk_commentary",
        "confidence_note",
        "educational_note",
    }

    assert set(result.keys()) == expected_fields
    assert isinstance(result["evidence"], list)
    assert len(result["evidence"]) >= 1


def test_normalise_interpretation_sanitises_non_ascii_text():
    interpretation = {
        "summary": "Bullish — current trend is strong.",
        "market_view": "The market’s direction is upward.",
        "evidence": [
            "EMA20 is above EMA50.",
        ],
        "uncertainty": "Conditions may change.",
        "risk_commentary": "Risk remains analytical only.",
        "confidence_note": "Confidence is not probability.",
        "educational_note": "No outcome is guaranteed.",
    }

    result = _normalise_interpretation(
        interpretation,
        make_enriched_analysis(),
    )

    for value in result.values():
        if isinstance(value, list):
            for item in value:
                assert all(
                    ord(character) < 128
                    for character in item
                )
        else:
            assert all(
                ord(character) < 128
                for character in value
            )

def test_build_prompt_rsi_36_27_is_not_oversold_or_overbought():
    analysis = make_enriched_analysis()
    analysis["indicators"]["rsi14"] = 36.27

    prompt = _build_prompt(
        analysis
    )

    assert "RSI14 is 36.27" in prompt
    assert "MUST NOT be described as oversold or overbought" in prompt
    assert "This value is between 30 and 70" in prompt
