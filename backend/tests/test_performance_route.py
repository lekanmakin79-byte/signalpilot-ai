from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def make_record(
    symbol="EUR/USD",
    timeframe="5m",
    outcome="CORRECT",
    confidence=80.0,
    price_change_percent=0.01,
):
    return SimpleNamespace(
        symbol=symbol,
        timeframe=timeframe,
        outcome=outcome,
        confidence=confidence,
        price_change_percent=price_change_percent,
    )


def mock_session(records):
    session = MagicMock()

    execute_result = MagicMock()
    execute_result.all.return_value = records

    session.exec.return_value = execute_result

    session_context = MagicMock()
    session_context.__enter__.return_value = session
    session_context.__exit__.return_value = False

    return session_context


def test_performance_summary_returns_correct_statistics():
    records = [
        make_record(
            outcome="CORRECT",
            confidence=80.0,
            price_change_percent=0.10,
        ),
        make_record(
            outcome="INCORRECT",
            confidence=70.0,
            price_change_percent=-0.20,
        ),
        make_record(
            outcome="CORRECT",
            confidence=90.0,
            price_change_percent=0.05,
        ),
        make_record(
            outcome="NEUTRAL",
            confidence=60.0,
            price_change_percent=0.00,
        ),
    ]

    with patch(
        "app.routes.performance.Session",
        return_value=mock_session(records),
    ):
        response = client.get(
            "/performance/summary"
        )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True

    summary = body["summary"]

    assert summary["evaluated_signals"] == 4
    assert summary["correct"] == 2
    assert summary["incorrect"] == 1
    assert summary["neutral"] == 1

    assert summary["hit_rate"] == 66.67
    assert summary["average_confidence"] == 75.0
    assert summary["average_price_change_percent"] == -0.0125


def test_performance_summary_returns_zero_values_when_empty():
    with patch(
        "app.routes.performance.Session",
        return_value=mock_session([]),
    ):
        response = client.get(
            "/performance/summary"
        )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True

    summary = body["summary"]

    assert summary["evaluated_signals"] == 0
    assert summary["correct"] == 0
    assert summary["incorrect"] == 0
    assert summary["neutral"] == 0
    assert summary["hit_rate"] == 0.0
    assert summary["average_confidence"] == 0.0
    assert summary["average_price_change_percent"] == 0.0


def test_performance_by_market_groups_records_correctly():
    records = [
        make_record(
            symbol="EUR/USD",
            outcome="CORRECT",
            confidence=80.0,
            price_change_percent=0.10,
        ),
        make_record(
            symbol="EUR/USD",
            outcome="INCORRECT",
            confidence=70.0,
            price_change_percent=-0.20,
        ),
        make_record(
            symbol="GBP/USD",
            outcome="CORRECT",
            confidence=90.0,
            price_change_percent=0.30,
        ),
        make_record(
            symbol="GBP/USD",
            outcome="NEUTRAL",
            confidence=60.0,
            price_change_percent=0.00,
        ),
    ]

    with patch(
        "app.routes.performance.Session",
        return_value=mock_session(records),
    ):
        response = client.get(
            "/performance/markets"
        )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert len(body["markets"]) == 2

    eur = next(
        item
        for item in body["markets"]
        if item["market"] == "EUR/USD"
    )

    gbp = next(
        item
        for item in body["markets"]
        if item["market"] == "GBP/USD"
    )

    assert eur["evaluated_signals"] == 2
    assert eur["correct"] == 1
    assert eur["incorrect"] == 1
    assert eur["neutral"] == 0
    assert eur["hit_rate"] == 50.0
    assert eur["average_confidence"] == 75.0
    assert eur["average_price_change_percent"] == -0.05

    assert gbp["evaluated_signals"] == 2
    assert gbp["correct"] == 1
    assert gbp["incorrect"] == 0
    assert gbp["neutral"] == 1
    assert gbp["hit_rate"] == 100.0
    assert gbp["average_confidence"] == 75.0
    assert gbp["average_price_change_percent"] == 0.15


def test_performance_by_market_returns_empty_list():
    with patch(
        "app.routes.performance.Session",
        return_value=mock_session([]),
    ):
        response = client.get(
            "/performance/markets"
        )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert body["markets"] == []


