from __future__ import annotations

from sqlmodel import Session, SQLModel, create_engine

from app.database import (
    PaperTradingAccount,
    TradingControl,
)
from app.paper_trading_engine import execute_paper_trade


def _create_test_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    return engine


def _create_account(session: Session) -> PaperTradingAccount:
    account = PaperTradingAccount(
        name="Kill Switch Test Account",
        initial_balance=10_000.0,
        balance=10_000.0,
        equity=10_000.0,
        currency="USD",
        status="ACTIVE",
        created_at="2026-01-01T00:00:00+00:00",
        updated_at="2026-01-01T00:00:00+00:00",
    )

    session.add(account)
    session.commit()
    session.refresh(account)

    return account


def _create_signal() -> dict:
    return {
        "symbol": "EUR/USD",
        "timeframe": "5min",
        "direction": "UP",
        "confidence": 80.0,
        "quality": {
            "quality_score": 80.0,
        },
        "risk": {
            "risk_level": "LOWER",
        },
    }


def test_kill_switch_blocks_new_paper_trade():
    engine = _create_test_engine()

    with Session(engine) as session:
        account = _create_account(session)

        control = TradingControl(
            name="paper_trading",
            enabled=False,
            reason="Automated trading stopped by operator.",
            updated_at="2026-01-01T00:00:00+00:00",
        )

        session.add(control)
        session.commit()

        result = execute_paper_trade(
            session,
            account_id=account.id,
            signal=_create_signal(),
            entry_price=1.1500,
            atr14=0.0010,
        )

        assert result.approved is False
        assert result.order_id is None
        assert result.position_id is None
        assert "Kill Switch" in result.reason

        orders = session.exec(
            __import__("sqlmodel").select(
                __import__("app.database", fromlist=["PaperOrder"]).PaperOrder
            )
        ).all()

        positions = session.exec(
            __import__("sqlmodel").select(
                __import__("app.database", fromlist=["PaperPosition"]).PaperPosition
            )
        ).all()

        assert orders == []
        assert positions == []


def test_existing_position_remains_open_when_kill_switch_is_active():
    engine = _create_test_engine()

    with Session(engine) as session:
        account = _create_account(session)

        control = TradingControl(
            name="paper_trading",
            enabled=False,
            reason="Automated trading stopped by operator.",
            updated_at="2026-01-01T00:00:00+00:00",
        )

        session.add(control)
        session.commit()

        result = execute_paper_trade(
            session,
            account_id=account.id,
            signal=_create_signal(),
            entry_price=1.1500,
            atr14=0.0010,
        )

        assert result.approved is False

        assert account.status == "ACTIVE"


def test_kill_switch_allows_new_trade_after_restart():
    engine = _create_test_engine()

    with Session(engine) as session:
        account = _create_account(session)

        control = TradingControl(
            name="paper_trading",
            enabled=True,
            reason=None,
            updated_at="2026-01-01T00:00:00+00:00",
        )

        session.add(control)
        session.commit()

        result = execute_paper_trade(
            session,
            account_id=account.id,
            signal=_create_signal(),
            entry_price=1.1500,
            atr14=0.0010,
        )

        assert result.approved is True
        assert result.order_id is not None
        assert result.position_id is not None