from sqlmodel import Session, SQLModel, create_engine

from app.database import (
    PaperOrder,
    PaperPosition,
    PaperTradingAccount,
)
from app.paper_trading_engine import (
    close_paper_position,
    create_paper_trading_account,
    execute_paper_trade,
    mark_position_to_market,
)


def make_database():
    engine = create_engine(
        "sqlite://",
        connect_args={
            "check_same_thread": False,
        },
    )

    SQLModel.metadata.create_all(engine)

    return engine


def make_signal():
    return {
        "symbol": "EUR/USD",
        "timeframe": "5m",
        "direction": "UP",
        "confidence": 80.0,
        "quality_score": 85.0,
        "risk_level": "LOWER",
    }


def test_creates_paper_trading_account():
    engine = make_database()

    with Session(engine) as session:
        account = create_paper_trading_account(
            session,
            name="SignalPilot Demo",
            initial_balance=10_000.0,
        )

        assert account.id is not None
        assert account.initial_balance == 10_000.0
        assert account.balance == 10_000.0
        assert account.equity == 10_000.0
        assert account.currency == "USD"
        assert account.status == "ACTIVE"


def test_executes_approved_signal_into_order_and_position():
    engine = make_database()

    with Session(engine) as session:
        account = create_paper_trading_account(
            session,
            name="SignalPilot Demo",
            initial_balance=10_000.0,
        )

        result = execute_paper_trade(
            session,
            account_id=account.id,
            signal=make_signal(),
            entry_price=1.1000,
            atr14=0.0100,
        )

        assert result.approved is True
        assert result.order_id is not None
        assert result.position_id is not None

        order = session.get(
            PaperOrder,
            result.order_id,
        )

        position = session.get(
            PaperPosition,
            result.position_id,
        )

        assert order is not None
        assert position is not None

        assert order.status == "FILLED"
        assert order.side == "BUY"
        assert order.executed_price == 1.1000

        assert position.status == "OPEN"
        assert position.side == "BUY"
        assert position.entry_price == 1.1000
        assert position.current_price == 1.1000
        assert position.unrealised_pnl == 0.0

        assert account.balance == 10_000.0
        assert account.equity == 10_000.0


def test_rejected_signal_creates_no_order_or_position():
    engine = make_database()

    with Session(engine) as session:
        account = create_paper_trading_account(
            session,
            name="SignalPilot Demo",
            initial_balance=10_000.0,
        )

        signal = make_signal()
        signal["confidence"] = 60.0

        result = execute_paper_trade(
            session,
            account_id=account.id,
            signal=signal,
            entry_price=1.1000,
            atr14=0.0100,
        )

        assert result.approved is False
        assert result.order_id is None
        assert result.position_id is None

        orders = session.query(PaperOrder).all()
        positions = session.query(PaperPosition).all()

        assert orders == []
        assert positions == []


def test_risk_rejection_creates_no_order_or_position():
    engine = make_database()

    with Session(engine) as session:
        account = create_paper_trading_account(
            session,
            name="SignalPilot Demo",
            initial_balance=10_000.0,
        )

        result = execute_paper_trade(
            session,
            account_id=account.id,
            signal=make_signal(),
            entry_price=1.1000,
            atr14=None,
        )

        assert result.approved is False
        assert result.risk_assessment is not None
        assert result.risk_assessment.approved is False

        orders = session.query(PaperOrder).all()
        positions = session.query(PaperPosition).all()

        assert orders == []
        assert positions == []


def test_mark_to_market_updates_unrealised_pnl_and_equity():
    engine = make_database()

    with Session(engine) as session:
        account = create_paper_trading_account(
            session,
            name="SignalPilot Demo",
            initial_balance=10_000.0,
        )

        result = execute_paper_trade(
            session,
            account_id=account.id,
            signal=make_signal(),
            entry_price=1.1000,
            atr14=0.0100,
        )

        position = mark_position_to_market(
            session,
            position_id=result.position_id,
            current_price=1.1100,
        )

        assert position.unrealised_pnl == 66.66666667

        refreshed_account = session.get(
            PaperTradingAccount,
            account.id,
        )

        assert refreshed_account is not None
        assert refreshed_account.balance == 10_000.0
        assert refreshed_account.equity == 10_066.66666667


def test_closing_position_realises_pnl_and_updates_balance():
    engine = make_database()

    with Session(engine) as session:
        account = create_paper_trading_account(
            session,
            name="SignalPilot Demo",
            initial_balance=10_000.0,
        )

        result = execute_paper_trade(
            session,
            account_id=account.id,
            signal=make_signal(),
            entry_price=1.1000,
            atr14=0.0100,
        )

        position = close_paper_position(
            session,
            position_id=result.position_id,
            exit_price=1.1100,
        )

        assert position.status == "CLOSED"
        assert position.exit_price == 1.1100
        assert position.realised_pnl == 66.66666667
        assert position.unrealised_pnl == 0.0

        refreshed_account = session.get(
            PaperTradingAccount,
            account.id,
        )

        assert refreshed_account is not None
        assert refreshed_account.balance == 10_066.66666667
        assert refreshed_account.equity == 10_066.66666667


def test_sell_position_generates_profit_when_price_falls():
    engine = make_database()

    with Session(engine) as session:
        account = create_paper_trading_account(
            session,
            name="SignalPilot Demo",
            initial_balance=10_000.0,
        )

        signal = make_signal()
        signal["direction"] = "DOWN"

        result = execute_paper_trade(
            session,
            account_id=account.id,
            signal=signal,
            entry_price=1.1000,
            atr14=0.0100,
        )

        position = mark_position_to_market(
            session,
            position_id=result.position_id,
            current_price=1.0900,
        )

        assert position.unrealised_pnl == 66.66666667


def test_maximum_open_positions_is_enforced():
    engine = make_database()

    with Session(engine) as session:
        account = create_paper_trading_account(
            session,
            name="SignalPilot Demo",
            initial_balance=10_000.0,
        )

        for price in (1.1000, 1.1100, 1.1200):
            result = execute_paper_trade(
                session,
                account_id=account.id,
                signal=make_signal(),
                entry_price=price,
                atr14=0.0100,
            )

            assert result.approved is True

        rejected = execute_paper_trade(
            session,
            account_id=account.id,
            signal=make_signal(),
            entry_price=1.1300,
            atr14=0.0100,
        )

        assert rejected.approved is False
        assert rejected.order_id is None
        assert rejected.position_id is None
        assert (
            rejected.reason
            == (
                "Maximum number of open paper positions has "
                "been reached."
            )
        )


def test_usd_jpy_pnl_is_converted_to_usd():
    engine = make_database()

    with Session(engine) as session:
        account = create_paper_trading_account(
            session,
            name="SignalPilot Demo",
            initial_balance=10_000.0,
        )

        signal = make_signal()
        signal["symbol"] = "USD/JPY"

        result = execute_paper_trade(
            session,
            account_id=account.id,
            signal=signal,
            entry_price=150.0,
            atr14=1.0,
        )

        position = mark_position_to_market(
            session,
            position_id=result.position_id,
            current_price=151.5,
        )

        assert position.unrealised_pnl == 99.00990099
