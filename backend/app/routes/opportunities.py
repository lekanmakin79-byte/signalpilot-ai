from fastapi import APIRouter, HTTPException

from ..market_data import (
    SUPPORTED_MARKETS,
    get_candles,
)
from ..signal_engine import generate_signal
from ..signal_ranking import rank_signals
from ..opportunity_scanner import scan_opportunities


router = APIRouter(
    prefix="/signals",
    tags=["Signals"],
)


@router.get("/opportunities")
async def signal_opportunities(
    interval: str = "5m",
    limit: int = 100,
):
    interval = interval.strip().lower()

    if limit < 50:
        raise HTTPException(
            status_code=400,
            detail="At least 50 candles are required to scan opportunities.",
        )

    if limit > 5000:
        raise HTTPException(
            status_code=400,
            detail="Maximum candle limit is 5000.",
        )

    signals = []

    for symbol in SUPPORTED_MARKETS:
        try:
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

        except ValueError as error:
            raise HTTPException(
                status_code=400,
                detail=str(error),
            )

        except RuntimeError as error:
            raise HTTPException(
                status_code=502,
                detail=str(error),
            )

    ranked_signals = rank_signals(
        signals
    )

    opportunities = scan_opportunities(
        ranked_signals
    )

    return {
        "success": True,
        "interval": interval,
        "data_points": limit,
        "count": len(opportunities),
        "opportunities": opportunities,
    }