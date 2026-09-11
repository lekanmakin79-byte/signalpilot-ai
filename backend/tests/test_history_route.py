from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def make_record(
    record_id=1,
    symbol="EUR/USD",
    timeframe="5m",
    direction="UP",
    confidence=80.0,
):
    record = MagicMock()

    record.id = record_id
    record.symbol = symbol
    record.timeframe = timeframe
    record.direction = direction
    record.confidence = confidence

    return record


def build_session(records=None, error=None):
    session = MagicMock()

    if error is not None:
        session.exec.side_effect = error
    else:
        session.exec.return_value.all.return_value = (
            records or []
        )

    context_manager = MagicMock()
    context_manager.__enter__.return_value = session
    context_manager.__exit__.return_value = False

    return context_manager


def test_history_returns_successful_response():
    records = [
        make_record(
            record_id=3,
            symbol="EUR/USD",
            direction="UP",
            confidence=82.0,
        ),
        make_record(
            record_id=2,
            symbol="GBP/USD",
            direction="DOWN",
            confidence=76.0,
        ),
    ]

    with patch(
        "app.routes.history.Session",
        return_value=build_session(records),
    ):
        response = client.get(
            "/history/signals"
        )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["count"] == 2
    assert len(data["signals"]) == 2


def test_history_returns_empty_list_when_no_records_exist():
    with patch(
        "app.routes.history.Session",
        return_value=build_session([]),
    ):
        response = client.get(
            "/history/signals"
        )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["count"] == 0
    assert data["signals"] == []


def test_history_uses_requested_limit():
    records = [
        make_record(record_id=5),
        make_record(record_id=4),
        make_record(record_id=3),
    ]

    session_context = build_session(records)

    with patch(
        "app.routes.history.Session",
        return_value=session_context,
    ):
        response = client.get(
            "/history/signals?limit=3"
        )

    assert response.status_code == 200

    session = (
        session_context.__enter__.return_value
    )

    session.exec.assert_called_once()


def test_history_clamps_limit_above_200():
    records = [
        make_record(record_id=1)
    ]

    session_context = build_session(records)

    with patch(
        "app.routes.history.Session",
        return_value=session_context,
    ):
        response = client.get(
            "/history/signals?limit=500"
        )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["count"] == 1


def test_history_clamps_limit_below_1():
    records = [
        make_record(record_id=1)
    ]

    session_context = build_session(records)

    with patch(
        "app.routes.history.Session",
        return_value=session_context,
    ):
        response = client.get(
            "/history/signals?limit=0"
        )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["count"] == 1


def test_history_returns_signal_fields():
    records = [
        {
            "id": 10,
            "symbol": "XAU/USD",
            "timeframe": "15m",
            "direction": "DOWN",
            "confidence": 91.5,
        }
    ]

    with patch(
        "app.routes.history.Session",
        return_value=build_session(records),
    ):
        response = client.get(
            "/history/signals"
        )

    assert response.status_code == 200

    signal = response.json()["signals"][0]

    assert signal["id"] == 10
    assert signal["symbol"] == "XAU/USD"
    assert signal["timeframe"] == "15m"
    assert signal["direction"] == "DOWN"
    assert signal["confidence"] == 91.5


def test_history_returns_500_when_database_fails():
    database_error = RuntimeError(
        "Database connection failed."
    )

    with patch(
        "app.routes.history.Session",
        return_value=build_session(
            error=database_error
        ),
    ):
        response = client.get(
            "/history/signals"
        )

    assert response.status_code == 500

    data = response.json()

    assert data["detail"] == (
        "Database connection failed."
    )