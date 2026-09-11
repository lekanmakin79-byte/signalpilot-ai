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


def test_strategy_lab_rejects_invalid_market():
    response = client.get(
        "/strategy-lab/backtest"
        "?symbol=BTC/USD"
        "&timeframe=5m"
        "&limit=100"
    )

    assert response.status_code == 400

    body = response.json()

    assert body["detail"] == (
        "Unsupported market: BTC/USD"
    )


def test_strategy_lab_rejects_invalid_timeframe():
    response = client.get(
        "/strategy-lab/backtest"
        "?symbol=EUR/USD"
        "&timeframe=2h"
        "&limit=100"
    )

    assert response.status_code == 400

    body = response.json()

    assert body["detail"] == (
        "Unsupported interval: 2h"
    )


def test_strategy_lab_rejects_limit_below_52():
    response = client.get(
        "/strategy-lab/backtest"
        "?symbol=EUR/USD"
        "&timeframe=5m"
        "&limit=51"
    )

    assert response.status_code == 422


def test_strategy_lab_rejects_limit_above_5000():
    response = client.get(
        "/strategy-lab/backtest"
        "?symbol=EUR/USD"
        "&timeframe=5m"
        "&limit=5001"
    )

    assert response.status_code == 422


def test_strategy_lab_rejects_confidence_above_95():
    response = client.get(
        "/strategy-lab/backtest"
        "?symbol=EUR/USD"
        "&timeframe=5m"
        "&limit=100"
        "&minimum_confidence=96"
    )

    assert response.status_code == 422


def test_strategy_lab_rejects_negative_confidence():
    response = client.get(
        "/strategy-lab/backtest"
        "?symbol=EUR/USD"
        "&timeframe=5m"
        "&limit=100"
        "&minimum_confidence=-1"
    )

    assert response.status_code == 422


def test_strategy_lab_normalizes_symbol_and_timeframe(
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
        "app.routes.strategy_lab.get_candles",
        fake_get_candles,
    )

    response = client.get(
        "/strategy-lab/backtest"
        "?symbol=eur/usd"
        "&timeframe=5M"
        "&limit=100"
    )

    assert response.status_code == 200

    assert captured["symbol"] == "EUR/USD"
    assert captured["interval"] == "5m"
    assert captured["outputsize"] == 100


def test_strategy_lab_returns_backtest_result(
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
        "app.routes.strategy_lab.get_candles",
        fake_get_candles,
    )

    response = client.get(
        "/strategy-lab/backtest"
        "?symbol=EUR/USD"
        "&timeframe=5m"
        "&limit=100"
    )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert "backtest" in body
    assert "results" in body

    backtest = body["backtest"]

    assert backtest["symbol"] == "EUR/USD"
    assert backtest["timeframe"] == "5m"
    assert backtest["candles_used"] == 100
    assert backtest["warmup_candles"] == 50
    assert backtest["possible_evaluations"] == 49


def test_strategy_lab_returns_detailed_results(
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
        "app.routes.strategy_lab.get_candles",
        fake_get_candles,
    )

    response = client.get(
        "/strategy-lab/backtest"
        "?symbol=EUR/USD"
        "&timeframe=5m"
        "&limit=100"
    )

    assert response.status_code == 200

    body = response.json()

    results = body["results"]

    assert isinstance(results, list)
    assert len(results) > 0

    first_result = results[0]

    expected_keys = {
        "timestamp",
        "symbol",
        "timeframe",
        "signal_price",
        "evaluation_price",
        "direction",
        "confidence",
        "price_change_percent",
        "outcome",
        "hypothetical_directional_change_percent",
    }

    assert expected_keys.issubset(
        first_result.keys()
    )


def test_strategy_lab_applies_confidence_filter(
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
        "app.routes.strategy_lab.get_candles",
        fake_get_candles,
    )

    response = client.get(
        "/strategy-lab/backtest"
        "?symbol=EUR/USD"
        "&timeframe=5m"
        "&limit=100"
        "&minimum_confidence=90"
    )

    assert response.status_code == 200

    body = response.json()

    backtest = body["backtest"]

    assert backtest["minimum_confidence"] == 90.0

    assert (
        backtest["signals_evaluated"]
        <= backtest["signals_generated"]
    )

    assert (
        backtest["signals_filtered"]
        == (
            backtest["signals_generated"]
            - backtest["signals_evaluated"]
        )
    )


def test_strategy_lab_maps_runtime_error_to_502(
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
        "app.routes.strategy_lab.get_candles",
        fake_get_candles,
    )

    response = client.get(
        "/strategy-lab/backtest"
        "?symbol=EUR/USD"
        "&timeframe=5m"
        "&limit=100"
    )

    assert response.status_code == 502

    body = response.json()

    assert body["detail"] == (
        "Market-data provider rate limit reached."
    )


def test_strategy_lab_maps_http_status_error_to_502(
    monkeypatch,
):
    import httpx

    async def fake_get_candles(
        symbol,
        interval,
        outputsize,
    ):
        request = httpx.Request(
            "GET",
            "https://example.com",
        )

        response = httpx.Response(
            429,
            request=request,
        )

        raise httpx.HTTPStatusError(
            "Rate limited",
            request=request,
            response=response,
        )

    monkeypatch.setattr(
        "app.routes.strategy_lab.get_candles",
        fake_get_candles,
    )

    response = client.get(
        "/strategy-lab/backtest"
        "?symbol=EUR/USD"
        "&timeframe=5m"
        "&limit=100"
    )

    assert response.status_code == 502

    body = response.json()

    assert body["detail"] == (
        "Market-data provider returned an HTTP error "
        "(status 429)."
    )


def test_strategy_lab_maps_request_error_to_502(
    monkeypatch,
):
    import httpx

    async def fake_get_candles(
        symbol,
        interval,
        outputsize,
    ):
        request = httpx.Request(
            "GET",
            "https://example.com",
        )

        raise httpx.RequestError(
            "Connection failed",
            request=request,
        )

    monkeypatch.setattr(
        "app.routes.strategy_lab.get_candles",
        fake_get_candles,
    )

    response = client.get(
        "/strategy-lab/backtest"
        "?symbol=EUR/USD"
        "&timeframe=5m"
        "&limit=100"
    )

    assert response.status_code == 502

    body = response.json()

    assert (
        "Unable to connect to the market-data provider"
        in body["detail"]
    )