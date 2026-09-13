from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def make_candles(count: int = 100):
    return [
        {
            "datetime": f"2026-09-10 10:{index:02d}:00",
            "open": "1.16000",
            "high": "1.16100",
            "low": "1.15900",
            "close": f"{1.16000 + (index * 0.00001):.5f}",
            "volume": "1000",
        }
        for index in range(count)
    ]


def make_quantitative_analysis():
    return {
        "symbol": "EUR/USD",
        "timeframe": "5m",
        "price": 1.16100,
        "indicators": {
            "ema20": 1.16080,
            "ema50": 1.16050,
            "rsi14": 58.2,
            "macd": {
                "macd": 0.00012,
                "signal": 0.00008,
                "histogram": 0.00004,
            },
            "atr14": 0.00021,
        },
        "volatility": "LOW",
        "trend": "STRONG_BULLISH",
        "momentum": "STRONG_POSITIVE",
        "scores": {
            "trend": 1.0,
            "momentum": 1.0,
            "volatility": 1.0,
            "directional": 0.85,
        },
        "confidence": 93.2,
        "risk": {
            "risk_level": "LOWER",
            "factors": [
                "No major analytical conflict detected."
            ],
        },
    }


def make_ai_interpretation():
    return {
        "summary": "The market shows a bullish quantitative bias.",
        "market_view": "Trend and momentum are aligned to the upside.",
        "uncertainty": "Short-term market conditions can change quickly.",
        "risk_commentary": "Current quantitative risk is relatively contained.",
        "confidence_note": "Confidence is supported by aligned trend and momentum.",
        "educational_note": "Technical indicators provide probabilities rather than certainty.",
        "evidence": [
            "Strong bullish trend structure.",
            "Positive momentum.",
            "Low volatility.",
        ],
    }


def test_analysis_rejects_invalid_market_data():
    with patch(
        "app.routes.analysis.get_candles",
        new=AsyncMock(
            side_effect=ValueError(
                "Unsupported market symbol."
            )
        ),
    ):
        response = client.get(
            "/analysis/INVALID/USD"
        )

    assert response.status_code == 404
    assert response.json()["detail"] == (
        "Unsupported market symbol."
    )


def test_analysis_maps_runtime_error_to_502():
    with patch(
        "app.routes.analysis.get_candles",
        new=AsyncMock(
            side_effect=RuntimeError(
                "Market-data provider rate limit reached."
            )
        ),
    ):
        response = client.get(
            "/analysis/EUR/USD"
        )

    assert response.status_code == 502
    assert response.json()["detail"] == (
        "Market-data provider rate limit reached."
    )


def test_analysis_returns_quantitative_analysis():
    candles = make_candles()

    with patch(
        "app.routes.analysis.get_candles",
        new=AsyncMock(return_value=candles),
    ), patch(
        "app.routes.analysis.analyze_market",
        return_value=make_quantitative_analysis(),
    ) as mocked_analysis:
        response = client.get(
            "/analysis/EUR/USD?interval=5m&limit=100"
        )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert "analysis" in body

    assert body["analysis"]["symbol"] == "EUR/USD"
    assert body["analysis"]["timeframe"] == "5m"
    assert body["analysis"]["confidence"] == 93.2

    mocked_analysis.assert_called_once_with(
        symbol="EUR/USD",
        interval="5m",
        candles=candles,
    )


def test_analysis_passes_interval_and_candles_to_engine():
    candles = make_candles(120)

    with patch(
        "app.routes.analysis.get_candles",
        new=AsyncMock(return_value=candles),
    ) as mocked_candles, patch(
        "app.routes.analysis.analyze_market",
        return_value=make_quantitative_analysis(),
    ) as mocked_analysis:
        response = client.get(
            "/analysis/GBP/USD?interval=15m&limit=120"
        )

    assert response.status_code == 200

    mocked_candles.assert_awaited_once_with(
        symbol="GBP/USD",
        interval="15m",
        outputsize=120,
    )

    mocked_analysis.assert_called_once_with(
        symbol="GBP/USD",
        interval="15m",
        candles=candles,
    )


