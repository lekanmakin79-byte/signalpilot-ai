from fastapi import APIRouter, HTTPException

from ..fundamental_service import (
    get_market_fundamental_analysis,
)


router = APIRouter(
    prefix="/fundamentals",
    tags=["Fundamental Analysis"],
)


@router.get("/{symbol:path}")
async def analyze_fundamentals(
    symbol: str,
):
    try:
        analysis = (
            await get_market_fundamental_analysis(
                symbol=symbol
            )
        )

        return {
            "success": True,
            "fundamental": analysis,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        ) from error

    except RuntimeError as error:
        raise HTTPException(
            status_code=502,
            detail=str(error),
        ) from error