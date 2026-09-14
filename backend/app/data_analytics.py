from __future__ import annotations

from math import sqrt
from statistics import mean, median, pstdev


def _close_prices(candles: list[dict]) -> list[float]:
    prices = []

    for candle in candles:
        try:
            price = float(candle["close"])
        except (KeyError, TypeError, ValueError) as error:
            raise ValueError(
                "Market data contains an invalid closing price."
            ) from error

        if price <= 0:
            raise ValueError(
                "Market data contains a non-positive closing price."
            )

        prices.append(price)

    if not prices:
        raise ValueError(
            "No market candle data is available for analytics."
        )

    return prices


def _returns(prices: list[float]) -> list[float]:
    if len(prices) < 2:
        return []

    return [
        ((prices[index] - prices[index - 1]) / prices[index - 1]) * 100
        for index in range(1, len(prices))
    ]


def _trend_change(prices: list[float]) -> float:
    if len(prices) < 2:
        return 0.0

    return (
        (prices[-1] - prices[0])
        / prices[0]
    ) * 100


def _maximum_drawdown(prices: list[float]) -> float:
    peak = prices[0]
    maximum_drawdown = 0.0

    for price in prices:
        if price > peak:
            peak = price

        if peak > 0:
            drawdown = ((price - peak) / peak) * 100

            if drawdown < maximum_drawdown:
                maximum_drawdown = drawdown

    return maximum_drawdown


def _positive_negative_counts(
    returns: list[float],
) -> tuple[int, int, int]:
    positive = sum(1 for value in returns if value > 0)
    negative = sum(1 for value in returns if value < 0)
    flat = sum(1 for value in returns if value == 0)

    return positive, negative, flat


def build_descriptive_analytics(
    symbol: str,
    interval: str,
    candles: list[dict],
) -> dict:
    prices = _close_prices(candles)
    returns = _returns(prices)

    positive, negative, flat = _positive_negative_counts(
        returns
    )

    average_return = (
        mean(returns)
        if returns
        else 0.0
    )

    median_return = (
        median(returns)
        if returns
        else 0.0
    )

    volatility = (
        pstdev(returns)
        if len(returns) > 1
        else 0.0
    )

    return {
        "type": "descriptive",
        "symbol": symbol,
        "interval": interval,
        "data_points": len(prices),
        "current_price": round(prices[-1], 8),
        "starting_price": round(prices[0], 8),
        "high": round(max(prices), 8),
        "low": round(min(prices), 8),
        "price_change_percent": round(
            _trend_change(prices),
            4,
        ),
        "average_return_percent": round(
            average_return,
            6,
        ),
        "median_return_percent": round(
            median_return,
            6,
        ),
        "return_volatility_percent": round(
            volatility,
            6,
        ),
        "positive_periods": positive,
        "negative_periods": negative,
        "flat_periods": flat,
    }


