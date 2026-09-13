from .confidence_engine import (
    build_risk_assessment,
    calculate_confidence,
    calculate_momentum_score,
    calculate_trend_score,
    calculate_volatility_score,
)
from .indicators import (
    calculate_atr,
    calculate_ema,
    calculate_macd,
    calculate_rsi,
    calculate_volatility,
)
from .signal_quality import calculate_quality_score


MINIMUM_CANDLES = 50


def generate_signal(
    symbol: str,
    candles: list[dict],
    timeframe: str = "5m",
) -> dict:
    if not candles:
        raise ValueError(
            "No market candles were returned."
        )

    if len(candles) < MINIMUM_CANDLES:
        raise ValueError(
            f"At least {MINIMUM_CANDLES} candles are required "
            "to generate a signal."
        )

    prices: list[float] = []

    for candle in candles:
        try:
            close_price = float(candle["close"])
        except (KeyError, TypeError, ValueError):
            raise ValueError(
                "Market data contains an invalid closing price."
            )

        if close_price <= 0:
            raise ValueError(
                "Market data contains a non-positive closing price."
            )

        prices.append(close_price)

    current_price = prices[-1]

    signal_timestamp = candles[-1].get("datetime")

    if not signal_timestamp:
        raise ValueError(
            "Market data is missing the latest candle timestamp."
        )

    ema20 = calculate_ema(
        prices,
        20,
    )

    ema50 = calculate_ema(
        prices,
        50,
    )

    rsi = calculate_rsi(
        prices,
        14,
    )

    macd = calculate_macd(
        prices,
    )

    atr = calculate_atr(
        candles,
        14,
    )

    volatility = calculate_volatility(
        prices,
    )

    trend_score, trend_state = calculate_trend_score(
        prices
    )

    momentum_score, momentum_state = calculate_momentum_score(
        rsi,
        macd,
    )

    volatility_score, volatility_state = calculate_volatility_score(
        volatility
    )

    confidence_result = calculate_confidence(
        trend_score=trend_score,
        momentum_score=momentum_score,
        volatility_score=volatility_score,
    )

    direction = confidence_result["direction"]

    risk = build_risk_assessment(
        direction=direction,
        confidence=confidence_result["confidence"],
        volatility=volatility,
        trend_score=trend_score,
        momentum_score=momentum_score,
    )

    quality = calculate_quality_score(
        confidence=confidence_result["confidence"],
        directional_score=confidence_result["directional_score"],
        trend_score=trend_score,
        momentum_score=momentum_score,
        volatility_score=volatility_score,
        risk_level=risk["risk_level"],
    )

    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "price": current_price,
        "signal_timestamp": signal_timestamp,
        "direction": direction,
        "confidence": confidence_result["confidence"],
        "trend": trend_state,
        "momentum": momentum_state,
        "volatility": volatility_state,
        "scores": {
            "trend": round(trend_score, 3),
            "momentum": round(momentum_score, 3),
            "volatility": round(volatility_score, 3),
            "directional": round(
                confidence_result["directional_score"],
                3,
            ),
        },
        "indicators": {
            "ema20": ema20,
            "ema50": ema50,
            "rsi14": rsi,
            "macd": macd,
            "atr14": atr,
        },
        "risk": risk,
        "quality": quality,
        "data_points": len(candles),
        "explanation": build_signal_explanation(
            direction=direction,
            trend_state=trend_state,
            momentum_state=momentum_state,
            volatility_state=volatility_state,
        ),
    }


def build_signal_explanation(
    direction: str,
    trend_state: str,
    momentum_state: str,
    volatility_state: str,
) -> str:
    trend_description = (
        trend_state.lower().replace("_", " ")
    )

    momentum_description = (
        momentum_state.lower().replace("_", " ")
    )

    volatility_description = (
        volatility_state.lower().replace("_", " ")
    )

    if direction == "UP":
        return (
            "Current quantitative conditions show a bullish bias, "
            f"with {trend_description} trend structure "
            f"and {momentum_description} momentum."
        )

    if direction == "DOWN":
        return (
        "Current quantitative conditions show a bearish bias, "
            f"with {trend_description} trend structure "
            f"and {momentum_description} momentum."
        )

    return (
        "Current quantitative conditions do not show a sufficiently "
        "strong directional bias. Trend and momentum should be monitored "
        f"alongside the current {volatility_description} volatility environment."
    )
