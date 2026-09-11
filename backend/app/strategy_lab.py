from dataclasses import dataclass
from math import isfinite

from .signal_engine import generate_signal


MINIMUM_CANDLES = 52
SIGNAL_WARMUP_CANDLES = 50


@dataclass
class BacktestResult:
    timestamp: str
    symbol: str
    timeframe: str
    signal_price: float
    evaluation_price: float
    direction: str
    confidence: float
    price_change_percent: float
    outcome: str
    hypothetical_directional_change_percent: float


def validate_candles(candles: list[dict]) -> None:
    if not candles:
        raise ValueError(
            "No candle data is available for the backtest."
        )

    if len(candles) < MINIMUM_CANDLES:
        raise ValueError(
            f"At least {MINIMUM_CANDLES} candles are required for a backtest."
        )

    required_fields = (
        "datetime",
        "open",
        "high",
        "low",
        "close",
    )

    for index, candle in enumerate(candles):
        if not isinstance(candle, dict):
            raise ValueError(
                f"Invalid candle at index {index}: expected an object."
            )

        missing_fields = [
            field
            for field in required_fields
            if field not in candle
        ]

        if missing_fields:
            fields = ", ".join(missing_fields)

            raise ValueError(
                f"Invalid candle at index {index}: missing {fields}."
            )

        for field in ("open", "high", "low", "close"):
            try:
                value = float(candle[field])
            except (TypeError, ValueError):
                raise ValueError(
                    f"Invalid candle at index {index}: "
                    f"{field} must be numeric."
                )

            if not isfinite(value):
                raise ValueError(
                    f"Invalid candle at index {index}: "
                    f"{field} must be finite."
                )

        if float(candle["close"]) <= 0:
            raise ValueError(
                f"Invalid candle at index {index}: close price must be greater than zero."
            )


def calculate_outcome(
    direction: str,
    signal_price: float,
    evaluation_price: float,
) -> tuple[str, float, float]:
    if signal_price <= 0 or evaluation_price <= 0:
        return "NEUTRAL", 0.0, 0.0

    price_change_percent = (
        (evaluation_price - signal_price)
        / signal_price
    ) * 100

    if direction == "UP":
        if evaluation_price > signal_price:
            outcome = "CORRECT"
        elif evaluation_price < signal_price:
            outcome = "INCORRECT"
        else:
            outcome = "NEUTRAL"

        hypothetical_change = price_change_percent

    elif direction == "DOWN":
        if evaluation_price < signal_price:
            outcome = "CORRECT"
        elif evaluation_price > signal_price:
            outcome = "INCORRECT"
        else:
            outcome = "NEUTRAL"

        hypothetical_change = -price_change_percent

    else:
        outcome = "NEUTRAL"
        hypothetical_change = 0.0

    return (
        outcome,
        round(price_change_percent, 6),
        round(hypothetical_change, 6),
    )


def calculate_max_drawdown(
    changes: list[float],
) -> float:
    if not changes:
        return 0.0

    equity = 1.0
    peak = 1.0
    max_drawdown = 0.0

    for change in changes:
        equity *= 1 + (change / 100)

        if equity > peak:
            peak = equity

        if peak > 0:
            drawdown = (
                (equity - peak)
                / peak
            ) * 100

            if drawdown < max_drawdown:
                max_drawdown = drawdown

    return round(abs(max_drawdown), 6)


def calculate_compounded_return(
    changes: list[float],
) -> float:
    if not changes:
        return 0.0

    equity = 1.0

    for change in changes:
        equity *= 1 + (change / 100)

    return round(
        (equity - 1) * 100,
        6,
    )


