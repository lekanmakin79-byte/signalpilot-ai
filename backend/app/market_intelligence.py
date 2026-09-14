from __future__ import annotations

from .data_analytics import build_data_analytics
from .fundamental_service import (
    get_market_fundamental_analysis,
)
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
        -> technical signals
        -> quality
        -> ranking
        -> opportunities
        -> fundamental analysis
        -> data analytics

    The returned records preserve the existing quantitative
    analysis while adding fundamental and four-layer data
    analytics intelligence.
    """
    interval = interval.strip().lower()

    signals = []
    market_analytics = {}
    market_fundamentals = {}

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

        market_analytics[symbol] = build_data_analytics(
            symbol=symbol,
            interval=interval,
            candles=candles,
        )

        market_fundamentals[symbol] = (
            await get_market_fundamental_analysis(
                symbol=symbol,
            )
        )

    ranked_signals = rank_signals(
        signals
    )

    opportunities = scan_opportunities(
        ranked_signals
    )

    enriched_opportunities = []

    for opportunity in opportunities:
        symbol = opportunity.get("symbol")

        enriched_opportunity = {
            **opportunity,
            "fundamental": market_fundamentals.get(
                symbol,
                {
                    "symbol": symbol,
                    "available": False,
                    "status": "unavailable",
                    "bias": "NEUTRAL",
                    "score": None,
                    "factors": [],
                    "providers": [],
                    "source_count": 0,
                    "message": (
                        "Fundamental analysis is "
                        "currently unavailable."
                    ),
                },
            ),
            "data_analytics": market_analytics.get(
                symbol,
                {
                    "symbol": symbol,
                    "interval": interval,
                    "descriptive": {},
                    "diagnostic": {},
                    "predictive": {},
                    "prescriptive": {},
                },
            ),
        }

        enriched_opportunities.append(
            enriched_opportunity
        )

    return enriched_opportunities


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