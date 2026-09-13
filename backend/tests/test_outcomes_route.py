from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def make_record(
    record_id=1,
    symbol="EUR/USD",
    timeframe="5m",
    signal_timestamp=None,
    outcome="PENDING",
    direction="UP",
    price=1.1600,
):
    record = MagicMock()

    record.id = record_id
    record.symbol = symbol
    record.timeframe = timeframe
    record.signal_timestamp = (
        signal_timestamp
        or (
            datetime.now(timezone.utc)
            - timedelta(minutes=30)
        ).isoformat()
    )
    record.outcome = outcome
    record.direction = direction
    record.price = price

    record.evaluation_minutes = None
    record.evaluation_price = None
    record.price_change = None
    record.price_change_percent = None
    record.evaluated_at = None

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


def test_evaluate_pending_signals_returns_empty_result():
    session_context = build_session([])

    with patch(
        "app.routes.outcomes.Session",
        return_value=session_context,
    ):
        response = client.post(
            "/outcomes/evaluate"
        )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["evaluated"] == 0
    assert data["pending"] == 0
    assert data["skipped"] == 0
    assert data["results"] == []

    session = (
        session_context.__enter__.return_value
    )

    session.commit.assert_called_once()


def test_evaluate_pending_signal_when_horizon_has_not_elapsed():
    record = make_record(
        record_id=10,
        signal_timestamp=(
            datetime.now(timezone.utc)
            - timedelta(minutes=1)
        ).isoformat(),
    )

    session_context = build_session([record])

    target_time = (
        datetime.now(timezone.utc)
        + timedelta(minutes=4)
    )

    with patch(
        "app.routes.outcomes.Session",
        return_value=session_context,
    ), patch(
        "app.routes.outcomes.calculate_target_time",
        return_value=(
            target_time,
            5,
        ),
    ):
        response = client.post(
            "/outcomes/evaluate"
        )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["evaluated"] == 0
    assert data["pending"] == 1
    assert data["skipped"] == 0

    result = data["results"][0]

    assert result["id"] == 10
    assert result["status"] == "PENDING"
    assert (
        result["reason"]
        == "Evaluation horizon has not elapsed yet."
    )
    assert "target_time" in result

    assert record.evaluation_minutes == 5


def test_evaluate_pending_signal_successfully():
    record = make_record(
        record_id=20,
        symbol="EUR/USD",
        timeframe="5m",
        direction="UP",
        price=1.1600,
    )

    session_context = build_session([record])

    target_time = (
        datetime.now(timezone.utc)
        - timedelta(minutes=5)
    )

    outcome = {
        "evaluation_price": 1.1610,
        "price_change": 0.001,
        "price_change_percent": 0.086207,
        "outcome": "CORRECT",
    }

    with patch(
        "app.routes.outcomes.Session",
        return_value=session_context,
    ), patch(
        "app.routes.outcomes.calculate_target_time",
        return_value=(
            target_time,
            5,
        ),
    ), patch(
        "app.routes.outcomes.get_evaluation_price",
        new_callable=AsyncMock,
        return_value=(
            1.1610,
            "2026-09-10T08:00:00+00:00",
        ),
    ) as mock_evaluation_price, patch(
        "app.routes.outcomes.calculate_outcome",
        return_value=outcome,
    ) as mock_calculate_outcome:
        response = client.post(
            "/outcomes/evaluate"
        )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["evaluated"] == 1
    assert data["pending"] == 0
    assert data["skipped"] == 0

    result = data["results"][0]

    assert result["id"] == 20
    assert result["status"] == "EVALUATED"
    assert (
        result["evaluation_timestamp"]
        == "2026-09-10T08:00:00+00:00"
    )
    assert result["outcome"] == "CORRECT"
    assert result["evaluation_price"] == 1.1610
    assert result["price_change"] == 0.001
    assert result["price_change_percent"] == 0.086207

    assert record.evaluation_minutes == 5
    assert record.evaluation_price == 1.1610
    assert record.price_change == 0.001
    assert record.price_change_percent == 0.086207
    assert record.outcome == "CORRECT"
    assert record.evaluated_at is not None

    mock_evaluation_price.assert_awaited_once_with(
        symbol="EUR/USD",
        timeframe="5m",
        target_time=target_time,
    )

    mock_calculate_outcome.assert_called_once_with(
        direction="UP",
        signal_price=1.1600,
        evaluation_price=1.1610,
    )