def run_backtest(
    symbol: str,
    timeframe: str,
    candles: list[dict],
    minimum_confidence: float = 0.0,
) -> dict:
    validate_candles(candles)

    if not 0 <= minimum_confidence <= 95:
        raise ValueError(
            "minimum_confidence must be between 0 and 95."
        )

    possible_evaluations = max(
        0,
        len(candles) - SIGNAL_WARMUP_CANDLES - 1,
    )

    results: list[BacktestResult] = []

    signals_generated = 0
    signals_filtered = 0

    for index in range(
        SIGNAL_WARMUP_CANDLES,
        len(candles) - 1,
    ):
        historical_candles = candles[: index + 1]
        evaluation_candle = candles[index + 1]

        signal = generate_signal(
            symbol=symbol,
            candles=historical_candles,
            timeframe=timeframe,
        )

        signals_generated += 1

        confidence = float(
            signal.get("confidence", 0.0)
        )

        if confidence < minimum_confidence:
            signals_filtered += 1
            continue

        signal_price = float(
            signal["price"]
        )

        evaluation_price = float(
            evaluation_candle["close"]
        )

        direction = str(
            signal.get("direction", "NEUTRAL")
        ).upper()

        outcome, price_change_percent, hypothetical_change = (
            calculate_outcome(
                direction=direction,
                signal_price=signal_price,
                evaluation_price=evaluation_price,
            )
        )

        results.append(
            BacktestResult(
                timestamp=str(
                    signal["signal_timestamp"]
                ),
                symbol=symbol,
                timeframe=timeframe,
                signal_price=signal_price,
                evaluation_price=evaluation_price,
                direction=direction,
                confidence=confidence,
                price_change_percent=price_change_percent,
                outcome=outcome,
                hypothetical_directional_change_percent=(
                    hypothetical_change
                ),
            )
        )

    total = len(results)

    correct = sum(
        1
        for result in results
        if result.outcome == "CORRECT"
    )

    incorrect = sum(
        1
        for result in results
        if result.outcome == "INCORRECT"
    )

    neutral = sum(
        1
        for result in results
        if result.outcome == "NEUTRAL"
    )

    up_signals = sum(
        1
        for result in results
        if result.direction == "UP"
    )

    down_signals = sum(
        1
        for result in results
        if result.direction == "DOWN"
    )

    neutral_signals = sum(
        1
        for result in results
        if result.direction == "NEUTRAL"
    )

    directional_total = correct + incorrect

    if directional_total > 0:
        hit_rate = (
            correct / directional_total
        ) * 100
    else:
        hit_rate = 0.0

    if total > 0:
        average_confidence = (
            sum(
                result.confidence
                for result in results
            )
            / total
        )

        average_price_change_percent = (
            sum(
                result.price_change_percent
                for result in results
            )
            / total
        )
    else:
        average_confidence = 0.0
        average_price_change_percent = 0.0

    hypothetical_changes = [
        result.hypothetical_directional_change_percent
        for result in results
    ]

    cumulative_directional_change = sum(
        hypothetical_changes
    )

    compounded_directional_return = (
        calculate_compounded_return(
            hypothetical_changes
        )
    )

    max_drawdown = calculate_max_drawdown(
        hypothetical_changes
    )

    if hypothetical_changes:
        best_trade = max(
            hypothetical_changes
        )

        worst_trade = min(
            hypothetical_changes
        )
    else:
        best_trade = 0.0
        worst_trade = 0.0

    return {
        "success": True,
        "backtest": {
            "symbol": symbol,
            "timeframe": timeframe,
            "candles_used": len(candles),
            "warmup_candles": SIGNAL_WARMUP_CANDLES,
            "possible_evaluations": possible_evaluations,
            "signals_generated": signals_generated,
            "signals_filtered": signals_filtered,
            "signals_evaluated": total,
            "minimum_confidence": minimum_confidence,
            "up_signals": up_signals,
            "down_signals": down_signals,
            "neutral_signals": neutral_signals,
            "correct": correct,
            "incorrect": incorrect,
            "neutral": neutral,
            "hit_rate": round(hit_rate, 2),
            "average_confidence": round(
                average_confidence,
                2,
            ),
            "average_price_change_percent": round(
                average_price_change_percent,
                6,
            ),
            "cumulative_directional_change_percent": round(
                cumulative_directional_change,
                6,
            ),
            "compounded_directional_return_percent": (
                compounded_directional_return
            ),
            "best_trade_percent": round(
                best_trade,
                6,
            ),
            "worst_trade_percent": round(
                worst_trade,
                6,
            ),
            "maximum_drawdown_percent": round(
                max_drawdown,
                6,
            ),
        },
        "results": [
            {
                "timestamp": result.timestamp,
                "symbol": result.symbol,
                "timeframe": result.timeframe,
                "signal_price": result.signal_price,
                "evaluation_price": result.evaluation_price,
                "direction": result.direction,
                "confidence": result.confidence,
                "price_change_percent": (
                    result.price_change_percent
                ),
                "outcome": result.outcome,
                "hypothetical_directional_change_percent": (
                    result.hypothetical_directional_change_percent
                ),
            }
            for result in results
        ],
    }
