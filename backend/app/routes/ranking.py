from fastapi import APIRouter, HTTPException

from ..market_data import (
    SUPPORTED_MARKETS,
    get_candles,
)
from ..signal_engine import generate_signal
from ..signal_ranking import rank_signals


router = APIRouter(
    prefix="/signals",
    tags=["Signals"],
)


@router.get("/ranking")
async def signal_ranking(
    interval: str = "5m",
    limit: int = 100,
):
    interval = interval.strip().lower()

    if limit < 50:
        raise HTTPException(
            status_code=400,
            detail="At least 50 candles are required to rank signals.",
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

        except ValueError:
            raise

        except RuntimeError as error:
            raise HTTPException(
                status_code=502,
                detail=str(error),
            )

    ranked_signals = rank_signals(
        signals
    )

    return {
        "success": True,
        "interval": interval,
        "data_points": limit,
        "count": len(ranked_signals),
        "signals": ranked_signals,
    }