def build_diagnostic_analytics(
    symbol: str,
    interval: str,
    candles: list[dict],
) -> dict:
    prices = _close_prices(candles)
    returns = _returns(prices)

    if not returns:
        return {
            "type": "diagnostic",
            "symbol": symbol,
            "interval": interval,
            "available": False,
            "reason": "At least two price observations are required.",
        }

    positive, negative, flat = _positive_negative_counts(
        returns
    )

    if positive > negative:
        dominant_direction = "UP"
    elif negative > positive:
        dominant_direction = "DOWN"
    else:
        dominant_direction = "FLAT"

    first_half = returns[: len(returns) // 2]
    second_half = returns[len(returns) // 2 :]

    first_half_average = (
        mean(first_half)
        if first_half
        else 0.0
    )

    second_half_average = (
        mean(second_half)
        if second_half
        else 0.0
    )

    return {
        "type": "diagnostic",
        "symbol": symbol,
        "interval": interval,
        "available": True,
        "dominant_direction": dominant_direction,
        "positive_period_ratio": round(
            positive / len(returns),
            4,
        ),
        "negative_period_ratio": round(
            negative / len(returns),
            4,
        ),
        "average_return_first_half_percent": round(
            first_half_average,
            6,
        ),
        "average_return_second_half_percent": round(
            second_half_average,
            6,
        ),
        "return_regime_change_percent": round(
            second_half_average - first_half_average,
            6,
        ),
        "maximum_drawdown_percent": round(
            _maximum_drawdown(prices),
            4,
        ),
    }


def build_predictive_analytics(
    symbol: str,
    interval: str,
    candles: list[dict],
) -> dict:
    prices = _close_prices(candles)
    returns = _returns(prices)

    if len(returns) < 5:
        return {
            "type": "predictive",
            "symbol": symbol,
            "interval": interval,
            "available": False,
            "reason": (
                "At least six price observations are required "
                "for predictive analytics."
            ),
        }

    recent_window_size = min(
        10,
        len(returns),
    )

    recent_returns = returns[
        -recent_window_size:
    ]

    recent_average_return = mean(
        recent_returns
    )

    recent_volatility = (
        pstdev(recent_returns)
        if len(recent_returns) > 1
        else 0.0
    )

    estimated_next_change = recent_average_return

    if estimated_next_change > 0:
        directional_assessment = "UP"
    elif estimated_next_change < 0:
        directional_assessment = "DOWN"
    else:
        directional_assessment = "NEUTRAL"

    return {
        "type": "predictive",
        "symbol": symbol,
        "interval": interval,
        "available": True,
        "method": "Recent-return analytical baseline",
        "lookback_periods": recent_window_size,
        "recent_average_return_percent": round(
            recent_average_return,
            6,
        ),
        "recent_return_volatility_percent": round(
            recent_volatility,
            6,
        ),
        "estimated_next_period_change_percent": round(
            estimated_next_change,
            6,
        ),
        "directional_assessment": directional_assessment,
        "confidence": "baseline",
        "disclaimer": (
            "This is a statistical analytical assessment, "
            "not a guaranteed prediction of future market movement."
        ),
    }


def build_prescriptive_analytics(
    symbol: str,
    interval: str,
    candles: list[dict],
) -> dict:
    prices = _close_prices(candles)
    returns = _returns(prices)

    if not returns:
        return {
            "type": "prescriptive",
            "symbol": symbol,
            "interval": interval,
            "available": False,
            "reason": "Insufficient data.",
        }

    recent_window_size = min(
        10,
        len(returns),
    )

    recent_returns = returns[
        -recent_window_size:
    ]

    average_return = mean(
        recent_returns
    )

    volatility = (
        pstdev(recent_returns)
        if len(recent_returns) > 1
        else 0.0
    )

    if volatility > 0.5:
        environment = "HIGH_VARIABILITY"
        recommendation = (
            "Monitor volatility closely and review the "
            "underlying evidence before making decisions."
        )
    elif volatility > 0.15:
        environment = "MODERATE_VARIABILITY"
        recommendation = (
            "Compare the current trend, momentum and "
            "market evidence before taking further action."
        )
    else:
        environment = "LOW_VARIABILITY"
        recommendation = (
            "Continue monitoring the current market structure "
            "and validate the evidence with additional data."
        )

    return {
        "type": "prescriptive",
        "symbol": symbol,
        "interval": interval,
        "available": True,
        "recent_average_return_percent": round(
            average_return,
            6,
        ),
        "recent_volatility_percent": round(
            volatility,
            6,
        ),
        "environment": environment,
        "analytical_recommendation": recommendation,
        "disclaimer": (
            "Prescriptive analytics provide evidence-based "
            "analytical considerations and are not financial advice."
        ),
    }


def build_data_analytics(
    symbol: str,
    interval: str,
    candles: list[dict],
) -> dict:
    return {
        "symbol": symbol,
        "interval": interval,
        "descriptive": build_descriptive_analytics(
            symbol=symbol,
            interval=interval,
            candles=candles,
        ),
        "diagnostic": build_diagnostic_analytics(
            symbol=symbol,
            interval=interval,
            candles=candles,
        ),
        "predictive": build_predictive_analytics(
            symbol=symbol,
            interval=interval,
            candles=candles,
        ),
        "prescriptive": build_prescriptive_analytics(
            symbol=symbol,
            interval=interval,
            candles=candles,
        ),
    }