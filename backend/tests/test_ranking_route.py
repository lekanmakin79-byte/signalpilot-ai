from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_ranking_rejects_limit_below_50():
    response = client.get(
        "/signals/ranking?interval=5m&limit=49"
    )

    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "At least 50 candles are required to rank signals."
    )


def test_ranking_rejects_limit_above_5000():
    response = client.get(
        "/signals/ranking?interval=5m&limit=5001"
    )

    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "Maximum candle limit is 5000."
    )


def test_ranking_normalizes_interval(monkeypatch):
    async def fake_get_candles(
        symbol,
        interval,
        outputsize,
    ):
        return [
            {
                "datetime": f"2026-01-01T00:{index:02d}:00",
                "open": 100.0,
                "high": 101.0,
                "low": 99.0,
                "close": 100.0,
                "volume": 1000.0,
            }
            for index in range(outputsize)
        ]

    def fake_generate_signal(
        symbol,
        candles,
        timeframe,
    ):
        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "price": 100.0,
            "direction": "UP",
            "confidence": 80.0,
            "scores": {
                "directional": 0.8,
            },
            "quality": {
                "quality_score": 85.0,
                "quality_grade": "STRONG",
                "components": {
                    "directional_strength": 80.0,
                    "confidence": 80.0,
                    "indicator_agreement": 100.0,
                    "volatility_quality": 80.0,
                    "risk_quality": 70.0,
                },
            },
        }

    monkeypatch.setattr(
        "app.routes.ranking.get_candles",
        fake_get_candles,
    )

    monkeypatch.setattr(
        "app.routes.ranking.generate_signal",
        fake_generate_signal,
    )

    response = client.get(
        "/signals/ranking?interval=%205M%20&limit=50"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["interval"] == "5m"
    assert data["data_points"] == 50
    assert data["count"] == 4


def test_ranking_returns_all_supported_markets(monkeypatch):
    async def fake_get_candles(
        symbol,
        interval,
        outputsize,
    ):
        return []

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
        }

    monkeypatch.setattr(
        "app.routes.ranking.get_candles",
        fake_get_candles,
    )

    monkeypatch.setattr(
        "app.routes.ranking.generate_signal",
        fake_generate_signal,
    )

    response = client.get(
        "/signals/ranking?interval=5m&limit=100"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["count"] == 4
    assert len(data["signals"]) == 4

    symbols = {
        signal["symbol"]
        for signal in data["signals"]
    }

    assert symbols == {
        "EUR/USD",
        "GBP/USD",
        "USD/JPY",
        "XAU/USD",
    }


def test_ranking_assigns_positions_in_descending_order(
    monkeypatch,
):
    async def fake_get_candles(
        symbol,
        interval,
        outputsize,
    ):
        return []

    quality_scores = {
        "EUR/USD": 95.0,
        "GBP/USD": 85.0,
        "USD/JPY": 75.0,
        "XAU/USD": 65.0,
    }

    def fake_generate_signal(
        symbol,
        candles,
        timeframe,
    ):
        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "confidence": quality_scores[symbol],
            "scores": {
                "directional": 0.8,
            },
            "quality": {
                "quality_score": quality_scores[symbol],
                "quality_grade": "STRONG",
                "components": {},
            },
        }

    monkeypatch.setattr(
        "app.routes.ranking.get_candles",
        fake_get_candles,
    )

    monkeypatch.setattr(
        "app.routes.ranking.generate_signal",
        fake_generate_signal,
    )

    response = client.get(
        "/signals/ranking?interval=5m&limit=100"
    )

    assert response.status_code == 200

    signals = response.json()["signals"]

    assert [
        signal["symbol"]
        for signal in signals
    ] == [
        "EUR/USD",
        "GBP/USD",
        "USD/JPY",
        "XAU/USD",
    ]

    assert [
        signal["ranking"]["rank"]
        for signal in signals
    ] == [1, 2, 3, 4]

    scores = [
        signal["ranking"]["score"]
        for signal in signals
    ]

    assert scores == sorted(
        scores,
        reverse=True,
    )


def test_ranking_includes_quality_data(monkeypatch):
    async def fake_get_candles(
        symbol,
        interval,
        outputsize,
    ):
        return []

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
                "components": {
                    "directional_strength": 80.0,
                    "confidence": 80.0,
                    "indicator_agreement": 100.0,
                    "volatility_quality": 80.0,
                    "risk_quality": 70.0,
                },
            },
        }

    monkeypatch.setattr(
        "app.routes.ranking.get_candles",
        fake_get_candles,
    )

    monkeypatch.setattr(
        "app.routes.ranking.generate_signal",
        fake_generate_signal,
    )

    response = client.get(
        "/signals/ranking?interval=5m&limit=100"
    )

    assert response.status_code == 200

    for signal in response.json()["signals"]:
        assert "quality" in signal
        assert "quality_score" in signal["quality"]
        assert "quality_grade" in signal["quality"]


def test_ranking_maps_provider_error_to_502(monkeypatch):
    async def fake_get_candles(
        symbol,
        interval,
        outputsize,
    ):
        raise RuntimeError(
            "Market data provider unavailable."
        )

    monkeypatch.setattr(
        "app.routes.ranking.get_candles",
        fake_get_candles,
    )

    response = client.get(
        "/signals/ranking?interval=5m&limit=100"
    )

    assert response.status_code == 502
    assert (
        response.json()["detail"]
        == "Market data provider unavailable."
    )
