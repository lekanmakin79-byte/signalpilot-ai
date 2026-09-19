from __future__ import annotations

from dataclasses import dataclass
from typing import Any


DEFAULT_MINIMUM_CONFIDENCE = 70.0
DEFAULT_MINIMUM_QUALITY = 70.0

ALLOWED_RISK_LEVELS = {
    "LOWER",
    "MODERATE",
}

ALLOWED_DIRECTIONS = {
    "UP",
    "DOWN",
}


@dataclass(frozen=True)
class TradingDecisionConfig:
    """
    Deterministic rules controlling paper-trade eligibility.

    These rules do not predict profitability. They only determine
    whether an existing SignalPilot signal is eligible for a
    simulated trade.
    """

    minimum_confidence: float = DEFAULT_MINIMUM_CONFIDENCE
    minimum_quality: float = DEFAULT_MINIMUM_QUALITY

    allowed_risk_levels: frozenset[str] = frozenset(
        ALLOWED_RISK_LEVELS
    )

    allow_long: bool = True
    allow_short: bool = True

    maximum_open_positions: int = 3


@dataclass(frozen=True)
class TradingDecision:
    approved: bool
    action: str
    reason: str
    symbol: str
    timeframe: str
    direction: str
    confidence: float
    quality_score: float
    risk_level: str


def _get_quality_score(signal: dict[str, Any]) -> float:
    quality = signal.get("quality")

    if isinstance(quality, dict):
        score = quality.get("quality_score")

        if score is not None:
            return float(score)

        # Backward compatibility for older signal structures.
        score = quality.get("score")

        if score is not None:
            return float(score)

    score = signal.get("quality_score")

    if score is not None:
        return float(score)

    return 0.0


def _get_risk_level(signal: dict[str, Any]) -> str:
    risk = signal.get("risk")

    if isinstance(risk, dict):
        risk_level = risk.get("risk_level")

        if risk_level is not None:
            return str(risk_level).strip().upper()

    # Backward compatibility for a flat signal structure.
    risk_level = signal.get("risk_level")

    if risk_level is not None:
        return str(risk_level).strip().upper()

    return ""


def evaluate_trading_decision(
    signal: dict[str, Any],
    open_position_count: int = 0,
    config: TradingDecisionConfig | None = None,
) -> TradingDecision:
    """
    Evaluate whether a SignalPilot signal is eligible for a
    paper trade.

    This function does not create orders, modify balances,
    contact brokers, or execute trades.
    """

    if config is None:
        config = TradingDecisionConfig()

    symbol = str(
        signal.get("symbol", "")
    ).strip().upper()

    timeframe = str(
        signal.get("timeframe", "")
    ).strip().lower()

    direction = str(
        signal.get("direction", "")
    ).strip().upper()

    confidence = float(
        signal.get("confidence", 0.0)
    )

    quality_score = _get_quality_score(
        signal
    )

    risk_level = _get_risk_level(signal)

    if direction not in ALLOWED_DIRECTIONS:
        return TradingDecision(
            approved=False,
            action="HOLD",
            reason="Signal direction is not tradable.",
            symbol=symbol,
            timeframe=timeframe,
            direction=direction,
            confidence=confidence,
            quality_score=quality_score,
            risk_level=risk_level,
        )

    if confidence < config.minimum_confidence:
        return TradingDecision(
            approved=False,
            action="HOLD",
            reason=(
                "Signal confidence is below the configured "
                "minimum."
            ),
            symbol=symbol,
            timeframe=timeframe,
            direction=direction,
            confidence=confidence,
            quality_score=quality_score,
            risk_level=risk_level,
        )

    if quality_score < config.minimum_quality:
        return TradingDecision(
            approved=False,
            action="HOLD",
            reason=(
                "Signal quality is below the configured "
                "minimum."
            ),
            symbol=symbol,
            timeframe=timeframe,
            direction=direction,
            confidence=confidence,
            quality_score=quality_score,
            risk_level=risk_level,
        )

    if risk_level not in config.allowed_risk_levels:
        return TradingDecision(
            approved=False,
            action="HOLD",
            reason=(
                "Signal risk level is not permitted by the "
                "trading configuration."
            ),
            symbol=symbol,
            timeframe=timeframe,
            direction=direction,
            confidence=confidence,
            quality_score=quality_score,
            risk_level=risk_level,
        )

    if direction == "UP" and not config.allow_long:
        return TradingDecision(
            approved=False,
            action="HOLD",
            reason="Long trades are disabled.",
            symbol=symbol,
            timeframe=timeframe,
            direction=direction,
            confidence=confidence,
            quality_score=quality_score,
            risk_level=risk_level,
        )

    if direction == "DOWN" and not config.allow_short:
        return TradingDecision(
            approved=False,
            action="HOLD",
            reason="Short trades are disabled.",
            symbol=symbol,
            timeframe=timeframe,
            direction=direction,
            confidence=confidence,
            quality_score=quality_score,
            risk_level=risk_level,
        )

    if open_position_count >= config.maximum_open_positions:
        return TradingDecision(
            approved=False,
            action="HOLD",
            reason=(
                "Maximum number of open paper positions has "
                "been reached."
            ),
            symbol=symbol,
            timeframe=timeframe,
            direction=direction,
            confidence=confidence,
            quality_score=quality_score,
            risk_level=risk_level,
        )

    action = (
        "BUY"
        if direction == "UP"
        else "SELL"
    )

    return TradingDecision(
        approved=True,
        action=action,
        reason="Signal passed all configured paper-trading rules.",
        symbol=symbol,
        timeframe=timeframe,
        direction=direction,
        confidence=confidence,
        quality_score=quality_score,
        risk_level=risk_level,
    )