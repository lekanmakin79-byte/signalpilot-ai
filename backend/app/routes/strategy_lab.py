from fastapi import APIRouter, HTTPException, Query
import httpx

from ..market_data import (
    get_candles,
    validate_interval,
    validate_market,
)
from ..strategy_lab import run_backtest


router = APIRouter(
    prefix="/strategy-lab",
    tags=["Strategy Lab"],
)


@router.get("/backtest")
async def backtest(
    symbol: str = Query(
        default="EUR/USD"
    ),
    timeframe: str = Query(
        default="5m"
    ),
    limit: int = Query(
        default=500,
        ge=52,
        le=5000,
    ),
    minimum_confidence: float = Query(
        default=0.0,
        ge=0.0,
        le=95.0,
    ),
):
    normalized_symbol = symbol.strip().upper()
    normalized_timeframe = timeframe.strip().lower()

    try:
        validate_market(normalized_symbol)
        validate_interval(normalized_timeframe)

        candles = await get_candles(
            symbol=normalized_symbol,
            interval=normalized_timeframe,
            outputsize=limit,
        )

        result = run_backtest(
            symbol=normalized_symbol,
            timeframe=normalized_timeframe,
            candles=candles,
            minimum_confidence=minimum_confidence,
        )

        return result

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except httpx.HTTPStatusError as error:
        status_code = error.response.status_code

        raise HTTPException(
            status_code=502,
            detail=(
                "Market-data provider returned an HTTP error "
                f"(status {status_code})."
            ),
        )

    except httpx.RequestError as error:
        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to connect to the market-data provider: "
                f"{error}"
            ),
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=502,
            detail=str(error),
        )
