import asyncio
from datetime import datetime, timezone

from app.outcome_engine import (
    _market_data_cache,
    fetch_market_data,
)


def test_fetch_market_data_reuses_cached_provider_response(monkeypatch):
    _market_data_cache.clear()

    provider_calls = 0

    async def fake_provider(symbol: str, timeframe: str):
        nonlocal provider_calls
        provider_calls += 1

        return [
            (
                datetime(
                    2026,
                    9,
                    12,
                    12,
                    0,
                    tzinfo=timezone.utc,
                ),
                1.2345,
            )
        ]

    monkeypatch.setattr(
        "app.outcome_engine._fetch_market_data_from_provider",
        fake_provider,
    )

    async def run_test():
        first = await fetch_market_data(
            symbol="EUR/USD",
            timeframe="5m",
        )

        second = await fetch_market_data(
            symbol="EUR/USD",
            timeframe="5m",
        )

        third = await fetch_market_data(
            symbol="EUR/USD",
            timeframe="5m",
        )

        return first, second, third

    first, second, third = asyncio.run(run_test())

    assert provider_calls == 1
    assert first == second == third

    _market_data_cache.clear()
