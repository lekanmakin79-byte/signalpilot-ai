from fastapi.testclient import TestClient

from app.database import create_db_and_tables
from app.main import app


create_db_and_tables()

client = TestClient(app)


def test_create_paper_account():
    response = client.post(
        "/paper-trading/accounts",
        json={
            "name": "API Test Account",
            "initial_balance": 10_000.0,
            "currency": "USD",
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert "account" in body

    account = body["account"]

    assert isinstance(account["id"], int)
    assert account["name"] == "API Test Account"
    assert account["initial_balance"] == 10_000.0
    assert account["balance"] == 10_000.0
    assert account["equity"] == 10_000.0
    assert account["currency"] == "USD"
    assert account["status"] == "ACTIVE"


def test_create_account_rejects_non_usd_currency():
    response = client.post(
        "/paper-trading/accounts",
        json={
            "name": "GBP Account",
            "initial_balance": 10_000.0,
            "currency": "GBP",
        },
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "Paper Trading v1 supports USD accounts only."
    )


def test_get_missing_account_returns_404():
    response = client.get(
        "/paper-trading/accounts/999999999"
    )

    assert response.status_code == 404

    assert response.json()["detail"] == (
        "Paper trading account was not found."
    )


def test_execute_trade_creates_order_and_position():
    account_response = client.post(
        "/paper-trading/accounts",
        json={
            "name": "Trade Test Account",
            "initial_balance": 10_000.0,
        },
    )

    assert account_response.status_code == 200

    account_id = account_response.json()["account"]["id"]

    response = client.post(
        "/paper-trading/trades",
        json={
            "account_id": account_id,
            "signal": {
                "symbol": "EUR/USD",
                "timeframe": "5m",
                "direction": "UP",
                "confidence": 80.0,
                "quality_score": 85.0,
                "risk_level": "LOWER",
            },
            "entry_price": 1.1000,
            "atr14": 0.0100,
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert body["approved"] is True
    assert body["order_id"] is not None
    assert body["position_id"] is not None
    assert body["decision"]["action"] == "BUY"
    assert body["risk_assessment"]["approved"] is True


def test_rejected_trade_returns_success_false_without_order():
    account_response = client.post(
        "/paper-trading/accounts",
        json={
            "name": "Rejected Trade Account",
            "initial_balance": 10_000.0,
        },
    )

    account_id = account_response.json()["account"]["id"]

    response = client.post(
        "/paper-trading/trades",
        json={
            "account_id": account_id,
            "signal": {
                "symbol": "EUR/USD",
                "timeframe": "5m",
                "direction": "UP",
                "confidence": 60.0,
                "quality_score": 85.0,
                "risk_level": "LOWER",
            },
            "entry_price": 1.1000,
            "atr14": 0.0100,
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is False
    assert body["approved"] is False
    assert body["order_id"] is None
    assert body["position_id"] is None


def test_get_orders_returns_created_order():
    account_response = client.post(
        "/paper-trading/accounts",
        json={
            "name": "Orders Test Account",
            "initial_balance": 10_000.0,
        },
    )

    account_id = account_response.json()["account"]["id"]

    trade_response = client.post(
        "/paper-trading/trades",
        json={
            "account_id": account_id,
            "signal": {
                "symbol": "EUR/USD",
                "timeframe": "5m",
                "direction": "UP",
                "confidence": 80.0,
                "quality_score": 85.0,
                "risk_level": "LOWER",
            },
            "entry_price": 1.1000,
            "atr14": 0.0100,
        },
    )

    assert trade_response.status_code == 200

    response = client.get(
        f"/paper-trading/accounts/{account_id}/orders"
    )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert len(body["orders"]) == 1
    assert body["orders"][0]["status"] == "FILLED"
    assert body["orders"][0]["side"] == "BUY"


def test_get_open_positions_returns_position():
    account_response = client.post(
        "/paper-trading/accounts",
        json={
            "name": "Positions Test Account",
            "initial_balance": 10_000.0,
        },
    )

    account_id = account_response.json()["account"]["id"]

    trade_response = client.post(
        "/paper-trading/trades",
        json={
            "account_id": account_id,
            "signal": {
                "symbol": "EUR/USD",
                "timeframe": "5m",
                "direction": "UP",
                "confidence": 80.0,
                "quality_score": 85.0,
                "risk_level": "LOWER",
            },
            "entry_price": 1.1000,
            "atr14": 0.0100,
        },
    )

    position_id = trade_response.json()["position_id"]

    response = client.get(
        f"/paper-trading/accounts/{account_id}/positions"
    )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert len(body["positions"]) == 1
    assert body["positions"][0]["id"] == position_id
    assert body["positions"][0]["status"] == "OPEN"


def test_mark_position_updates_pnl():
    account_response = client.post(
        "/paper-trading/accounts",
        json={
            "name": "Mark Test Account",
            "initial_balance": 10_000.0,
        },
    )

    account_id = account_response.json()["account"]["id"]

    trade_response = client.post(
        "/paper-trading/trades",
        json={
            "account_id": account_id,
            "signal": {
                "symbol": "EUR/USD",
                "timeframe": "5m",
                "direction": "UP",
                "confidence": 80.0,
                "quality_score": 85.0,
                "risk_level": "LOWER",
            },
            "entry_price": 1.1000,
            "atr14": 0.0100,
        },
    )

    position_id = trade_response.json()["position_id"]

    response = client.post(
        f"/paper-trading/positions/{position_id}/mark",
        json={
            "current_price": 1.1100,
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert body["position"]["unrealised_pnl"] == 66.66666667


def test_close_position_realises_pnl():
    account_response = client.post(
        "/paper-trading/accounts",
        json={
            "name": "Close Test Account",
            "initial_balance": 10_000.0,
        },
    )

    account_id = account_response.json()["account"]["id"]

    trade_response = client.post(
        "/paper-trading/trades",
        json={
            "account_id": account_id,
            "signal": {
                "symbol": "EUR/USD",
                "timeframe": "5m",
                "direction": "UP",
                "confidence": 80.0,
                "quality_score": 85.0,
                "risk_level": "LOWER",
            },
            "entry_price": 1.1000,
            "atr14": 0.0100,
        },
    )

    position_id = trade_response.json()["position_id"]

    response = client.post(
        f"/paper-trading/positions/{position_id}/close",
        json={
            "exit_price": 1.1100,
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert body["position"]["status"] == "CLOSED"
    assert body["position"]["exit_price"] == 1.1100
    assert body["position"]["realised_pnl"] == 66.66666667


def test_invalid_position_returns_404():
    response = client.post(
        "/paper-trading/positions/999999999/mark",
        json={
            "current_price": 1.1000,
        },
    )

    assert response.status_code == 404

    assert response.json()["detail"] == (
        "Paper position was not found."
    )
