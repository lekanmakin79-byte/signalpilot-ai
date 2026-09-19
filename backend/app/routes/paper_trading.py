from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import (
    PaperOrder,
    PaperPosition,
    PaperTradingAccount,
    SignalHistory,
    engine,
)
from ..market_data import get_candles
from ..paper_trading_engine import (
    close_paper_position,
    create_paper_trading_account,
    execute_paper_trade,
    mark_position_to_market,
)
from ..signal_engine import generate_signal


router = APIRouter(
    prefix="/paper-trading",
    tags=["Paper Trading"],
)


class CreateAccountRequest(BaseModel):
    name: str = Field(min_length=1)
    initial_balance: float = Field(gt=0)
    currency: str = "USD"


class ExecuteTradeRequest(BaseModel):
    account_id: int
    signal: dict[str, Any]
    entry_price: float = Field(gt=0)
    atr14: float | None = Field(default=None, gt=0)
    signal_history_id: int | None = None


class AutoEvaluateRequest(BaseModel):
    account_id: int
    symbol: str = Field(min_length=1)
    interval: str = "5m"
    limit: int = Field(default=100, ge=50, le=5000)


class MarkPositionRequest(BaseModel):
    current_price: float = Field(gt=0)


class ClosePositionRequest(BaseModel):
    exit_price: float = Field(gt=0)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _account_response(
    account: PaperTradingAccount,
) -> dict[str, Any]:
    return {
        "id": account.id,
        "name": account.name,
        "initial_balance": account.initial_balance,
        "balance": account.balance,
        "equity": account.equity,
        "currency": account.currency,
        "status": account.status,
        "created_at": account.created_at,
        "updated_at": account.updated_at,
    }


def _order_response(
    order: PaperOrder,
) -> dict[str, Any]:
    return {
        "id": order.id,
        "account_id": order.account_id,
        "symbol": order.symbol,
        "timeframe": order.timeframe,
        "side": order.side,
        "order_type": order.order_type,
        "quantity": order.quantity,
        "requested_price": order.requested_price,
        "executed_price": order.executed_price,
        "stop_loss": order.stop_loss,
        "take_profit": order.take_profit,
        "status": order.status,
        "signal_history_id": order.signal_history_id,
        "confidence": order.confidence,
        "quality_score": order.quality_score,
        "created_at": order.created_at,
        "executed_at": order.executed_at,
    }


def _position_response(
    position: PaperPosition,
) -> dict[str, Any]:
    return {
        "id": position.id,
        "account_id": position.account_id,
        "symbol": position.symbol,
        "timeframe": position.timeframe,
        "side": position.side,
        "quantity": position.quantity,
        "entry_price": position.entry_price,
        "current_price": position.current_price,
        "stop_loss": position.stop_loss,
        "take_profit": position.take_profit,
        "unrealised_pnl": position.unrealised_pnl,
        "realised_pnl": position.realised_pnl,
        "status": position.status,
        "order_id": position.order_id,
        "opened_at": position.opened_at,
        "closed_at": position.closed_at,
        "exit_price": position.exit_price,
    }


def _signal_response(
    signal: dict[str, Any],
    history_id: int | None,
) -> dict[str, Any]:
    return {
        "signal": signal,
        "history_id": history_id,
    }


def _save_signal_history(
    session: Session,
    signal: dict[str, Any],
) -> SignalHistory:
    history_record = SignalHistory(
        symbol=signal["symbol"],
        timeframe=signal["timeframe"],
        price=signal["price"],
        signal_timestamp=signal["signal_timestamp"],
        direction=signal["direction"],
        confidence=signal["confidence"],
        trend=signal["trend"],
        momentum=signal["momentum"],
        volatility=signal["volatility"],
        trend_score=signal["scores"]["trend"],
        momentum_score=signal["scores"]["momentum"],
        volatility_score=signal["scores"]["volatility"],
        directional_score=signal["scores"]["directional"],
        ema20=signal["indicators"]["ema20"],
        ema50=signal["indicators"]["ema50"],
        rsi14=signal["indicators"]["rsi14"],
        macd=signal["indicators"]["macd"]["macd"],
        macd_signal=signal["indicators"]["macd"]["signal"],
        macd_histogram=signal["indicators"]["macd"]["histogram"],
        atr14=signal["indicators"]["atr14"],
        risk_level=signal["risk"]["risk_level"],
        explanation=signal["explanation"],
        data_points=signal["data_points"],
        created_at=_utc_now(),
    )

    session.add(history_record)
    session.commit()
    session.refresh(history_record)

    return history_record


