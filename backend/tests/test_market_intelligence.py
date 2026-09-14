from app.market_intelligence import (
    build_market_intelligence,
    get_market_intelligence,
)


def make_candles(count: int = 100) -> list[dict]:
    return [
        {
            "datetime": f"2026-01-01 00:{index % 60:02d}:00",
            "open": 100.0,
            "high": 101.0,
            "low": 99.0,
            "close": 100.0 + (index * 0.01),
            "volume": 1000.0,
        }
        for index in range(count)
    ]


def make_fundamental(symbol: str) -> dict:
    return {
        "symbol": symbol,
        "available": True,
        "status": "available",
        "bias": "POSITIVE",
        "score": 50.0,
        "factors": [],
        "providers": [
            "Test Provider",
        ],
        "source_count": 1,
    }


def make_data_analytics(
    symbol: str,
    interval: str,
) -> dict:
    return {
        "symbol": symbol,
        "interval": interval,
        "descriptive": {},
        "diagnostic": {},
        "predictive": {},
        "prescriptive": {},
    }


def test_build_market_intelligence_uses_all_supported_markets(
    monkeypatch,
):
    calls = []

    async def fake_get_candles(
        symbol,
        interval,
        outputsize,
    ):
        calls.append(
            {
                "symbol": symbol,
                "interval": interval,
                "outputsize": outputsize,
            }
        )
        return make_candles(outputsize)

    def fake_generate_signal(
        symbol,
        candles,
        timeframe,
    ):
        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "confidence": 80.0,
            "scores": {
                "directional": 0.8,
            },
            "quality": {
                "quality_score": 85.0,
                "quality_grade": "STRONG",
                "components": {},
            },
            "risk": {
                "risk_level": "LOWER",
            },
        }

    async def fake_fundamental_analysis(
        symbol,
    ):
        return make_fundamental(symbol)

    def fake_data_analytics(
        symbol,
        interval,
        candles,
    ):
        return make_data_analytics(
            symbol=symbol,
            interval=interval,
        )

    monkeypatch.setattr(
        "app.market_intelligence.get_candles",
        fake_get_candles,
    )

    monkeypatch.setattr(
        "app.market_intelligence.generate_signal",
        fake_generate_signal,
    )

    monkeypatch.setattr(
        "app.market_intelligence.get_market_fundamental_analysis",
        fake_fundamental_analysis,
    )

    monkeypatch.setattr(
        "app.market_intelligence.build_data_analytics",
        fake_data_analytics,
    )

    results = __import__(
        "asyncio"
    ).run(
        build_market_intelligence(
            interval=" 5M ",
            limit=100,
        )
    )

    assert len(results) == 4

    assert {
        item["symbol"]
        for item in results
    } == {
        "EUR/USD",
        "GBP/USD",
        "USD/JPY",
        "XAU/USD",
    }

    assert len(calls) == 4

    assert all(
        call["interval"] == "5m"
        for call in calls
    )

    assert all(
        call["outputsize"] == 100
        for call in calls
    )

    for item in results:
        assert "quality" in item
        assert "ranking" in item
        assert "opportunity" in item
        assert "fundamental" in item
        assert "data_analytics" in item

        assert item["fundamental"]["available"] is True
        assert item["fundamental"]["symbol"] == item["symbol"]

        assert (
            item["data_analytics"]["symbol"]
            == item["symbol"]
        )

        assert (
            item["data_analytics"]["interval"]
            == "5m"
        )

        assert "descriptive" in item["data_analytics"]
        assert "diagnostic" in item["data_analytics"]
        assert "predictive" in item["data_analytics"]
        assert "prescriptive" in item["data_analytics"]


def test_get_market_intelligence_returns_selected_market():
    opportunities = [
        {
            "symbol": "EUR/USD",
            "opportunity": {
                "score": 90.0,
                "rank": 1,
            },
        },
        {
            "symbol": "GBP/USD",
            "opportunity": {
                "score": 80.0,
                "rank": 2,
            },
        },
    ]

    result = get_market_intelligence(
        opportunities,
        "GBP/USD",
    )

    assert result["symbol"] == "GBP/USD"
    assert result["opportunity"]["score"] == 80.0
    assert result["opportunity"]["rank"] == 2


def test_get_market_intelligence_rejects_missing_market():
    opportunities = [
        {
            "symbol": "EUR/USD",
            "opportunity": {
                "score": 90.0,
                "rank": 1,
            },
        },
    ]

    try:
        get_market_intelligence(
            opportunities,
            "USD/JPY",
        )
        assert False, "Expected ValueError."
    except ValueError as error:
        assert str(error) == (
            "Market USD/JPY was not found in the current "
            "market intelligence set."
        )