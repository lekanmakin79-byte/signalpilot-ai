from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.database import (
    PaperOrder,
    PaperPosition,
    PaperTradingAccount,
    SignalHistory,
    create_db_and_tables,
    engine,
)
from app.main import app
import app.routes.paper_trading as paper_trading_route


create_db_and_tables()

client = TestClient(app)


def _create_account(
    name: str,
    initial_balance: float = 10_000.0,
) -> int:
    response = client.post(
        "/paper-trading/accounts",
        json={
            "name": name,
            "initial_balance": initial_balance,
            "currency": "USD",
        },
    )

    assert response.status_code == 200

    return response.json()["account"]["id"]


def _mock_signal(
    *,
    symbol: str = "EUR/USD",
    timeframe: str = "5m",
    direction: str = "UP",
    confidence: float = 85.0,
    quality_score: float = 85.0,
    risk_level: str = "LOWER",
    price: float = 1.1000,
) -> dict:
    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "price": price,
        "signal_timestamp": "2026-09-19T15:00:00+00:00",
        "direction": direction,
        "confidence": confidence,
        "trend": "BULLISH",
        "momentum": "BULLISH",
        "volatility": "NORMAL",
        "scores": {
            "trend": 0.80,
            "momentum": 0.80,
            "volatility": 0.50,
            "directional": 0.85,
        },
        "indicators": {
            "ema20": 1.0980,
            "ema50": 1.0950,
            "rsi14": 58.0,
            "macd": {
                "macd": 0.0020,
                "signal": 0.0010,
                "histogram": 0.0010,
            },
            "atr14": 0.0100,
        },
        "risk": {
            "risk_level": risk_level,
            "factors": [],
        },
        "quality": {
            "quality_score": quality_score,
            "quality_grade": "STRONG",
            "components": {
                "directional_strength": 85.0,
                "confidence": confidence,
                "indicator_agreement": 90.0,
                "volatility_quality": 70.0,
                "risk_quality": 100.0,
            },
        },
        "data_points": 100,
        "explanation": "Test signal generated for automated paper trading.",
    }


async def _mock_get_candles(
    *,
    symbol: str,
    interval: str,
    outputsize: int,
):
    return [{"close": 1.1000}] * outputsize


def test_auto_evaluate_executes_qualifying_signal(monkeypatch):
    account_id = _create_account(
        "Auto Execute Test Account"
    )

    signal = _mock_signal()

    monkeypatch.setattr(
        paper_trading_route,
        "get_candles",
        _mock_get_candles,
    )

    monkeypatch.setattr(
        paper_trading_route,
        "generate_signal",
        lambda **kwargs: signal,
    )

    response = client.post(
        "/paper-trading/auto-evaluate",
        json={
            "account_id": account_id,
            "symbol": "EUR/USD",
            "interval": "5m",
            "limit": 100,
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert body["status"] == "EXECUTED"
    assert body["executed"] is True

    assert body["history_id"] is not None
    assert body["decision"]["approved"] is True
    assert body["decision"]["action"] == "BUY"
    assert body["risk_assessment"]["approved"] is True

    assert body["order_id"] is not None
    assert body["position_id"] is not None

    assert body["order"]["status"] == "FILLED"
    assert body["order"]["side"] == "BUY"
    assert body["order"]["signal_history_id"] == body["history_id"]

    assert body["position"]["status"] == "OPEN"
    assert body["position"]["side"] == "BUY"

    with Session(engine) as session:
        history = session.get(
            SignalHistory,
            body["history_id"],
        )
        order = session.get(
            PaperOrder,
            body["order_id"],
        )
        position = session.get(
            PaperPosition,
            body["position_id"],
        )

        assert history is not None
        assert history.symbol == "EUR/USD"
        assert history.timeframe == "5m"
        assert history.direction == "UP"

        assert order is not None
        assert order.signal_history_id == history.id

        assert position is not None
        assert position.order_id == order.id


def test_auto_evaluate_rejects_signal_without_creating_trade(
    monkeypatch,
):
    account_id = _create_account(
        "Auto Reject Test Account"
    )

    signal = _mock_signal(
        confidence=60.0,
        quality_score=85.0,
    )

    monkeypatch.setattr(
        paper_trading_route,
        "get_candles",
        _mock_get_candles,
    )

    monkeypatch.setattr(
        paper_trading_route,
        "generate_signal",
        lambda **kwargs: signal,
    )

    response = client.post(
        "/paper-trading/auto-evaluate",
        json={
            "account_id": account_id,
            "symbol": "EUR/USD",
            "interval": "5m",
            "limit": 100,
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert body["status"] == "REJECTED"
    assert body["executed"] is False

    assert body["history_id"] is not None
    assert body["decision"]["approved"] is False
    assert body["order_id"] is None
    assert body["position_id"] is None
    assert body["order"] is None
    assert body["position"] is None

    with Session(engine) as session:
        orders = session.exec(
            select(PaperOrder).where(
                PaperOrder.account_id == account_id
            )
        ).all()

        positions = session.exec(
            select(PaperPosition).where(
                PaperPosition.account_id == account_id
            )
        ).all()

        assert orders == []
        assert positions == []


def test_auto_evaluate_skips_when_open_position_exists(
    monkeypatch,
):
    account_id = _create_account(
        "Auto Duplicate Protection Account"
    )

    signal = _mock_signal()

    monkeypatch.setattr(
        paper_trading_route,
        "get_candles",
        _mock_get_candles,
    )

    monkeypatch.setattr(
        paper_trading_route,
        "generate_signal",
        lambda **kwargs: signal,
    )

    first_response = client.post(
        "/paper-trading/auto-evaluate",
        json={
            "account_id": account_id,
            "symbol": "EUR/USD",
            "interval": "5m",
            "limit": 100,
        },
    )

    assert first_response.status_code == 200

    first_body = first_response.json()

    assert first_body["status"] == "EXECUTED"

    second_response = client.post(
        "/paper-trading/auto-evaluate",
        json={
            "account_id": account_id,
            "symbol": "EUR/USD",
            "interval": "5m",
            "limit": 100,
        },
    )

    assert second_response.status_code == 200

    second_body = second_response.json()

    assert second_body["success"] is True
    assert second_body["status"] == "SKIPPED_OPEN_POSITION"
    assert second_body["executed"] is False
    assert second_body["order_id"] is None
    assert second_body["position_id"] == first_body["position_id"]

    with Session(engine) as session:
        orders = session.exec(
            select(PaperOrder).where(
                PaperOrder.account_id == account_id
            )
        ).all()

        positions = session.exec(
            select(PaperPosition).where(
                PaperPosition.account_id == account_id
            )
        ).all()

        assert len(orders) == 1
        assert len(positions) == 1


def test_auto_evaluate_returns_404_for_missing_account():
    response = client.post(
        "/paper-trading/auto-evaluate",
        json={
            "account_id": 999999999,
            "symbol": "EUR/USD",
            "interval": "5m",
            "limit": 100,
        },
    )

    assert response.status_code == 404

    assert response.json()["detail"] == (
        "Paper trading account was not found."
    )


def test_auto_evaluate_rejects_inactive_account():
    account_id = _create_account(
        "Auto Inactive Account"
    )

    with Session(engine) as session:
        account = session.get(
            PaperTradingAccount,
            account_id,
        )

        assert account is not None

        account.status = "INACTIVE"

        session.add(account)
        session.commit()

    response = client.post(
        "/paper-trading/auto-evaluate",
        json={
            "account_id": account_id,
            "symbol": "EUR/USD",
            "interval": "5m",
            "limit": 100,
        },
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "Paper trading account is not active."
    )
