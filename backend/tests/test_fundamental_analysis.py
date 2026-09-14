from app.fundamental_analysis import (
    build_fundamental_analysis,
)


def test_fundamental_analysis_without_provider_data():
    result = build_fundamental_analysis(
        symbol="EUR/USD",
    )

    assert result["available"] is False
    assert result["status"] == "DATA_UNAVAILABLE"
    assert result["bias"] == "NEUTRAL"
    assert result["score"] is None


def test_fundamental_analysis_with_provider_data():
    result = build_fundamental_analysis(
        symbol="EUR/USD",
        data={
            "provider": "test-provider",
            "score": 25,
            "factors": [
                {
                    "name": "interest_rate_differential",
                    "value": 25,
                    "direction": "positive",
                }
            ],
            "updated_at": "2026-01-01T00:00:00Z",
        },
    )

    assert result["available"] is True
    assert result["status"] == "AVAILABLE"
    assert result["bias"] == "POSITIVE"
    assert result["score"] == 25
    assert len(result["factors"]) == 1