def _get_open_position(
    session: Session,
    *,
    account_id: int,
    symbol: str,
    timeframe: str,
) -> PaperPosition | None:
    return session.exec(
        select(PaperPosition)
        .where(
            PaperPosition.account_id == account_id,
            PaperPosition.symbol == symbol,
            PaperPosition.timeframe == timeframe,
            PaperPosition.status == "OPEN",
        )
        .order_by(PaperPosition.id.desc())
    ).first()


def _safe_average(
    values: list[float],
) -> float:
    if not values:
        return 0.0

    return sum(values) / len(values)


def _safe_profit_factor(
    gross_profit: float,
    gross_loss: float,
) -> float:
    if gross_loss <= 0:
        if gross_profit > 0:
            return 0.0

        return 0.0

    return gross_profit / gross_loss


def _calculate_maximum_drawdown(
    *,
    initial_balance: float,
    closed_positions: list[PaperPosition],
) -> tuple[float, float]:
    """
    Calculate maximum realised-equity drawdown.

    Returns:

        (maximum_drawdown_amount, maximum_drawdown_percent)

    The equity curve starts at the account's initial balance
    and applies each closed trade's realised P&L in chronological
    order.
    """

    if initial_balance <= 0:
        return 0.0, 0.0

    ordered_positions = sorted(
        closed_positions,
        key=lambda position: (
            position.closed_at or "",
            position.id or 0,
        ),
    )

    equity = float(initial_balance)
    peak_equity = equity
    maximum_drawdown_amount = 0.0
    maximum_drawdown_percent = 0.0

    for position in ordered_positions:
        realised_pnl = position.realised_pnl

        if realised_pnl is None:
            continue

        equity += realised_pnl

        if equity > peak_equity:
            peak_equity = equity

        drawdown_amount = peak_equity - equity

        if drawdown_amount > maximum_drawdown_amount:
            maximum_drawdown_amount = drawdown_amount

        if peak_equity > 0:
            drawdown_percent = (
                drawdown_amount / peak_equity
            ) * 100

            if drawdown_percent > maximum_drawdown_percent:
                maximum_drawdown_percent = drawdown_percent

    return (
        round(maximum_drawdown_amount, 8),
        round(maximum_drawdown_percent, 8),
    )


def _build_equity_curve(
    *,
    initial_balance: float,
    closed_positions: list[PaperPosition],
) -> list[dict[str, Any]]:
    """
    Build the realised-trade equity curve.

    The first point represents the initial account balance.
    Each subsequent point represents the balance after one
    closed paper trade.
    """

    ordered_positions = sorted(
        closed_positions,
        key=lambda position: (
            position.closed_at or "",
            position.id or 0,
        ),
    )

    equity = float(initial_balance)

    curve: list[dict[str, Any]] = [
        {
            "timestamp": None,
            "position_id": None,
            "symbol": None,
            "side": None,
            "realised_pnl": 0.0,
            "equity": round(equity, 8),
        }
    ]

    for position in ordered_positions:
        realised_pnl = position.realised_pnl

        if realised_pnl is None:
            continue

        equity += realised_pnl

        curve.append(
            {
                "timestamp": position.closed_at,
                "position_id": position.id,
                "symbol": position.symbol,
                "side": position.side,
                "realised_pnl": round(
                    realised_pnl,
                    8,
                ),
                "equity": round(
                    equity,
                    8,
                ),
            }
        )

    return curve


