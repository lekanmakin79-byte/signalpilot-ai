from __future__ import annotations

from dataclasses import dataclass


DEFAULT_RISK_PERCENT = 1.0
DEFAULT_STOP_LOSS_ATR_MULTIPLIER = 1.5
DEFAULT_REWARD_RISK_RATIO = 2.0
DEFAULT_MAX_POSITION_EXPOSURE_PERCENT = 100.0


@dataclass(frozen=True)
class RiskConfig:
    """
    Deterministic risk controls for paper trading.

    These values are configurable simulation parameters.
    They do not imply that any particular risk level or
    trading configuration is appropriate for live trading.
    """

    risk_percent: float = DEFAULT_RISK_PERCENT

    stop_loss_atr_multiplier: float = (
        DEFAULT_STOP_LOSS_ATR_MULTIPLIER
    )

    reward_risk_ratio: float = (
        DEFAULT_REWARD_RISK_RATIO
    )

    max_position_exposure_percent: float = (
        DEFAULT_MAX_POSITION_EXPOSURE_PERCENT
    )


@dataclass(frozen=True)
class RiskAssessment:
    approved: bool
    reason: str

    symbol: str
    side: str

    entry_price: float
    atr14: float

    risk_amount: float
    stop_distance: float

    quantity: float
    notional_value: float

    stop_loss: float
    take_profit: float


def _normalise_symbol(symbol: str) -> str:
    return symbol.strip().upper()


def _normalise_side(side: str) -> str:
    return side.strip().upper()


def _calculate_quantity(
    symbol: str,
    risk_amount: float,
    stop_distance: float,
    entry_price: float,
) -> float:
    """
    Calculate simulated position quantity.

    For instruments quoted in the account currency
    (EUR/USD, GBP/USD and XAU/USD with a USD account):

        quantity = risk amount / stop distance

    For USD/JPY with a USD account, quantity represents
    USD base units, so the same risk calculation applies:

        quantity = risk amount * entry price / stop distance

    This function returns units of the base asset.
    """

    if symbol.endswith("/USD"):
        return risk_amount / stop_distance

    if symbol == "USD/JPY":
        return (
            risk_amount
            * entry_price
            / stop_distance
        )

    raise ValueError(
        "Position sizing for this currency relationship "
        "is not supported by Paper Trading v1."
    )


def _calculate_account_currency_exposure(
    symbol: str,
    quantity: float,
    entry_price: float,
) -> float:
    """
    Calculate exposure in the account currency.

    Paper Trading v1 assumes a USD account.

    EUR/USD, GBP/USD and XAU/USD are quoted in USD,
    so quantity × price gives USD exposure.

    USD/JPY has USD as the base currency, so quantity
    itself represents USD exposure.
    """

    if symbol.endswith("/USD"):
        return quantity * entry_price

    if symbol == "USD/JPY":
        return quantity

    raise ValueError(
        "Exposure calculation for this currency relationship "
        "is not supported by Paper Trading v1."
    )