def test_evaluate_pending_signal_handles_market_data_runtime_error():
    record = make_record(
        record_id=30,
        symbol="GBP/USD",
    )

    session_context = build_session([record])

    target_time = (
        datetime.now(timezone.utc)
        - timedelta(minutes=5)
    )

    with patch(
        "app.routes.outcomes.Session",
        return_value=session_context,
    ), patch(
        "app.routes.outcomes.calculate_target_time",
        return_value=(
            target_time,
            5,
        ),
    ), patch(
        "app.routes.outcomes.get_evaluation_price",
        new_callable=AsyncMock,
        side_effect=RuntimeError(
            "Market data unavailable."
        ),
    ):
        response = client.post(
            "/outcomes/evaluate"
        )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["evaluated"] == 0
    assert data["pending"] == 1

    result = data["results"][0]

    assert result["id"] == 30
    assert result["status"] == "PENDING"
    assert (
        result["reason"]
        == "Market data unavailable."
    )
    assert "target_time" in result

    assert record.evaluation_minutes == 5
    assert record.outcome == "PENDING"


def test_legacy_signal_id_5_is_skipped():
    record = make_record(
        record_id=5,
        symbol="EUR/USD",
    )

    session_context = build_session([record])

    with patch(
        "app.routes.outcomes.Session",
        return_value=session_context,
    ), patch(
        "app.routes.outcomes.calculate_target_time"
    ) as mock_target_time, patch(
        "app.routes.outcomes.get_evaluation_price",
        new_callable=AsyncMock,
    ) as mock_evaluation_price:
        response = client.post(
            "/outcomes/evaluate"
        )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["evaluated"] == 0
    assert data["pending"] == 0
    assert data["skipped"] == 1

    result = data["results"][0]

    assert result["id"] == 5
    assert result["status"] == "SKIPPED"
    assert (
        result["reason"]
        == (
            "Legacy test signal created "
            "before UTC timestamp correction."
        )
    )

    mock_target_time.assert_not_called()
    mock_evaluation_price.assert_not_awaited()


def test_multiple_pending_signals_return_correct_summary():
    evaluated_record = make_record(
        record_id=40,
        symbol="EUR/USD",
        direction="UP",
        price=1.1600,
    )

    pending_record = make_record(
        record_id=41,
        symbol="GBP/USD",
        direction="DOWN",
        price=1.3500,
    )

    skipped_record = make_record(
        record_id=5,
        symbol="USD/JPY",
    )

    session_context = build_session(
        [
            evaluated_record,
            pending_record,
            skipped_record,
        ]
    )

    elapsed_target = (
        datetime.now(timezone.utc)
        - timedelta(minutes=5)
    )

    future_target = (
        datetime.now(timezone.utc)
        + timedelta(minutes=5)
    )

    def target_time_side_effect(
        signal_timestamp,
        timeframe,
    ):
        if timeframe == "5m":
            if signal_timestamp == (
                evaluated_record.signal_timestamp
            ):
                return elapsed_target, 5

            return future_target, 5

        return future_target, 5

    outcome = {
        "evaluation_price": 1.1610,
        "price_change": 0.001,
        "price_change_percent": 0.086207,
        "outcome": "CORRECT",
    }

    with patch(
        "app.routes.outcomes.Session",
        return_value=session_context,
    ), patch(
        "app.routes.outcomes.calculate_target_time",
        side_effect=target_time_side_effect,
    ), patch(
        "app.routes.outcomes.get_evaluation_price",
        new_callable=AsyncMock,
        return_value=(
            1.1610,
            "2026-09-10T08:00:00+00:00",
        ),
    ), patch(
        "app.routes.outcomes.calculate_outcome",
        return_value=outcome,
    ):
        response = client.post(
            "/outcomes/evaluate"
        )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["evaluated"] == 1
    assert data["pending"] == 1
    assert data["skipped"] == 1
    assert len(data["results"]) == 3

    statuses = [
        result["status"]
        for result in data["results"]
    ]

    assert "EVALUATED" in statuses
    assert "PENDING" in statuses
    assert "SKIPPED" in statuses


def test_evaluate_returns_500_when_database_fails():
    database_error = RuntimeError(
        "Database connection failed."
    )

    with patch(
        "app.routes.outcomes.Session",
        return_value=build_session(
            error=database_error
        ),
    ):
        response = client.post(
            "/outcomes/evaluate"
        )

    assert response.status_code == 500

    data = response.json()

    assert data["detail"] == (
        "Database connection failed."
    )