def _build_market_performance(
    closed_positions: list[PaperPosition],
) -> list[dict[str, Any]]:
    grouped: dict[str, list[PaperPosition]] = defaultdict(list)

    for position in closed_positions:
        grouped[position.symbol].append(position)

    results: list[dict[str, Any]] = []

    for symbol, positions in grouped.items():
        pnls = [
            position.realised_pnl
            for position in positions
            if position.realised_pnl is not None
        ]

        wins = [
            pnl
            for pnl in pnls
            if pnl > 0
        ]

        losses = [
            pnl
            for pnl in pnls
            if pnl < 0
        ]

        total_pnl = sum(pnls)
        gross_profit = sum(wins)
        gross_loss = abs(sum(losses))

        results.append(
            {
                "market": symbol,
                "total_trades": len(pnls),
                "winning_trades": len(wins),
                "losing_trades": len(losses),
                "breakeven_trades": len(
                    [
                        pnl
                        for pnl in pnls
                        if pnl == 0
                    ]
                ),
                "win_rate": round(
                    (
                        len(wins) / len(pnls)
                    ) * 100
                    if pnls
                    else 0.0,
                    4,
                ),
                "total_realised_pnl": round(
                    total_pnl,
                    8,
                ),
                "average_trade": round(
                    _safe_average(pnls),
                    8,
                ),
                "average_winning_trade": round(
                    _safe_average(wins),
                    8,
                ),
                "average_losing_trade": round(
                    _safe_average(losses),
                    8,
                ),
                "profit_factor": round(
                    _safe_profit_factor(
                        gross_profit,
                        gross_loss,
                    ),
                    4,
                ),
            }
        )

    results.sort(
        key=lambda item: item["total_realised_pnl"],
        reverse=True,
    )

    return results


def _build_side_performance(
    closed_positions: list[PaperPosition],
) -> list[dict[str, Any]]:
    grouped: dict[str, list[PaperPosition]] = defaultdict(list)

    for position in closed_positions:
        grouped[position.side].append(position)

    results: list[dict[str, Any]] = []

    for side, positions in grouped.items():
        pnls = [
            position.realised_pnl
            for position in positions
            if position.realised_pnl is not None
        ]

        wins = [
            pnl
            for pnl in pnls
            if pnl > 0
        ]

        losses = [
            pnl
            for pnl in pnls
            if pnl < 0
        ]

        gross_profit = sum(wins)
        gross_loss = abs(sum(losses))

        results.append(
            {
                "side": side,
                "total_trades": len(pnls),
                "winning_trades": len(wins),
                "losing_trades": len(losses),
                "breakeven_trades": len(
                    [
                        pnl
                        for pnl in pnls
                        if pnl == 0
                    ]
                ),
                "win_rate": round(
                    (
                        len(wins) / len(pnls)
                    ) * 100
                    if pnls
                    else 0.0,
                    4,
                ),
                "total_realised_pnl": round(
                    sum(pnls),
                    8,
                ),
                "average_trade": round(
                    _safe_average(pnls),
                    8,
                ),
                "average_winning_trade": round(
                    _safe_average(wins),
                    8,
                ),
                "average_losing_trade": round(
                    _safe_average(losses),
                    8,
                ),
                "profit_factor": round(
                    _safe_profit_factor(
                        gross_profit,
                        gross_loss,
                    ),
                    4,
                ),
            }
        )

    results.sort(
        key=lambda item: item["total_realised_pnl"],
        reverse=True,
    )

    return results


