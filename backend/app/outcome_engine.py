from datetime import datetime, timedelta, timezone
import time

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


INTERVAL_MAP = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
    "30m": "30m",
    "1h": "1h",
    "4h": "4h",
    "1d": "1day",
}


# Short-lived process-local cache.
#
# The outcome evaluator runs every 5 minutes. The 60-second cache
# prevents multiple signals sharing the same symbol/timeframe from
# making duplicate Twelve Data requests during the same evaluation
# run, while still allowing fresh market data on later runs.
MARKET_DATA_CACHE_TTL_SECONDS = 60.0


# {
#     (symbol, normalised_timeframe): (
#         cached_at_monotonic,
#         candles,
#     )
# }
#
# Only successful provider responses are stored.
# Rate-limit/error responses are NOT cached.
_market_data_cache = {}


def get_evaluation_minutes(timeframe: str) -> int:
    return EVALUATION_MINUTES.get(timeframe, 5)


def parse_signal_timestamp(timestamp: str) -> datetime:
    """
    SignalPilot requests Twelve Data intraday timestamps
    explicitly in UTC.

    Twelve Data returns timestamps without an explicit
    timezone suffix, so SignalPilot treats those naive
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

    return parsed.astimezone(
        timezone.utc
    )


def _normalise_interval(timeframe: str) -> str:
    if timeframe in EVALUATION_MINUTES:
        return timeframe

    return "5m"


def _parse_market_values(
    values: list[dict],
) -> list[tuple[datetime, float]]:
    """
    Convert Twelve Data candle values into sorted UTC candle data.

    Returns:
        [(candle_time_utc, close_price), ...]
    """
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

        try:
            close_price = float(
                item["close"]
            )
        except (
            KeyError,
            TypeError,
            ValueError,
        ):
            continue

        candidates.append(
            (
                candle_time,
                close_price,
            )
        )

    candidates.sort(
        key=lambda item: item[0]
    )

    return candidates


async def _fetch_market_data_from_provider(
    symbol: str,
    timeframe: str,
) -> list[tuple[datetime, float]]:
    """
    Make the actual Twelve Data request.

    This function performs one provider request.
    fetch_market_data() below adds the process-local cache.
    """
    interval = _normalise_interval(
        timeframe
    )

    provider_interval = INTERVAL_MAP[
        interval
    ]

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

    # Twelve Data rate-limit handling.
    #
    # Do not retry here. The scheduled evaluator will leave
    # the signal pending and try again on a later run.
    if response.status_code == 429:
        retry_after = response.headers.get(
            "Retry-After"
        )

        if retry_after:
            raise RuntimeError(
                "Twelve Data rate limit reached. "
                f"Retry-After: {retry_after}."
            )

        raise RuntimeError(
            "Twelve Data rate limit reached. "
            "The evaluation will remain pending and "
            "will be retried on a later scheduled run."
        )

    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as error:
        raise RuntimeError(
            "Twelve Data market data request failed "
            f"with HTTP {response.status_code}."
        ) from error

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
            "No market data was returned for "
            "outcome evaluation."
        )

    candidates = _parse_market_values(
        values
    )

    if not candidates:
        raise RuntimeError(
            "No valid market data candles were "
            "returned for outcome evaluation."
        )

    return candidates


async def fetch_market_data(
    symbol: str,
    timeframe: str,
) -> list[tuple[datetime, float]]:
    """
    Fetch Twelve Data candles with a short-lived
    process-local cache.

    Signals sharing the same symbol/timeframe can
    reuse one successful provider response during
    the cache window.

    Provider errors, including HTTP 429 responses,
    are NOT cached. This means a later scheduled
    run can try the provider again normally.
    """
    normalised_timeframe = _normalise_interval(
        timeframe
    )

    cache_key = (
        symbol,
        normalised_timeframe,
    )

    now = time.monotonic()

    cached = _market_data_cache.get(
        cache_key
    )

    if cached is not None:
        cached_at, candles = cached

        if (
            now - cached_at
            < MARKET_DATA_CACHE_TTL_SECONDS
        ):
            return candles

        _market_data_cache.pop(
            cache_key,
            None,
        )

    # Only successful responses reach the cache.
    # RuntimeError exceptions are allowed to propagate
    # immediately so the route can keep the signal PENDING.
    candles = await _fetch_market_data_from_provider(
        symbol=symbol,
        timeframe=normalised_timeframe,
    )

    _market_data_cache[cache_key] = (
        time.monotonic(),
        candles,
    )

    return candles


def get_evaluation_price_from_candles(
    candles: list[tuple[datetime, float]],
    target_time: datetime,
) -> tuple[float, str]:
    """
    Select the first completed candle at or after
    the requested evaluation target.
    """
    target_time = target_time.astimezone(
        timezone.utc
    )

    for candle_time, close_price in candles:
        if candle_time >= target_time:
            return (
                close_price,
                candle_time.isoformat(),
            )

    raise RuntimeError(
        "The evaluation candle is not available yet."
    )


async def get_evaluation_price(
    symbol: str,
    timeframe: str,
    target_time: datetime,
) -> tuple[float, str]:
    """
    Fetch market data through the shared cache and
    select the evaluation candle.
    """
    candles = await fetch_market_data(
        symbol=symbol,
        timeframe=timeframe,
    )

    return get_evaluation_price_from_candles(
        candles=candles,
        target_time=target_time,
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
            price_change / signal_price
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
