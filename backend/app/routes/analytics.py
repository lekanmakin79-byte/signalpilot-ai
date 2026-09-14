from fastapi import APIRouter, HTTPException

from ..data_analytics import build_data_analytics
from ..market_data import get_candles


router = APIRouter(
    prefix="/analytics",
    tags=["Data Analytics"],
)


@router.get("/{symbol:path}")
async def analyze_data(
    symbol: str,
    interval: str = "5m",
    limit: int = 100,
):
    try:
        candles = await get_candles(
            symbol=symbol,
            interval=interval,
            outputsize=limit,
        )

        analytics = build_data_analytics(
            symbol=symbol,
            interval=interval,
            candles=candles,
        )

        return {
            "success": True,
            "analytics": analytics,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=502,
            detail=str(error),
        )