def _build_time_performance(
    closed_positions: list[PaperPosition],
) -> list[dict[str, Any]]:
    grouped: dict[str, list[PaperPosition]] = defaultdict(list)

    for position in closed_positions:
        if not position.closed_at:
            continue

        try:
            timestamp = datetime.fromisoformat(
                position.closed_at.replace(
                    "Z",
                    "+00:00",
                )
            )

            period = timestamp.date().isoformat()

        except ValueError:
            period = position.closed_at[:10]

        grouped[period].append(position)

    results: list[dict[str, Any]] = []

    for period, positions in sorted(
        grouped.items()
    ):
        pnls = [
            position.realised_pnl
            for position in positions
            if position.realised_pnl is not None
        ]

        wins = [
            pnl
            for pnl in pnls
            if pnl > 0
        ]

        results.append(
            {
                "date": period,
                "total_trades": len(pnls),
                "winning_trades": len(wins),
                "losing_trades": len(
                    [
                        pnl
                        for pnl in pnls
                        if pnl < 0
                    ]
                ),
                "total_realised_pnl": round(
                    sum(pnls),
                    8,
                ),
                "win_rate": round(
                    (
                        len(wins) / len(pnls)
                    ) * 100
                    if pnls
                    else 0.0,
                    4,
                ),
            }
        )

    return results


def _build_recent_trades(
    closed_positions: list[PaperPosition],
    limit: int = 20,
) -> list[dict[str, Any]]:
    ordered_positions = sorted(
        closed_positions,
        key=lambda position: (
            position.closed_at or "",
            position.id or 0,
        ),
        reverse=True,
    )

    return [
        {
            "id": position.id,
            "symbol": position.symbol,
            "timeframe": position.timeframe,
            "side": position.side,
            "quantity": position.quantity,
            "entry_price": position.entry_price,
            "exit_price": position.exit_price,
            "realised_pnl": position.realised_pnl,
            "opened_at": position.opened_at,
            "closed_at": position.closed_at,
            "order_id": position.order_id,
        }
        for position in ordered_positions[:limit]
    ]


@router.post("/accounts")
async def create_account(
    request: CreateAccountRequest,
):
    try:
        with Session(engine) as session:
            account = create_paper_trading_account(
                session,
                name=request.name,
                initial_balance=request.initial_balance,
                currency=request.currency,
            )

            return {
                "success": True,
                "account": _account_response(account),
            }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


@router.get("/accounts/{account_id}")
async def get_account(
    account_id: int,
):
    with Session(engine) as session:
        account = session.get(
            PaperTradingAccount,
            account_id,
        )

        if account is None:
            raise HTTPException(
                status_code=404,
                detail="Paper trading account was not found.",
            )

        return {
            "success": True,
            "account": _account_response(account),
        }


@router.post("/trades")
async def execute_trade(
    request: ExecuteTradeRequest,
):
    try:
        with Session(engine) as session:
            result = execute_paper_trade(
                session,
                account_id=request.account_id,
                signal=request.signal,
                entry_price=request.entry_price,
                atr14=request.atr14,
                signal_history_id=request.signal_history_id,
            )

            return {
                "success": result.approved,
                "approved": result.approved,
                "reason": result.reason,
                "decision": {
                    "approved": result.decision.approved,
                    "action": result.decision.action,
                    "reason": result.decision.reason,
                    "symbol": result.decision.symbol,
                    "timeframe": result.decision.timeframe,
                    "direction": result.decision.direction,
                    "confidence": result.decision.confidence,
                    "quality_score": result.decision.quality_score,
                    "risk_level": result.decision.risk_level,
                },
                "risk_assessment": (
                    None
                    if result.risk_assessment is None
                    else {
                        "approved": result.risk_assessment.approved,
                        "reason": result.risk_assessment.reason,
                        "symbol": result.risk_assessment.symbol,
                        "side": result.risk_assessment.side,
                        "entry_price": result.risk_assessment.entry_price,
                        "atr14": result.risk_assessment.atr14,
                        "risk_amount": result.risk_assessment.risk_amount,
                        "stop_distance": result.risk_assessment.stop_distance,
                        "quantity": result.risk_assessment.quantity,
                        "notional_value": result.risk_assessment.notional_value,
                        "stop_loss": result.risk_assessment.stop_loss,
                        "take_profit": result.risk_assessment.take_profit,
                    }
                ),
                "order_id": result.order_id,
                "position_id": result.position_id,
            }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