def test_ai_analysis_route_returns_quantitative_and_ai_results():
    candles = make_candles()

    quantitative_analysis = make_quantitative_analysis()
    ai_interpretation = make_ai_interpretation()

    market_intelligence = [
        {
            "symbol": "EUR/USD",
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
        },
    ]

    expected_analysis = {
        **quantitative_analysis,
        "quality": market_intelligence[0]["quality"],
        "ranking": market_intelligence[0]["ranking"],
        "opportunity": market_intelligence[0]["opportunity"],
    }

    with patch(
        "app.routes.analysis.get_candles",
        new=AsyncMock(return_value=candles),
    ), patch(
        "app.routes.analysis.analyze_market",
        return_value=quantitative_analysis,
    ), patch(
        "app.routes.analysis.build_market_intelligence",
        new=AsyncMock(
            return_value=market_intelligence
        ),
    ), patch(
        "app.routes.analysis.interpret_analysis",
        new=AsyncMock(return_value=ai_interpretation),
    ) as mocked_ai:
        response = client.get(
            "/analysis/EUR/USD/ai?interval=5m&limit=100"
        )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert body["analysis"] == expected_analysis
    assert body["ai"] == ai_interpretation

    mocked_ai.assert_awaited_once_with(
        expected_analysis
    )


def test_ai_analysis_route_ordering_is_correct():
    candles = make_candles()

    with patch(
        "app.routes.analysis.get_candles",
        new=AsyncMock(return_value=candles),
    ), patch(
        "app.routes.analysis.analyze_market",
        return_value=make_quantitative_analysis(),
    ), patch(
        "app.routes.analysis.interpret_analysis",
        new=AsyncMock(
            return_value=make_ai_interpretation()
        ),
    ):
        response = client.get(
            "/analysis/EUR/USD/ai"
        )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert "analysis" in body
    assert "ai" in body


def test_ai_analysis_maps_value_error_to_404():
    with patch(
        "app.routes.analysis.get_candles",
        new=AsyncMock(
            return_value=make_candles()
        ),
    ), patch(
        "app.routes.analysis.analyze_market",
        side_effect=ValueError(
            "Insufficient market data."
        ),
    ):
        response = client.get(
            "/analysis/EUR/USD/ai"
        )

    assert response.status_code == 404
    assert response.json()["detail"] == (
        "Insufficient market data."
    )


def test_ai_analysis_maps_runtime_error_to_502():
    with patch(
        "app.routes.analysis.get_candles",
        new=AsyncMock(
            side_effect=RuntimeError(
                "Unable to connect to the market-data provider."
            )
        ),
    ):
        response = client.get(
            "/analysis/EUR/USD/ai"
        )

    assert response.status_code == 502
    assert response.json()["detail"] == (
        "Unable to connect to the market-data provider."
    )


def test_ai_analysis_passes_enriched_analysis_to_ai_engine():
    candles = make_candles()

    quantitative_analysis = make_quantitative_analysis()

    market_intelligence = [
        {
            "symbol": "GBP/USD",
            "quality": {
                "quality_score": 85.5,
                "quality_grade": "STRONG",
                "components": {
                    "directional_strength": 80.0,
                    "confidence": 90.0,
                    "indicator_agreement": 85.0,
                    "volatility_quality": 80.0,
                    "risk_quality": 70.0,
                },
            },
            "ranking": {
                "score": 82.4,
                "rank": 2,
            },
            "opportunity": {
                "score": 84.1,
                "rank": 2,
            },
        },
    ]

    expected_analysis = {
        **quantitative_analysis,
        "quality": market_intelligence[0]["quality"],
        "ranking": market_intelligence[0]["ranking"],
        "opportunity": market_intelligence[0]["opportunity"],
    }

    with patch(
        "app.routes.analysis.get_candles",
        new=AsyncMock(return_value=candles),
    ), patch(
        "app.routes.analysis.analyze_market",
        return_value=quantitative_analysis,
    ), patch(
        "app.routes.analysis.build_market_intelligence",
        new=AsyncMock(
            return_value=market_intelligence
        ),
    ), patch(
        "app.routes.analysis.interpret_analysis",
        new=AsyncMock(
            return_value=make_ai_interpretation()
        ),
    ) as mocked_ai:
        response = client.get(
            "/analysis/GBP/USD/ai?interval=15m&limit=120"
        )

    assert response.status_code == 200

    mocked_ai.assert_awaited_once_with(
        expected_analysis
    )