def test_outcome_evaluation_commits_database_changes():
    record = make_record(
        record_id=50,
        direction="DOWN",
        price=1.1600,
    )

    session_context = build_session([record])

    target_time = (
        datetime.now(timezone.utc)
        - timedelta(minutes=5)
    )

    outcome = {
        "evaluation_price": 1.1590,
        "price_change": -0.001,
        "price_change_percent": -0.086207,
        "outcome": "CORRECT",
    }

    with patch(
        "app.routes.outcomes.Session",
        return_value=session_context,
    ), patch(
        "app.routes.outcomes.calculate_target_time",
        return_value=(
            target_time,
            5,
        ),
    ), patch(
        "app.routes.outcomes.get_evaluation_price",
        new_callable=AsyncMock,
        return_value=(
            1.1590,
            "2026-09-10T08:00:00+00:00",
        ),
    ), patch(
        "app.routes.outcomes.calculate_outcome",
        return_value=outcome,
    ):
        response = client.post(
            "/outcomes/evaluate"
        )

    assert response.status_code == 200

    session = (
        session_context.__enter__.return_value
    )

    session.commit.assert_called_once()


def test_evaluate_pending_signal_with_mismatched_price_is_marked_invalid():
    record = make_record(
        record_id=58,
        symbol="USD/JPY",
        timeframe="15m",
        direction="DOWN",
        price=1.1505,
    )

    session_context = build_session([record])

    target_time = (
        datetime.now(timezone.utc)
        - timedelta(minutes=15)
    )

    with patch(
        "app.routes.outcomes.Session",
        return_value=session_context,
    ), patch(
        "app.routes.outcomes.calculate_target_time",
        return_value=(
            target_time,
            15,
        ),
    ), patch(
        "app.routes.outcomes.get_evaluation_price",
        new_callable=AsyncMock,
        return_value=(
            153.64,
            "2026-09-10T08:15:00+00:00",
        ),
    ) as mock_evaluation_price, patch(
        "app.routes.outcomes.calculate_outcome",
    ) as mock_calculate_outcome:
        response = client.post(
            "/outcomes/evaluate"
        )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["evaluated"] == 0
    assert data["pending"] == 0
    assert data["skipped"] == 1

    result = data["results"][0]

    assert result["id"] == 58
    assert result["status"] == "SKIPPED"
    assert result["reason"] == (
        "Signal price is incompatible with the "
        "evaluation price and has been marked INVALID."
    )

    assert record.outcome == "INVALID"
    assert record.evaluation_price == 153.64
    assert record.price_change is None
    assert record.price_change_percent is None
    assert record.evaluated_at is not None

    mock_evaluation_price.assert_awaited_once_with(
        symbol="USD/JPY",
        timeframe="15m",
        target_time=target_time,
    )

    mock_calculate_outcome.assert_not_called()
def test_evaluate_pending_signal_handles_twelve_data_rate_limit():
    record = make_record(
        record_id=60,
        symbol="EUR/USD",
        timeframe="5m",
    )

    session_context = build_session([record])

    target_time = (
        datetime.now(timezone.utc)
        - timedelta(minutes=5)
    )

    with patch(
        "app.routes.outcomes.Session",
        return_value=session_context,
    ), patch(
        "app.routes.outcomes.calculate_target_time",
        return_value=(
            target_time,
            5,
        ),
    ), patch(
        "app.routes.outcomes.get_evaluation_price",
        new_callable=AsyncMock,
        side_effect=RuntimeError(
            "Twelve Data rate limit reached. "
            "The evaluation will remain pending and "
            "will be retried on a later scheduled run."
        ),
    ):
        response = client.post(
            "/outcomes/evaluate"
        )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["evaluated"] == 0
    assert data["pending"] == 1
    assert data["skipped"] == 0

    result = data["results"][0]

    assert result["id"] == 60
    assert result["status"] == "PENDING"
    assert result["reason"] == (
        "Twelve Data rate limit reached. "
        "The evaluation will remain pending and "
        "will be retried on a later scheduled run."
    )

    assert record.outcome == "PENDING"

    session = (
        session_context.__enter__.return_value
    )

    session.commit.assert_called_once()
