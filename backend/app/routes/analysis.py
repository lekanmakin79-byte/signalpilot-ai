from fastapi import APIRouter, HTTPException

from ..ai_engine import interpret_analysis
from ..analysis_engine import analyze_market
from ..market_data import get_candles
from ..market_intelligence import (
    build_market_intelligence,
    get_market_intelligence,
)


router = APIRouter(
    prefix="/analysis",
    tags=["Analysis"],
)


# IMPORTANT:
# The /ai route must come BEFORE /{symbol:path}
# because {symbol:path} can consume the "/ai" portion.
@router.get("/{symbol:path}/ai")
async def analyze_with_ai(
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

        quantitative_analysis = analyze_market(
            symbol=symbol,
            interval=interval,
            candles=candles,
        )

        market_intelligence = await build_market_intelligence(
            interval=interval,
            limit=limit,
        )

        selected_market = get_market_intelligence(
            market_intelligence,
            symbol,
        )

        quantitative_analysis = {
            **quantitative_analysis,
            "quality": selected_market.get(
                "quality",
                {},
            ),
            "ranking": selected_market.get(
                "ranking",
                {},
            ),
            "opportunity": selected_market.get(
                "opportunity",
                {},
            ),
            "fundamental": selected_market.get(
                "fundamental",
                {},
            ),
            "data_analytics": selected_market.get(
                "data_analytics",
                {},
            ),
        }

        ai_interpretation = await interpret_analysis(
            quantitative_analysis
        )

        return {
            "success": True,
            "analysis": quantitative_analysis,
            "ai": ai_interpretation,
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


@router.get("/{symbol:path}")
async def analyze(
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

        result = analyze_market(
            symbol=symbol,
            interval=interval,
            candles=candles,
        )

        return {
            "success": True,
            "analysis": result,
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