@router.post("/auto-evaluate")
async def auto_evaluate(
    request: AutoEvaluateRequest,
):
    """
    Automatically evaluate the latest SignalPilot signal
    and execute a paper trade when all trading and risk
    requirements are satisfied.

    This endpoint never connects to a broker or exchange.

    Automatic execution flow:

        Market Data
            ↓
        Signal Engine
            ↓
        Signal History
            ↓
        Existing Open Position Check
            ↓
        Trading Engine
            ↓
        Risk Engine
            ↓
        Paper Order / Paper Position
    """

    symbol = request.symbol.strip().upper()
    interval = request.interval.strip().lower()

    if not symbol:
        raise HTTPException(
            status_code=400,
            detail="Symbol is required.",
        )

    if not interval:
        raise HTTPException(
            status_code=400,
            detail="Interval is required.",
        )

    try:
        with Session(engine) as session:
            account = session.get(
                PaperTradingAccount,
                request.account_id,
            )

            if account is None:
                raise HTTPException(
                    status_code=404,
                    detail="Paper trading account was not found.",
                )

            if account.status != "ACTIVE":
                raise HTTPException(
                    status_code=400,
                    detail="Paper trading account is not active.",
                )

            existing_position = _get_open_position(
                session,
                account_id=account.id,
                symbol=symbol,
                timeframe=interval,
            )

            if existing_position is not None:
                return {
                    "success": True,
                    "status": "SKIPPED_OPEN_POSITION",
                    "executed": False,
                    "reason": (
                        "An open paper position already exists "
                        "for this account, symbol, and timeframe."
                    ),
                    "account": _account_response(account),
                    "signal": None,
                    "history_id": None,
                    "decision": None,
                    "risk_assessment": None,
                    "order_id": None,
                    "position_id": existing_position.id,
                }

            candles = await get_candles(
                symbol=symbol,
                interval=interval,
                outputsize=request.limit,
            )

            signal_result = generate_signal(
                symbol=symbol,
                candles=candles,
                timeframe=interval,
            )

            history_record = _save_signal_history(
                session,
                signal_result,
            )

            result = execute_paper_trade(
                session,
                account_id=account.id,
                signal=signal_result,
                entry_price=signal_result["price"],
                atr14=signal_result["indicators"]["atr14"],
                signal_history_id=history_record.id,
            )

            refreshed_account = session.get(
                PaperTradingAccount,
                account.id,
            )

            order = (
                session.get(
                    PaperOrder,
                    result.order_id,
                )
                if result.order_id is not None
                else None
            )

            position = (
                session.get(
                    PaperPosition,
                    result.position_id,
                )
                if result.position_id is not None
                else None
            )

            return {
                "success": True,
                "status": (
                    "EXECUTED"
                    if result.approved
                    else "REJECTED"
                ),
                "executed": result.approved,
                "reason": result.reason,
                "account": (
                    _account_response(refreshed_account)
                    if refreshed_account is not None
                    else None
                ),
                **_signal_response(
                    signal_result,
                    history_record.id,
                ),
                "decision": {
                    "approved": result.decision.approved,
                    "action": result.decision.action,
                    "reason": result.decision.reason,
                    "symbol": result.decision.symbol,
                    "timeframe": result.decision.timeframe,
                    "direction": result.decision.direction,
                    "confidence": result.decision.confidence,
                    "quality_score": result.decision.quality_score,
                    "risk_level": result.decision.risk_level,
                },
                "risk_assessment": (
                    None
                    if result.risk_assessment is None
                    else {
                        "approved": result.risk_assessment.approved,
                        "reason": result.risk_assessment.reason,
                        "symbol": result.risk_assessment.symbol,
                        "side": result.risk_assessment.side,
                        "entry_price": result.risk_assessment.entry_price,
                        "atr14": result.risk_assessment.atr14,
                        "risk_amount": result.risk_assessment.risk_amount,
                        "stop_distance": result.risk_assessment.stop_distance,
                        "quantity": result.risk_assessment.quantity,
                        "notional_value": result.risk_assessment.notional_value,
                        "stop_loss": result.risk_assessment.stop_loss,
                        "take_profit": result.risk_assessment.take_profit,
                    }
                ),
                "order_id": result.order_id,
                "position_id": result.position_id,
                "order": (
                    _order_response(order)
                    if order is not None
                    else None
                ),
                "position": (
                    _position_response(position)
                    if position is not None
                    else None
                ),
            }

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=502,
            detail=str(error),
        )


