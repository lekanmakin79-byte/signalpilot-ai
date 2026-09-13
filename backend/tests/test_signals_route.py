from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def make_candles(
    count: int = 100,
    direction: str = "UP",
) -> list[dict]:
    candles = []

    for index in range(count):
        if direction == "UP":
            price = 1.1000 + (index * 0.0005)
        else:
            price = 1.2000 - (index * 0.0005)

        candles.append(
            {
                "datetime": (
                    f"2026-01-01 00:"
                    f"{index % 60:02d}:00"
                ),
                "open": price,
                "high": price + 0.0002,
                "low": price - 0.0002,
                "close": price,
            }
        )

    return candles


def test_signals_route_rejects_less_than_50_candles():
    response = client.get(
        "/signals/EUR/USD?interval=5m&limit=49"
    )

    assert response.status_code == 400

    body = response.json()

    assert body["detail"] == (
        "At least 50 candles are required "
        "to generate a signal."
    )


def test_signals_route_rejects_more_than_5000_candles():
    response = client.get(
        "/signals/EUR/USD?interval=5m&limit=5001"
    )

    assert response.status_code == 400

    body = response.json()

    assert body["detail"] == (
        "Maximum candle limit is 5000."
    )


def test_signals_route_normalizes_symbol_and_interval(
    monkeypatch,
):
    captured = {}

    async def fake_get_candles(
        symbol,
        interval,
        outputsize,
    ):
        captured["symbol"] = symbol
        captured["interval"] = interval
        captured["outputsize"] = outputsize

        return make_candles(100)

    monkeypatch.setattr(
        "app.routes.signals.get_candles",
        fake_get_candles,
    )

    response = client.get(
        "/signals/eur/usd?interval=5M&limit=100"
    )

    assert response.status_code == 200

    assert captured["symbol"] == "EUR/USD"
    assert captured["interval"] == "5m"
    assert captured["outputsize"] == 100


def test_signals_route_returns_signal_and_history_id(
    monkeypatch,
):
    async def fake_get_candles(
        symbol,
        interval,
        outputsize,
    ):
        return make_candles(
            count=100,
            direction="UP",
        )

    monkeypatch.setattr(
        "app.routes.signals.get_candles",
        fake_get_candles,
    )

    response = client.get(
        "/signals/EUR/USD?interval=5m&limit=100"
    )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert "signal" in body
    assert "history_id" in body

    assert isinstance(
        body["history_id"],
        int,
    )

    signal = body["signal"]

    assert signal["symbol"] == "EUR/USD"
    assert signal["timeframe"] == "5m"
    assert signal["data_points"] == 100

    assert signal["direction"] in {
        "UP",
        "DOWN",
        "NEUTRAL",
    }

    assert 0 <= signal["confidence"] <= 100
    
    assert "quality" in signal

    quality = signal["quality"]

    assert {
        "quality_score",
        "quality_grade",
        "components",
    }.issubset(
        quality.keys()
    )

    assert 0 <= quality["quality_score"] <= 100

    assert quality["quality_grade"] in {
        "EXCEPTIONAL",
        "STRONG",
        "GOOD",
        "MODERATE",
        "WEAK",
    }


def test_signals_route_records_signal_in_history(
    monkeypatch,
):
    async def fake_get_candles(
        symbol,
        interval,
        outputsize,
    ):
        return make_candles(
            count=100,
            direction="DOWN",
        )

    monkeypatch.setattr(
        "app.routes.signals.get_candles",
        fake_get_candles,
    )

    response = client.get(
        "/signals/USD/JPY?interval=15m&limit=100"
    )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True

    signal = body["signal"]
    history_id = body["history_id"]

    assert history_id is not None

    assert signal["symbol"] == "USD/JPY"
    assert signal["timeframe"] == "15m"


def test_signals_route_returns_400_for_invalid_market_data(
    monkeypatch,
):
    async def fake_get_candles(
        symbol,
        interval,
        outputsize,
    ):
        candles = make_candles(100)
        candles[-1]["close"] = "invalid"
        return candles

    monkeypatch.setattr(
        "app.routes.signals.get_candles",
        fake_get_candles,
    )

    response = client.get(
        "/signals/EUR/USD?interval=5m&limit=100"
    )

    assert response.status_code == 400

    body = response.json()

    assert body["detail"] == (
        "Market data contains an invalid "
        "closing price."
    )


def test_signals_route_maps_runtime_error_to_502(
    monkeypatch,
):
    async def fake_get_candles(
        symbol,
        interval,
        outputsize,
    ):
        raise RuntimeError(
            "Market-data provider rate limit reached."
        )

    monkeypatch.setattr(
        "app.routes.signals.get_candles",
        fake_get_candles,
    )

    response = client.get(
        "/signals/EUR/USD?interval=5m&limit=100"
    )

    assert response.status_code == 502

    body = response.json()

    assert body["detail"] == (
        "Market-data provider rate limit reached."
    )