from datetime import datetime, timedelta, timezone

import httpx

from .config import settings


EVALUATION_MINUTES = {
    "1m": 1,
    "5m": 5,
    "15m": 15,
    "30m": 30,
    "1h": 60,
    "4h": 240,
    "1d": 1440,
}


def get_evaluation_minutes(timeframe: str) -> int:
    return EVALUATION_MINUTES.get(
        timeframe,
        5,
    )


def parse_signal_timestamp(
    timestamp: str,
) -> datetime:
    """
    SignalPilot requests Twelve Data intraday timestamps
    explicitly in UTC.

    Twelve Data returns the timestamps without an explicit
    timezone suffix, so SignalPilot treats these naive
    timestamps as UTC.
    """

    cleaned = timestamp.strip()

    try:
        parsed = datetime.fromisoformat(
            cleaned.replace("Z", "+00:00")
        )

    except ValueError as error:
        raise ValueError(
            f"Invalid signal timestamp: {timestamp}"
        ) from error

    if parsed.tzinfo is None:
        return parsed.replace(
            tzinfo=timezone.utc
        )

    return parsed.astimezone(timezone.utc)


async def get_evaluation_price(
    symbol: str,
    timeframe: str,
    target_time: datetime,
) -> tuple[float, str]:
    """
    Retrieve recent candles and select the first candle
    at or after the requested evaluation time.
    """

    interval = timeframe

    if interval not in EVALUATION_MINUTES:
        interval = "5m"

    interval_map = {
        "1m": "1min",
        "5m": "5min",
        "15m": "15min",
        "30m": "30min",
        "1h": "1h",
        "4h": "4h",
        "1d": "1day",
    }

    provider_interval = interval_map[interval]

    params = {
        "symbol": symbol,
        "interval": provider_interval,
        "outputsize": 200,
        "timezone": "UTC",
        "apikey": settings.market_data_api_key,
    }

    url = (
        f"{settings.market_data_base_url}"
        "/time_series"
    )

    async with httpx.AsyncClient(
        timeout=20.0
    ) as client:
        response = await client.get(
            url,
            params=params,
        )

    response.raise_for_status()

    data = response.json()

    if data.get("status") == "error":
        raise RuntimeError(
            data.get(
                "message",
                "Market data provider error.",
            )
        )

    values = data.get("values")

    if not values:
        raise RuntimeError(
            "No market data was returned for outcome evaluation."
        )

    candidates = []

    for item in values:
        timestamp_text = item.get("datetime")

        if not timestamp_text:
            continue

        try:
            candle_time = parse_signal_timestamp(
                timestamp_text
            )
        except ValueError:
            continue

        close_price = float(
            item["close"]
        )

        candidates.append(
            (
                candle_time,
                close_price,
            )
        )

    candidates.sort(
        key=lambda item: item[0]
    )

        # Use the first completed candle at or after
    # the evaluation target.
    for candle_time, close_price in candidates:
        if candle_time >= target_time:
            return (
                close_price,
                candle_time.isoformat(),
            )

    raise RuntimeError(
        "The evaluation candle is not available yet."
    )


def calculate_outcome(
    direction: str,
    signal_price: float,
    evaluation_price: float,
) -> dict:
    price_change = (
        evaluation_price - signal_price
    )

    if signal_price == 0:
        price_change_percent = 0.0
    else:
        price_change_percent = (
            price_change
            / signal_price
        ) * 100

    if direction == "UP":
        if price_change > 0:
            outcome = "CORRECT"
        elif price_change < 0:
            outcome = "INCORRECT"
        else:
            outcome = "NEUTRAL"

    elif direction == "DOWN":
        if price_change < 0:
            outcome = "CORRECT"
        elif price_change > 0:
            outcome = "INCORRECT"
        else:
            outcome = "NEUTRAL"

    else:
        if price_change == 0:
            outcome = "CORRECT"
        else:
            outcome = "NEUTRAL"

    return {
        "evaluation_price": evaluation_price,
        "price_change": round(
            price_change,
            8,
        ),
        "price_change_percent": round(
            price_change_percent,
            6,
        ),
        "outcome": outcome,
    }


def calculate_target_time(
    signal_timestamp: str,
    timeframe: str,
) -> tuple[datetime, int]:
    signal_time = parse_signal_timestamp(
        signal_timestamp
    )

    evaluation_minutes = get_evaluation_minutes(
        timeframe
    )

    target_time = (
        signal_time
        + timedelta(
            minutes=evaluation_minutes
        )
    )

    return (
        target_time,
        evaluation_minutes,
    )