@router.get("/accounts/{account_id}/orders")
async def get_orders(
    account_id: int,
):
    with Session(engine) as session:
        account = session.get(
            PaperTradingAccount,
            account_id,
        )

        if account is None:
            raise HTTPException(
                status_code=404,
                detail="Paper trading account was not found.",
            )

        orders = session.exec(
            select(PaperOrder)
            .where(
                PaperOrder.account_id == account_id,
            )
            .order_by(PaperOrder.id.desc())
        ).all()

        return {
            "success": True,
            "count": len(orders),
            "orders": [
                _order_response(order)
                for order in orders
            ],
        }


@router.get("/accounts/{account_id}/positions")
async def get_positions(
    account_id: int,
    status: str = "OPEN",
):
    normalized_status = status.strip().upper()

    if normalized_status not in {
        "OPEN",
        "CLOSED",
        "ALL",
    }:
        raise HTTPException(
            status_code=400,
            detail="Position status must be OPEN, CLOSED, or ALL.",
        )

    with Session(engine) as session:
        account = session.get(
            PaperTradingAccount,
            account_id,
        )

        if account is None:
            raise HTTPException(
                status_code=404,
                detail="Paper trading account was not found.",
            )

        statement = select(PaperPosition).where(
            PaperPosition.account_id == account_id,
        )

        if normalized_status != "ALL":
            statement = statement.where(
                PaperPosition.status == normalized_status,
            )

        statement = statement.order_by(
            PaperPosition.id.desc()
        )

        positions = session.exec(statement).all()

        return {
            "success": True,
            "count": len(positions),
            "positions": [
                _position_response(position)
                for position in positions
            ],
        }