def test_performance_by_timeframe_groups_records_correctly():
    records = [
        make_record(
            timeframe="5m",
            outcome="CORRECT",
            confidence=80.0,
        ),
        make_record(
            timeframe="5m",
            outcome="INCORRECT",
            confidence=70.0,
        ),
        make_record(
            timeframe="15m",
            outcome="CORRECT",
            confidence=90.0,
        ),
        make_record(
            timeframe="15m",
            outcome="NEUTRAL",
            confidence=60.0,
        ),
    ]

    with patch(
        "app.routes.performance.Session",
        return_value=mock_session(records),
    ):
        response = client.get(
            "/performance/timeframes"
        )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert len(body["timeframes"]) == 2

    five_minute = next(
        item
        for item in body["timeframes"]
        if item["timeframe"] == "5m"
    )

    fifteen_minute = next(
        item
        for item in body["timeframes"]
        if item["timeframe"] == "15m"
    )

    assert five_minute["evaluated_signals"] == 2
    assert five_minute["correct"] == 1
    assert five_minute["incorrect"] == 1
    assert five_minute["neutral"] == 0
    assert five_minute["hit_rate"] == 50.0
    assert five_minute["average_confidence"] == 75.0

    assert fifteen_minute["evaluated_signals"] == 2
    assert fifteen_minute["correct"] == 1
    assert fifteen_minute["incorrect"] == 0
    assert fifteen_minute["neutral"] == 1
    assert fifteen_minute["hit_rate"] == 100.0
    assert fifteen_minute["average_confidence"] == 75.0


def test_performance_by_timeframe_returns_empty_list():
    with patch(
        "app.routes.performance.Session",
        return_value=mock_session([]),
    ):
        response = client.get(
            "/performance/timeframes"
        )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert body["timeframes"] == []


def test_performance_by_confidence_range_groups_records_correctly():
    records = [
        make_record(
            confidence=55.0,
            outcome="CORRECT",
        ),
        make_record(
            confidence=65.0,
            outcome="INCORRECT",
        ),
        make_record(
            confidence=75.0,
            outcome="CORRECT",
        ),
        make_record(
            confidence=85.0,
            outcome="INCORRECT",
        ),
        make_record(
            confidence=92.0,
            outcome="CORRECT",
        ),
        make_record(
            confidence=95.0,
            outcome="NEUTRAL",
        ),
    ]

    with patch(
        "app.routes.performance.Session",
        return_value=mock_session(records),
    ):
        response = client.get(
            "/performance/confidence-ranges"
        )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True

    ranges = body["confidence_ranges"]

    assert len(ranges) == 5

    range_50 = ranges[0]
    range_60 = ranges[1]
    range_70 = ranges[2]
    range_80 = ranges[3]
    range_90 = ranges[4]

    assert range_50["range"] == "50-59%"
    assert range_50["evaluated_signals"] == 1
    assert range_50["correct"] == 1
    assert range_50["incorrect"] == 0
    assert range_50["neutral"] == 0
    assert range_50["hit_rate"] == 100.0
    assert range_50["average_confidence"] == 55.0

    assert range_60["range"] == "60-69%"
    assert range_60["evaluated_signals"] == 1
    assert range_60["correct"] == 0
    assert range_60["incorrect"] == 1
    assert range_60["neutral"] == 0
    assert range_60["hit_rate"] == 0.0
    assert range_60["average_confidence"] == 65.0

    assert range_70["range"] == "70-79%"
    assert range_70["evaluated_signals"] == 1
    assert range_70["correct"] == 1
    assert range_70["incorrect"] == 0
    assert range_70["neutral"] == 0
    assert range_70["hit_rate"] == 100.0
    assert range_70["average_confidence"] == 75.0

    assert range_80["range"] == "80-89%"
    assert range_80["evaluated_signals"] == 1
    assert range_80["correct"] == 0
    assert range_80["incorrect"] == 1
    assert range_80["neutral"] == 0
    assert range_80["hit_rate"] == 0.0
    assert range_80["average_confidence"] == 85.0

    assert range_90["range"] == "90-95%"
    assert range_90["evaluated_signals"] == 2
    assert range_90["correct"] == 1
    assert range_90["incorrect"] == 0
    assert range_90["neutral"] == 1
    assert range_90["hit_rate"] == 100.0
    assert range_90["average_confidence"] == 93.5


def test_performance_by_confidence_range_returns_all_empty_ranges():
    with patch(
        "app.routes.performance.Session",
        return_value=mock_session([]),
    ):
        response = client.get(
            "/performance/confidence-ranges"
        )

    assert response.status_code == 200

    body = response.json()

    assert body["success"] is True
    assert len(body["confidence_ranges"]) == 5

    for item in body["confidence_ranges"]:
        assert item["evaluated_signals"] == 0
        assert item["correct"] == 0
        assert item["incorrect"] == 0
        assert item["neutral"] == 0
        assert item["hit_rate"] == 0.0
        assert item["average_confidence"] == 0.0


def test_performance_summary_maps_database_error_to_500():
    session = MagicMock()

    execute_result = MagicMock()
    execute_result.all.side_effect = RuntimeError(
        "Database unavailable."
    )

    session.exec.return_value = execute_result

    session_context = MagicMock()
    session_context.__enter__.return_value = session
    session_context.__exit__.return_value = False

    with patch(
        "app.routes.performance.Session",
        return_value=session_context,
    ):
        response = client.get(
            "/performance/summary"
        )

    assert response.status_code == 500
    assert response.json()["detail"] == (
        "Database unavailable."
    )