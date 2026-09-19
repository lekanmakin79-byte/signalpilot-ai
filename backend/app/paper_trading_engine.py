from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.database import (
    PaperOrder,
    PaperPosition,
    PaperTradingAccount,
    TradingControl,
)
from app.risk_engine import (
    RiskAssessment,
    RiskConfig,
    calculate_risk_assessment,
)
from app.trading_engine import (
    TradingDecision,
    TradingDecisionConfig,
    evaluate_trading_decision,
)


TRADING_CONTROL_NAME = "paper_trading"


@dataclass(frozen=True)
class PaperTradeResult:
    """
    Result of attempting to execute a paper trade.

    No real broker or exchange is contacted.
    """

    approved: bool
    reason: str

    decision: TradingDecision
    risk_assessment: RiskAssessment | None

    order_id: int | None
    position_id: int | None


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _is_automated_trading_enabled(session: Session) -> bool:
    """
    Check the backend-enforced trading control.

    If no control record exists, trading remains enabled so that
    existing paper-trading environments continue to work normally.
    """

    control = session.exec(
        select(TradingControl).where(
            TradingControl.name == TRADING_CONTROL_NAME
        )
    ).first()

    if control is None:
        return True

    return control.enabled


def _calculate_position_pnl(
    *,
    symbol: str,
    side: str,
    quantity: float,
    entry_price: float,
    current_price: float,
) -> float:
    """
    Calculate unrealised/realised P&L in the account currency.

    Paper Trading v1 assumes a USD account.

    EUR/USD, GBP/USD and XAU/USD are already quoted
    in USD, so the raw price movement is USD P&L.

    USD/JPY produces P&L in JPY. That amount is converted
    back to USD using the current USD/JPY price.
    """

    normalized_symbol = symbol.strip().upper()
    normalized_side = side.strip().upper()

    if normalized_side == "BUY":
        price_difference = current_price - entry_price
    elif normalized_side == "SELL":
        price_difference = entry_price - current_price
    else:
        raise ValueError(
            "Position side must be BUY or SELL."
        )

    quote_currency_pnl = (
        price_difference * quantity
    )

    if normalized_symbol.endswith("/USD"):
        return quote_currency_pnl

    if normalized_symbol == "USD/JPY":
        if current_price <= 0:
            raise ValueError(
                "Current USD/JPY price must be greater than zero."
            )

        return quote_currency_pnl / current_price

    raise ValueError(
        "P&L calculation for this currency relationship "
        "is not supported by Paper Trading v1."
    )


def _calculate_account_equity(
    session: Session,
    account: PaperTradingAccount,
) -> float:
    """
    Recalculate account equity from cash balance plus
    unrealised P&L on all open positions.
    """

    positions = session.exec(
        select(PaperPosition).where(
            PaperPosition.account_id == account.id,
            PaperPosition.status == "OPEN",
        )
    ).all()

    total_unrealised_pnl = sum(
        position.unrealised_pnl
        for position in positions
    )

    return round(
        account.balance + total_unrealised_pnl,
        8,
    )


def create_paper_trading_account(
    session: Session,
    *,
    name: str,
    initial_balance: float,
    currency: str = "USD",
) -> PaperTradingAccount:
    """
    Create a simulated paper-trading account.

    This function does not create or connect to a real
    trading account.
    """

    if not name.strip():
        raise ValueError(
            "Paper trading account name is required."
        )

    if initial_balance <= 0:
        raise ValueError(
            "Initial balance must be greater than zero."
        )

    normalized_currency = currency.strip().upper()

    if normalized_currency != "USD":
        raise ValueError(
            "Paper Trading v1 supports USD accounts only."
        )

    now = _utc_now()

    account = PaperTradingAccount(
        name=name.strip(),
        initial_balance=round(initial_balance, 8),
        balance=round(initial_balance, 8),
        equity=round(initial_balance, 8),
        currency=normalized_currency,
        status="ACTIVE",
        created_at=now,
        updated_at=now,
    )

    session.add(account)
    session.commit()
    session.refresh(account)

    return account


