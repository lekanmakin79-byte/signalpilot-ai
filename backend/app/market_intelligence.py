from __future__ import annotations

from .market_data import (
    SUPPORTED_MARKETS,
    get_candles,
)
from .signal_engine import generate_signal
from .signal_ranking import rank_signals
from .opportunity_scanner import scan_opportunities


async def build_market_intelligence(
    interval: str = "5m",
    limit: int = 100,
) -> list[dict]:
    """
    Build the complete comparative market-intelligence set.

    Pipeline:
        market data
        -> signals
        -> quality
        -> ranking
        -> opportunities

    The returned signals contain the existing quantitative
    analysis plus quality, ranking, and opportunity data.
    """
    interval = interval.strip().lower()

    signals = []

    for symbol in SUPPORTED_MARKETS:
        candles = await get_candles(
            symbol=symbol,
            interval=interval,
            outputsize=limit,
        )

        result = generate_signal(
            symbol=symbol,
            candles=candles,
            timeframe=interval,
        )

        signals.append(result)

    ranked_signals = rank_signals(
        signals
    )

    opportunities = scan_opportunities(
        ranked_signals
    )

    return opportunities


def get_market_intelligence(
    opportunities: list[dict],
    symbol: str,
) -> dict:
    """
    Return the comparative intelligence record
    for one selected market.

    Raises ValueError when the market is not present.
    """
    for opportunity in opportunities:
        if opportunity.get("symbol") == symbol:
            return opportunity

    raise ValueError(
        f"Market {symbol} was not found in the current "
        "market intelligence set."
    )
