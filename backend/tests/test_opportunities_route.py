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


def test_opportunities_route_rejects_less_than_50_candles():
    response = client.get(
        "/signals/opportunities?interval=5m&limit=49"
    )

    assert response.status_code == 400

    body = response.json()

    assert body["detail"] == (
        "At least 50 candles are required "
        "to scan opportunities."
    )


def test_opportunities_route_rejects_more_than_5000_candles():
    response = client.get(
        "/signals/opportunities?interval=5m&limit=5001"
    )

    assert response.status_code == 400

    body = response.json()

    assert body["detail"] == (
        "Maximum candle limit is 5000."
    )


def test_opportunities_route_normalizes_interval(
    monkeypatch,
):
    captured = {}

    async def fake_get_candles(
        symbol,
        interval,
        outputsize,
    ):
        captured.setdefault(
            "calls",
            [],
        ).append(
            {
                "symbol": symbol,
                "interval": interval,
                "outputsize": outputsize,
            }
        )

        return make_candles(100)

    monkeypatch.setattr(
        "app.routes.opportunities.get_candles",
        fake_get_candles,
    )

    response = client.get(
        "/signals/opportunities?interval=5M&limit=100"
    )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert body["interval"] == "5m"

    assert len(captured["calls"]) == 4

    assert all(
        call["interval"] == "5m"
        for call in captured["calls"]
    )

    assert all(
        call["outputsize"] == 100
        for call in captured["calls"]
    )


def test_opportunities_route_returns_all_supported_markets(
    monkeypatch,
):
    async def fake_get_candles(
        symbol,
        interval,
        outputsize,
    ):
        return make_candles(100)

    monkeypatch.setattr(
        "app.routes.opportunities.get_candles",
        fake_get_candles,
    )

    response = client.get(
        "/signals/opportunities?interval=5m&limit=100"
    )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert body["count"] == 4
    assert len(body["opportunities"]) == 4

    symbols = {
        opportunity["symbol"]
        for opportunity in body["opportunities"]
    }

    assert symbols == {
        "EUR/USD",
        "GBP/USD",
        "USD/JPY",
        "XAU/USD",
    }


def test_opportunities_route_are_ranked_descending(
    monkeypatch,
):
    async def fake_get_candles(
        symbol,
        interval,
        outputsize,
    ):
        return make_candles(100)

    monkeypatch.setattr(
        "app.routes.opportunities.get_candles",
        fake_get_candles,
    )

    response = client.get(
        "/signals/opportunities?interval=5m&limit=100"
    )

    assert response.status_code == 200

    body = response.json()

    scores = [
        opportunity["opportunity"]["score"]
        for opportunity in body["opportunities"]
    ]

    assert scores == sorted(
        scores,
        reverse=True,
    )

    ranks = [
        opportunity["opportunity"]["rank"]
        for opportunity in body["opportunities"]
    ]

    assert ranks == [1, 2, 3, 4]


def test_opportunities_route_includes_quality_ranking_and_opportunity_data(
    monkeypatch,
):
    async def fake_get_candles(
        symbol,
        interval,
        outputsize,
    ):
        return make_candles(100)

    monkeypatch.setattr(
        "app.routes.opportunities.get_candles",
        fake_get_candles,
    )

    response = client.get(
        "/signals/opportunities?interval=5m&limit=100"
    )

    assert response.status_code == 200

    body = response.json()

    opportunity = body["opportunities"][0]

    assert "quality" in opportunity
    assert "ranking" in opportunity
    assert "opportunity" in opportunity

    quality = opportunity["quality"]

    assert 0 <= quality["quality_score"] <= 100

    ranking = opportunity["ranking"]

    assert 0 <= ranking["score"] <= 100
    assert ranking["rank"] >= 1

    opportunity_data = opportunity["opportunity"]

    assert 0 <= opportunity_data["score"] <= 100
    assert opportunity_data["rank"] >= 1


def test_opportunities_route_maps_runtime_error_to_502(
    monkeypatch,
):
    async def fake_get_candles(
        symbol,
        interval,
        outputsize,
    ):
        raise RuntimeError(
            "Provider temporarily unavailable."
        )

    monkeypatch.setattr(
        "app.routes.opportunities.get_candles",
        fake_get_candles,
    )

    response = client.get(
        "/signals/opportunities?interval=5m&limit=100"
    )

    assert response.status_code == 502

    body = response.json()

    assert body["detail"] == (
        "Provider temporarily unavailable."
    )