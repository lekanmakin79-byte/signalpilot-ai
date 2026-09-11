from math import sqrt


def calculate_ema(
    prices: list[float],
    period: int,
) -> float | None:
    if len(prices) < period:
        return None

    multiplier = 2 / (period + 1)

    ema = sum(prices[:period]) / period

    for price in prices[period:]:
        ema = (
            (price - ema) * multiplier
        ) + ema

    return round(ema, 6)


def calculate_rsi(
    prices: list[float],
    period: int = 14,
) -> float | None:
    if len(prices) < period + 1:
        return None

    gains = []
    losses = []

    for i in range(1, len(prices)):
        change = prices[i] - prices[i - 1]

        if change > 0:
            gains.append(change)
            losses.append(0)
        else:
            gains.append(0)
            losses.append(abs(change))

    recent_gains = gains[-period:]
    recent_losses = losses[-period:]

    average_gain = sum(recent_gains) / period
    average_loss = sum(recent_losses) / period

    if average_loss == 0:
        return 100.0

    rs = average_gain / average_loss

    return round(
        100 - (100 / (1 + rs)),
        2,
    )


def calculate_macd(
    prices: list[float],
    fast_period: int = 12,
    slow_period: int = 26,
    signal_period: int = 9,
) -> dict:
    if len(prices) < slow_period + signal_period:
        return {
            "macd": None,
            "signal": None,
            "histogram": None,
        }

    fast_multiplier = 2 / (fast_period + 1)
    slow_multiplier = 2 / (slow_period + 1)

    fast_ema = sum(prices[:fast_period]) / fast_period
    slow_ema = sum(prices[:slow_period]) / slow_period

    fast_values = [fast_ema]
    slow_values = [slow_ema]

    for price in prices[fast_period:]:
        fast_ema = (
            (price - fast_ema) * fast_multiplier
        ) + fast_ema

        fast_values.append(fast_ema)

    for price in prices[slow_period:]:
        slow_ema = (
            (price - slow_ema) * slow_multiplier
        ) + slow_ema

        slow_values.append(slow_ema)

    macd_values = []

    start_index = slow_period - fast_period

    for i in range(len(slow_values)):
        fast_index = i + start_index

        if fast_index < len(fast_values):
            macd_values.append(
                fast_values[fast_index] - slow_values[i]
            )

    if len(macd_values) < signal_period:
        return {
            "macd": None,
            "signal": None,
            "histogram": None,
        }

    signal_multiplier = 2 / (signal_period + 1)

    signal_ema = (
        sum(macd_values[:signal_period])
        / signal_period
    )

    for macd_value in macd_values[signal_period:]:
        signal_ema = (
            (macd_value - signal_ema)
            * signal_multiplier
        ) + signal_ema

    current_macd = macd_values[-1]
    histogram = current_macd - signal_ema

    return {
        "macd": round(current_macd, 8),
        "signal": round(signal_ema, 8),
        "histogram": round(histogram, 8),
    }


def calculate_atr(
    candles: list[dict],
    period: int = 14,
) -> float | None:
    if len(candles) < period + 1:
        return None

    true_ranges = []

    for i in range(1, len(candles)):
        current = candles[i]
        previous = candles[i - 1]

        high = current["high"]
        low = current["low"]
        previous_close = previous["close"]

        true_range = max(
            high - low,
            abs(high - previous_close),
            abs(low - previous_close),
        )

        true_ranges.append(true_range)

    recent = true_ranges[-period:]

    return round(
        sum(recent) / period,
        6,
    )


def calculate_volatility(
    prices: list[float],
) -> str:
    if len(prices) < 2:
        return "UNKNOWN"

    returns = []

    for i in range(1, len(prices)):
        previous = prices[i - 1]

        if previous == 0:
            continue

        returns.append(
            (prices[i] - previous) / previous
        )

    if not returns:
        return "UNKNOWN"

    mean = sum(returns) / len(returns)

    variance = sum(
        (value - mean) ** 2
        for value in returns
    ) / len(returns)

    standard_deviation = sqrt(variance)

    if standard_deviation < 0.001:
        return "LOW"

    if standard_deviation < 0.003:
        return "MEDIUM"

    return "HIGH"


def determine_trend(
    prices: list[float],
) -> str:
    if len(prices) < 2:
        return "UNKNOWN"

    ema20 = calculate_ema(prices, 20)

    if ema20 is None:
        if prices[-1] > prices[0]:
            return "BULLISH"

        if prices[-1] < prices[0]:
            return "BEARISH"

        return "NEUTRAL"

    current_price = prices[-1]

    if current_price > ema20:
        return "BULLISH"

    if current_price < ema20:
        return "BEARISH"

    return "NEUTRAL"


def determine_momentum(
    prices: list[float],
) -> str:
    if len(prices) < 2:
        return "UNKNOWN"

    difference = prices[-1] - prices[-2]

    if difference > 0:
        return "POSITIVE"

    if difference < 0:
        return "NEGATIVE"

    return "NEUTRAL"