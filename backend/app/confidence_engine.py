from .indicators import calculate_ema


def calculate_trend_score(
    prices: list[float],
) -> tuple[float, str]:
    if len(prices) < 50:
        return 0.0, "INSUFFICIENT_DATA"

    price = prices[-1]

    ema20 = calculate_ema(prices, 20)
    ema50 = calculate_ema(prices, 50)

    if ema20 is None or ema50 is None:
        return 0.0, "INSUFFICIENT_DATA"

    if price > ema20 > ema50:
        return 1.0, "STRONG_BULLISH"

    if price > ema20 and ema20 < ema50:
        return 0.25, "WEAK_BULLISH"

    if price < ema20 < ema50:
        return -1.0, "STRONG_BEARISH"

    if price < ema20 and ema20 > ema50:
        return -0.25, "WEAK_BEARISH"

    return 0.0, "NEUTRAL"


def calculate_momentum_score(
    rsi: float | None,
    macd: dict,
) -> tuple[float, str]:
    score = 0.0

    if rsi is not None:
        if rsi >= 55:
            score += 0.5
        elif rsi <= 45:
            score -= 0.5

    histogram = macd.get("histogram")

    if histogram is not None:
        if histogram > 0:
            score += 0.5
        elif histogram < 0:
            score -= 0.5

    if score >= 0.75:
        return 1.0, "STRONG_POSITIVE"

    if score >= 0.25:
        return 0.5, "POSITIVE"

    if score <= -0.75:
        return -1.0, "STRONG_NEGATIVE"

    if score <= -0.25:
        return -0.5, "NEGATIVE"

    return 0.0, "NEUTRAL"


def calculate_volatility_score(
    volatility: str,
) -> tuple[float, str]:
    if volatility == "LOW":
        return 1.0, "LOW"

    if volatility == "MEDIUM":
        return 0.75, "MEDIUM"

    if volatility == "HIGH":
        return 0.35, "HIGH"

    return 0.0, "UNKNOWN"


def calculate_confidence(
    trend_score: float,
    momentum_score: float,
    volatility_score: float,
) -> dict:
    directional_score = (
        (trend_score * 0.50)
        + (momentum_score * 0.35)
    )

    direction = "NEUTRAL"

    if directional_score >= 0.20:
        direction = "UP"

    elif directional_score <= -0.20:
        direction = "DOWN"

    strength = abs(directional_score)

    raw_confidence = (
        50
        + (strength * 45)
        + (volatility_score * 5)
    )

    confidence = max(
        50.0,
        min(95.0, raw_confidence),
    )

    if direction == "NEUTRAL":
        confidence = min(
            confidence,
            60.0,
        )

    return {
        "direction": direction,
        "confidence": round(
            confidence,
            1,
        ),
        "directional_score": round(
            directional_score,
            3,
        ),
    }


def build_risk_assessment(
    direction: str,
    confidence: float,
    volatility: str,
    trend_score: float,
    momentum_score: float,
) -> dict:
    factors = []

    if volatility == "HIGH":
        factors.append(
            "High volatility increases uncertainty."
        )

    if abs(trend_score - momentum_score) > 0.75:
        factors.append(
            "Trend and momentum are not strongly aligned."
        )

    if confidence < 65:
        factors.append(
            "Directional confidence is relatively low."
        )

    if not factors:
        factors.append(
            "No major analytical conflict detected."
        )

    if confidence >= 80 and volatility != "HIGH":
        risk_level = "LOWER"

    elif confidence >= 65:
        risk_level = "MODERATE"

    else:
        risk_level = "ELEVATED"

    return {
        "risk_level": risk_level,
        "factors": factors,
    }