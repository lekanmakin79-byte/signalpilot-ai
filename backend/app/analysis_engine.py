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


def analyze_market(
    symbol: str,
    interval: str,
    candles: list[dict],
) -> dict:
    prices = [
        candle["close"]
        for candle in candles
    ]

    current_price = prices[-1]

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

    trend_score, trend_state = (
        calculate_trend_score(prices)
    )

    momentum_score, momentum_state = (
        calculate_momentum_score(
            rsi,
            macd,
        )
    )

    volatility_score, volatility_state = (
        calculate_volatility_score(
            volatility
        )
    )

    confidence_result = calculate_confidence(
        trend_score=trend_score,
        momentum_score=momentum_score,
        volatility_score=volatility_score,
    )

    risk = build_risk_assessment(
        direction=confidence_result["direction"],
        confidence=confidence_result["confidence"],
        volatility=volatility,
        trend_score=trend_score,
        momentum_score=momentum_score,
    )

    return {
        "symbol": symbol,
        "interval": interval,
        "price": current_price,

        "direction": confidence_result[
            "direction"
        ],

        "confidence": confidence_result[
            "confidence"
        ],

        "trend": trend_state,
        "momentum": momentum_state,
        "volatility": volatility_state,

        "scores": {
            "trend": round(
                trend_score,
                3,
            ),
            "momentum": round(
                momentum_score,
                3,
            ),
            "volatility": round(
                volatility_score,
                3,
            ),
            "directional": confidence_result[
                "directional_score"
            ],
        },

        "indicators": {
            "ema20": ema20,
            "ema50": ema50,
            "rsi14": rsi,
            "macd": macd,
            "atr14": atr,
        },

        "risk": risk,

        "data_points": len(candles),
    }