def calculate_risk_assessment(
    *,
    symbol: str,
    side: str,
    account_balance: float,
    entry_price: float,
    atr14: float | None,
    config: RiskConfig | None = None,
) -> RiskAssessment:
    """
    Calculate deterministic paper-trading risk parameters.

    The risk-based position size is calculated first. If that
    position would exceed the configured maximum exposure,
    the quantity is capped at the maximum permitted exposure.

    This means the exposure limit can reduce the actual risk
    below the configured risk percentage, but it can never
    increase risk above the configured percentage.

    This function does not create orders, modify balances,
    create positions, contact brokers, or execute trades.
    """

    if config is None:
        config = RiskConfig()

    normalized_symbol = _normalise_symbol(symbol)
    normalized_side = _normalise_side(side)

    if normalized_side not in {"BUY", "SELL"}:
        return RiskAssessment(
            approved=False,
            reason="Trade side must be BUY or SELL.",
            symbol=normalized_symbol,
            side=normalized_side,
            entry_price=entry_price,
            atr14=atr14 or 0.0,
            risk_amount=0.0,
            stop_distance=0.0,
            quantity=0.0,
            notional_value=0.0,
            stop_loss=0.0,
            take_profit=0.0,
        )

    if account_balance <= 0:
        return RiskAssessment(
            approved=False,
            reason="Account balance must be greater than zero.",
            symbol=normalized_symbol,
            side=normalized_side,
            entry_price=entry_price,
            atr14=atr14 or 0.0,
            risk_amount=0.0,
            stop_distance=0.0,
            quantity=0.0,
            notional_value=0.0,
            stop_loss=0.0,
            take_profit=0.0,
        )

    if entry_price <= 0:
        return RiskAssessment(
            approved=False,
            reason="Entry price must be greater than zero.",
            symbol=normalized_symbol,
            side=normalized_side,
            entry_price=entry_price,
            atr14=atr14 or 0.0,
            risk_amount=0.0,
            stop_distance=0.0,
            quantity=0.0,
            notional_value=0.0,
            stop_loss=0.0,
            take_profit=0.0,
        )

    if atr14 is None or atr14 <= 0:
        return RiskAssessment(
            approved=False,
            reason="A valid ATR14 value is required for risk calculation.",
            symbol=normalized_symbol,
            side=normalized_side,
            entry_price=entry_price,
            atr14=atr14 or 0.0,
            risk_amount=0.0,
            stop_distance=0.0,
            quantity=0.0,
            notional_value=0.0,
            stop_loss=0.0,
            take_profit=0.0,
        )

    if config.risk_percent <= 0:
        return RiskAssessment(
            approved=False,
            reason="Risk percentage must be greater than zero.",
            symbol=normalized_symbol,
            side=normalized_side,
            entry_price=entry_price,
            atr14=atr14,
            risk_amount=0.0,
            stop_distance=0.0,
            quantity=0.0,
            notional_value=0.0,
            stop_loss=0.0,
            take_profit=0.0,
        )

    if config.stop_loss_atr_multiplier <= 0:
        return RiskAssessment(
            approved=False,
            reason="Stop-loss ATR multiplier must be greater than zero.",
            symbol=normalized_symbol,
            side=normalized_side,
            entry_price=entry_price,
            atr14=atr14,
            risk_amount=0.0,
            stop_distance=0.0,
            quantity=0.0,
            notional_value=0.0,
            stop_loss=0.0,
            take_profit=0.0,
        )

    if config.reward_risk_ratio <= 0:
        return RiskAssessment(
            approved=False,
            reason="Reward/risk ratio must be greater than zero.",
            symbol=normalized_symbol,
            side=normalized_side,
            entry_price=entry_price,
            atr14=atr14,
            risk_amount=0.0,
            stop_distance=0.0,
            quantity=0.0,
            notional_value=0.0,
            stop_loss=0.0,
            take_profit=0.0,
        )

    if config.max_position_exposure_percent <= 0:
        return RiskAssessment(
            approved=False,
            reason=(
                "Maximum position exposure percentage "
                "must be greater than zero."
            ),
            symbol=normalized_symbol,
            side=normalized_side,
            entry_price=entry_price,
            atr14=atr14,
            risk_amount=0.0,
            stop_distance=0.0,
            quantity=0.0,
            notional_value=0.0,
            stop_loss=0.0,
            take_profit=0.0,
        )

    risk_amount = (
        account_balance
        * config.risk_percent
        / 100.0
    )

    stop_distance = (
        atr14
        * config.stop_loss_atr_multiplier
    )

    try:
        risk_based_quantity = _calculate_quantity(
            symbol=normalized_symbol,
            risk_amount=risk_amount,
            stop_distance=stop_distance,
            entry_price=entry_price,
        )

        risk_based_notional = _calculate_account_currency_exposure(
            symbol=normalized_symbol,
            quantity=risk_based_quantity,
            entry_price=entry_price,
        )

    except ValueError as error:
        return RiskAssessment(
            approved=False,
            reason=str(error),
            symbol=normalized_symbol,
            side=normalized_side,
            entry_price=entry_price,
            atr14=atr14,
            risk_amount=round(risk_amount, 8),
            stop_distance=round(stop_distance, 8),
            quantity=0.0,
            notional_value=0.0,
            stop_loss=0.0,
            take_profit=0.0,
        )

    maximum_notional = (
        account_balance
        * config.max_position_exposure_percent
        / 100.0
    )

    if risk_based_notional > maximum_notional:
        if normalized_symbol.endswith("/USD"):
            quantity = maximum_notional / entry_price
        elif normalized_symbol == "USD/JPY":
            quantity = maximum_notional
        else:
            return RiskAssessment(
                approved=False,
                reason=(
                    "Exposure capping is not supported for this "
                    "currency relationship."
                ),
                symbol=normalized_symbol,
                side=normalized_side,
                entry_price=entry_price,
                atr14=atr14,
                risk_amount=round(risk_amount, 8),
                stop_distance=round(stop_distance, 8),
                quantity=0.0,
                notional_value=0.0,
                stop_loss=0.0,
                take_profit=0.0,
            )

        notional_value = _calculate_account_currency_exposure(
            symbol=normalized_symbol,
            quantity=quantity,
            entry_price=entry_price,
        )

        actual_risk_amount = (
            quantity * stop_distance
            if normalized_symbol.endswith("/USD")
            else quantity * stop_distance / entry_price
        )
    else:
        quantity = risk_based_quantity
        notional_value = risk_based_notional
        actual_risk_amount = risk_amount

    if normalized_side == "BUY":
        stop_loss = (
            entry_price - stop_distance
        )

        take_profit = (
            entry_price
            + (
                stop_distance
                * config.reward_risk_ratio
            )
        )

    else:
        stop_loss = (
            entry_price + stop_distance
        )

        take_profit = (
            entry_price
            - (
                stop_distance
                * config.reward_risk_ratio
            )
        )

    if stop_loss <= 0 or take_profit <= 0:
        return RiskAssessment(
            approved=False,
            reason=(
                "Calculated stop-loss or take-profit "
                "would be non-positive."
            ),
            symbol=normalized_symbol,
            side=normalized_side,
            entry_price=entry_price,
            atr14=atr14,
            risk_amount=round(actual_risk_amount, 8),
            stop_distance=round(stop_distance, 8),
            quantity=round(quantity, 8),
            notional_value=round(notional_value, 8),
            stop_loss=round(stop_loss, 8),
            take_profit=round(take_profit, 8),
        )

    return RiskAssessment(
        approved=True,
        reason="Risk parameters passed all configured paper-trading rules.",
        symbol=normalized_symbol,
        side=normalized_side,
        entry_price=entry_price,
        atr14=atr14,
        risk_amount=round(actual_risk_amount, 8),
        stop_distance=round(stop_distance, 8),
        quantity=round(quantity, 8),
        notional_value=round(notional_value, 8),
        stop_loss=round(stop_loss, 8),
        take_profit=round(take_profit, 8),
    )