def execute_paper_trade(
    session: Session,
    *,
    account_id: int,
    signal: dict,
    entry_price: float,
    atr14: float | None,
    trading_config: TradingDecisionConfig | None = None,
    risk_config: RiskConfig | None = None,
    signal_history_id: int | None = None,
) -> PaperTradeResult:
    """
    Evaluate and execute one simulated paper trade.

    Execution flow:

        Signal
          ↓
        Kill Switch
          ↓
        Trading Engine
          ↓
        Risk Engine
          ↓
        Paper Order
          ↓
        Paper Position

    A stopped Kill Switch, rejected trading decision or
    rejected risk assessment creates neither an order
    nor a position.
    """

    account = session.get(
        PaperTradingAccount,
        account_id,
    )

    if account is None:
        raise ValueError(
            "Paper trading account was not found."
        )

    if account.status != "ACTIVE":
        raise ValueError(
            "Paper trading account is not active."
        )

    if entry_price <= 0:
        raise ValueError(
            "Entry price must be greater than zero."
        )

    open_position_count = len(
        session.exec(
            select(PaperPosition).where(
                PaperPosition.account_id == account.id,
                PaperPosition.status == "OPEN",
            )
        ).all()
    )

    decision = evaluate_trading_decision(
        signal,
        open_position_count=open_position_count,
        config=trading_config,
    )

    if not decision.approved:
        return PaperTradeResult(
            approved=False,
            reason=decision.reason,
            decision=decision,
            risk_assessment=None,
            order_id=None,
            position_id=None,
        )

    if not _is_automated_trading_enabled(session):
        return PaperTradeResult(
            approved=False,
            reason="Automated paper trading is stopped by the Kill Switch.",
            decision=decision,
            risk_assessment=None,
            order_id=None,
            position_id=None,
        )

    risk_assessment = calculate_risk_assessment(
        symbol=decision.symbol,
        side=decision.action,
        account_balance=account.balance,
        entry_price=entry_price,
        atr14=atr14,
        config=risk_config,
    )

    if not risk_assessment.approved:
        return PaperTradeResult(
            approved=False,
            reason=risk_assessment.reason,
            decision=decision,
            risk_assessment=risk_assessment,
            order_id=None,
            position_id=None,
        )

    now = _utc_now()

    order = PaperOrder(
        account_id=account.id,
        symbol=decision.symbol,
        timeframe=decision.timeframe,
        side=decision.action,
        order_type="MARKET",
        quantity=risk_assessment.quantity,
        requested_price=entry_price,
        executed_price=entry_price,
        stop_loss=risk_assessment.stop_loss,
        take_profit=risk_assessment.take_profit,
        status="FILLED",
        signal_history_id=signal_history_id,
        confidence=decision.confidence,
        quality_score=decision.quality_score,
        created_at=now,
        executed_at=now,
    )

    session.add(order)
    session.flush()

    position = PaperPosition(
        account_id=account.id,
        symbol=decision.symbol,
        timeframe=decision.timeframe,
        side=decision.action,
        quantity=risk_assessment.quantity,
        entry_price=entry_price,
        current_price=entry_price,
        stop_loss=risk_assessment.stop_loss,
        take_profit=risk_assessment.take_profit,
        unrealised_pnl=0.0,
        realised_pnl=None,
        status="OPEN",
        order_id=order.id,
        opened_at=now,
        closed_at=None,
        exit_price=None,
    )

    session.add(position)

    account.equity = _calculate_account_equity(
        session,
        account,
    )
    account.updated_at = now

    session.add(account)
    session.commit()

    session.refresh(order)
    session.refresh(position)
    session.refresh(account)

    return PaperTradeResult(
        approved=True,
        reason="Paper trade executed successfully.",
        decision=decision,
        risk_assessment=risk_assessment,
        order_id=order.id,
        position_id=position.id,
    )


def mark_position_to_market(
    session: Session,
    *,
    position_id: int,
    current_price: float,
) -> PaperPosition:
    """
    Update an open paper position using a new market price.

    This changes only simulated position/account data.
    """

    if current_price <= 0:
        raise ValueError(
            "Current price must be greater than zero."
        )

    position = session.get(
        PaperPosition,
        position_id,
    )

    if position is None:
        raise ValueError(
            "Paper position was not found."
        )

    if position.status != "OPEN":
        raise ValueError(
            "Only open paper positions can be marked to market."
        )

    position.current_price = current_price
    position.unrealised_pnl = round(
        _calculate_position_pnl(
            symbol=position.symbol,
            side=position.side,
            quantity=position.quantity,
            entry_price=position.entry_price,
            current_price=current_price,
        ),
        8,
    )

    account = session.get(
        PaperTradingAccount,
        position.account_id,
    )

    if account is None:
        raise ValueError(
            "Paper trading account was not found."
        )

    session.add(position)

    account.equity = _calculate_account_equity(
        session,
        account,
    )
    account.updated_at = _utc_now()

    session.add(account)
    session.commit()

    session.refresh(position)

    return position


def close_paper_position(
    session: Session,
    *,
    position_id: int,
    exit_price: float,
) -> PaperPosition:
    """
    Close an open paper position and realise its P&L.
    """

    if exit_price <= 0:
        raise ValueError(
            "Exit price must be greater than zero."
        )

    position = session.get(
        PaperPosition,
        position_id,
    )

    if position is None:
        raise ValueError(
            "Paper position was not found."
        )

    if position.status != "OPEN":
        raise ValueError(
            "Paper position is already closed."
        )

    realised_pnl = round(
        _calculate_position_pnl(
            symbol=position.symbol,
            side=position.side,
            quantity=position.quantity,
            entry_price=position.entry_price,
            current_price=exit_price,
        ),
        8,
    )

    now = _utc_now()

    position.current_price = exit_price
    position.unrealised_pnl = 0.0
    position.realised_pnl = realised_pnl
    position.status = "CLOSED"
    position.closed_at = now
    position.exit_price = exit_price

    account = session.get(
        PaperTradingAccount,
        position.account_id,
    )

    if account is None:
        raise ValueError(
            "Paper trading account was not found."
        )

    account.balance = round(
        account.balance + realised_pnl,
        8,
    )

    session.add(position)

    account.equity = _calculate_account_equity(
        session,
        account,
    )
    account.updated_at = now

    session.add(account)
    session.commit()

    session.refresh(position)

    return position