@router.get("/accounts/{account_id}/performance")
async def get_performance(
    account_id: int,
):
    """
    Return authoritative paper-trading performance analytics.

    Performance statistics are based on CLOSED paper positions
    and their realised P&L.

    Open-position unrealised P&L is reported separately.
    No real broker or exchange data is used.
    """

    with Session(engine) as session:
        account = session.get(
            PaperTradingAccount,
            account_id,
        )

        if account is None:
            raise HTTPException(
                status_code=404,
                detail="Paper trading account was not found.",
            )

        positions = session.exec(
            select(PaperPosition)
            .where(
                PaperPosition.account_id == account_id,
            )
            .order_by(PaperPosition.id.asc())
        ).all()

        closed_positions = [
            position
            for position in positions
            if position.status == "CLOSED"
            and position.realised_pnl is not None
        ]

        open_positions = [
            position
            for position in positions
            if position.status == "OPEN"
        ]

        pnls = [
            float(position.realised_pnl)
            for position in closed_positions
            if position.realised_pnl is not None
        ]

        winning_trades = [
            pnl
            for pnl in pnls
            if pnl > 0
        ]

        losing_trades = [
            pnl
            for pnl in pnls
            if pnl < 0
        ]

        breakeven_trades = [
            pnl
            for pnl in pnls
            if pnl == 0
        ]

        gross_profit = sum(
            winning_trades
        )

        gross_loss = abs(
            sum(losing_trades)
        )

        total_realised_pnl = sum(pnls)

        total_unrealised_pnl = sum(
            position.unrealised_pnl
            for position in open_positions
        )

        total_trades = len(pnls)

        win_rate = (
            (
                len(winning_trades)
                / total_trades
            )
            * 100
            if total_trades
            else 0.0
        )

        maximum_drawdown_amount, maximum_drawdown_percent = (
            _calculate_maximum_drawdown(
                initial_balance=account.initial_balance,
                closed_positions=closed_positions,
            )
        )

        equity_curve = _build_equity_curve(
            initial_balance=account.initial_balance,
            closed_positions=closed_positions,
        )

        return {
            "success": True,
            "account": _account_response(account),
            "summary": {
                "initial_balance": round(
                    account.initial_balance,
                    8,
                ),
                "current_balance": round(
                    account.balance,
                    8,
                ),
                "current_equity": round(
                    account.equity,
                    8,
                ),
                "total_realised_pnl": round(
                    total_realised_pnl,
                    8,
                ),
                "total_unrealised_pnl": round(
                    total_unrealised_pnl,
                    8,
                ),
                "net_pnl": round(
                    total_realised_pnl
                    + total_unrealised_pnl,
                    8,
                ),
                "total_trades": total_trades,
                "closed_trades": total_trades,
                "open_trades": len(
                    open_positions
                ),
                "winning_trades": len(
                    winning_trades
                ),
                "losing_trades": len(
                    losing_trades
                ),
                "breakeven_trades": len(
                    breakeven_trades
                ),
                "win_rate": round(
                    win_rate,
                    4,
                ),
                "average_trade": round(
                    _safe_average(pnls),
                    8,
                ),
                "average_winning_trade": round(
                    _safe_average(
                        winning_trades
                    ),
                    8,
                ),
                "average_losing_trade": round(
                    _safe_average(
                        losing_trades
                    ),
                    8,
                ),
                "gross_profit": round(
                    gross_profit,
                    8,
                ),
                "gross_loss": round(
                    gross_loss,
                    8,
                ),
                "profit_factor": round(
                    _safe_profit_factor(
                        gross_profit,
                        gross_loss,
                    ),
                    4,
                ),
                "best_trade": round(
                    max(pnls)
                    if pnls
                    else 0.0,
                    8,
                ),
                "worst_trade": round(
                    min(pnls)
                    if pnls
                    else 0.0,
                    8,
                ),
                "maximum_drawdown": round(
                    maximum_drawdown_amount,
                    8,
                ),
                "maximum_drawdown_percent": round(
                    maximum_drawdown_percent,
                    4,
                ),
            },
            "by_market": _build_market_performance(
                closed_positions
            ),
            "by_side": _build_side_performance(
                closed_positions
            ),
            "over_time": _build_time_performance(
                closed_positions
            ),
            "equity_curve": equity_curve,
            "recent_trades": _build_recent_trades(
                closed_positions
            ),
        }


@router.post("/positions/{position_id}/mark")
async def mark_position(
    position_id: int,
    request: MarkPositionRequest,
):
    try:
        with Session(engine) as session:
            position = mark_position_to_market(
                session,
                position_id=position_id,
                current_price=request.current_price,
            )

            account = session.get(
                PaperTradingAccount,
                position.account_id,
            )

            return {
                "success": True,
                "account": (
                    _account_response(account)
                    if account is not None
                    else None
                ),
                "position": _position_response(position),
            }

    except ValueError as error:
        message = str(error)

        if "was not found" in message:
            status_code = 404
        else:
            status_code = 400

        raise HTTPException(
            status_code=status_code,
            detail=message,
        )


@router.post("/positions/{position_id}/close")
async def close_position(
    position_id: int,
    request: ClosePositionRequest,
):
    try:
        with Session(engine) as session:
            position = close_paper_position(
                session,
                position_id=position_id,
                exit_price=request.exit_price,
            )

            account = session.get(
                PaperTradingAccount,
                position.account_id,
            )

            return {
                "success": True,
                "account": (
                    _account_response(account)
                    if account is not None
                    else None
                ),
                "position": _position_response(position),
                "realised_pnl": position.realised_pnl,
            }

    except ValueError as error:
        message = str(error)

        if "was not found" in message:
            status_code = 404
        else:
            status_code = 400

        raise HTTPException(
            status_code=status_code,
            detail=message,
        )