from datetime import datetime, timezone
import time

import httpx

from .config import settings


SUPPORTED_MARKETS = {
    "EUR/USD": {
        "symbol": "EUR/USD",
        "twelve_data_symbol": "EUR/USD",
    },
    "GBP/USD": {
        "symbol": "GBP/USD",
        "twelve_data_symbol": "GBP/USD",
    },
    "USD/JPY": {
        "symbol": "USD/JPY",
        "twelve_data_symbol": "USD/JPY",
    },
    "XAU/USD": {
        "symbol": "XAU/USD",
        "twelve_data_symbol": "XAU/USD",
    },
}


INTERVAL_MAP = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
    "30m": "30min",
    "1h": "1h",
    "4h": "4h",
    "1d": "1day",
}


# ---------------------------------------------------------------------------
# Simple in-memory cache
# ---------------------------------------------------------------------------
#
# This prevents the dashboard and other endpoints from repeatedly requesting
# the same candle data from Twelve Data within a short period.
#
# The cache lives only while the FastAPI process is running.
# It does not change the database or application behaviour.
#

_CANDLE_CACHE = {}

# Candle data is considered fresh for 30 seconds.
CANDLE_CACHE_TTL_SECONDS = 30

# Market quotes use a shorter cache because they are displayed as live-ish
# dashboard information.
_QUOTE_CACHE = {}

QUOTE_CACHE_TTL_SECONDS = 15


def validate_market(symbol: str):
    if symbol not in SUPPORTED_MARKETS:
        raise ValueError(f"Unsupported market: {symbol}")


def validate_interval(interval: str):
    if interval not in INTERVAL_MAP:
        raise ValueError(f"Unsupported interval: {interval}")


def _cache_key(
    symbol: str,
    interval: str,
    outputsize: int,
):
    return (
        symbol,
        interval,
        outputsize,
    )


def _get_cached_candles(
    symbol: str,
    interval: str,
    outputsize: int,
):
    key = _cache_key(
        symbol,
        interval,
        outputsize,
    )

    cached = _CANDLE_CACHE.get(key)

    if not cached:
        return None

    cached_at, candles = cached

    age = time.monotonic() - cached_at

    if age > CANDLE_CACHE_TTL_SECONDS:
        _CANDLE_CACHE.pop(key, None)
        return None

    return candles


def _store_cached_candles(
    symbol: str,
    interval: str,
    outputsize: int,
    candles: list,
):
    key = _cache_key(
        symbol,
        interval,
        outputsize,
    )

    _CANDLE_CACHE[key] = (
        time.monotonic(),
        candles,
    )


async def get_candles(
    symbol: str,
    interval: str = "5m",
    outputsize: int = 100,
):
    validate_market(symbol)
    validate_interval(interval)

    if not settings.market_data_api_key:
        raise RuntimeError(
            "MARKET_DATA_API_KEY is not configured."
        )

    # ---------------------------------------------------------------
    # Check cache before calling Twelve Data.
    # ---------------------------------------------------------------
    cached_candles = _get_cached_candles(
        symbol=symbol,
        interval=interval,
        outputsize=outputsize,
    )

    if cached_candles is not None:
        return cached_candles

    provider_symbol = SUPPORTED_MARKETS[symbol][
        "twelve_data_symbol"
    ]

    params = {
        "symbol": provider_symbol,
        "interval": INTERVAL_MAP[interval],
        "outputsize": outputsize,
        "timezone": "UTC",
        "apikey": settings.market_data_api_key,
    }

    url = f"{settings.market_data_base_url}/time_series"

    async with httpx.AsyncClient(
        timeout=20.0
    ) as client:
        try:
            response = await client.get(
                url,
                params=params,
            )

        except httpx.RequestError as error:
            raise RuntimeError(
                f"Unable to reach market-data provider: {error}"
            ) from error

    # ---------------------------------------------------------------
    # Handle Twelve Data rate limiting explicitly.
    # ---------------------------------------------------------------
    if response.status_code == 429:
        raise RuntimeError(
            "Market-data provider rate limit reached. "
            "Please wait a short while and try again."
        )

    # Handle other HTTP errors cleanly.
    if response.status_code != 200:
        raise RuntimeError(
            f"Market-data provider returned HTTP "
            f"{response.status_code}: {response.text}"
        )

    data = response.json()

    # Twelve Data can return an HTTP 200 response containing an
    # application-level error.
    if data.get("status") == "error":
        message = data.get(
            "message",
            "Market data provider error.",
        )

        raise RuntimeError(message)

    values = data.get("values")

    if not values:
        raise RuntimeError(
            "No candle data was returned by the market-data provider."
        )

    candles = []

    for item in reversed(values):
        candles.append(
            {
                "datetime": item["datetime"],
                "open": float(item["open"]),
                "high": float(item["high"]),
                "low": float(item["low"]),
                "close": float(item["close"]),
            }
        )

    # Store the successful response in cache.
    _store_cached_candles(
        symbol=symbol,
        interval=interval,
        outputsize=outputsize,
        candles=candles,
    )

    return candles


def _get_cached_quote(symbol: str):
    cached = _QUOTE_CACHE.get(symbol)

    if not cached:
        return None

    cached_at, quote = cached

    age = time.monotonic() - cached_at

    if age > QUOTE_CACHE_TTL_SECONDS:
        _QUOTE_CACHE.pop(symbol, None)
        return None

    return quote


def _store_cached_quote(
    symbol: str,
    quote: dict,
):
    _QUOTE_CACHE[symbol] = (
        time.monotonic(),
        quote,
    )


async def get_market_quote(symbol: str):
    validate_market(symbol)

    # ---------------------------------------------------------------
    # Check short-lived quote cache.
    # ---------------------------------------------------------------
    cached_quote = _get_cached_quote(symbol)

    if cached_quote is not None:
        return cached_quote

    candles = await get_candles(
        symbol=symbol,
        interval="5m",
        outputsize=2,
    )

    if not candles:
        raise RuntimeError(
            "No market data available for quote."
        )

    latest = candles[-1]

    if len(candles) >= 2:
        previous = candles[-2]

        if previous["close"] != 0:
            change_percent = (
                (latest["close"] - previous["close"])
                / previous["close"]
            ) * 100
        else:
            change_percent = 0.0
    else:
        change_percent = 0.0

    if change_percent > 0.01:
        direction = "UP"
    elif change_percent < -0.01:
        direction = "DOWN"
    else:
        direction = "FLAT"

    quote = {
        "symbol": symbol,
        "price": latest["close"],
        "change_percent": round(
            change_percent,
            4,
        ),
        "direction": direction,
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
    }

    _store_cached_quote(
        symbol=symbol,
        quote=quote,
    )

    return quote


async def get_all_market_quotes():
    results = []

    for symbol in SUPPORTED_MARKETS:
        try:
            result = await get_market_quote(symbol)
            results.append(result)

        except Exception as error:
            results.append(
                {
                    "symbol": symbol,
                    "error": str(error),
                }
            )

    return results