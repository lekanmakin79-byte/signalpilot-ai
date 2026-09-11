from fastapi import APIRouter, HTTPException

from ..market_data import (
    get_all_market_quotes,
    get_market_quote,
)


router = APIRouter(
    prefix="/markets",
    tags=["Markets"],
)


@router.get("/")
async def markets():
    return {
        "success": True,
        "markets": await get_all_market_quotes(),
    }


@router.get("/{symbol:path}")
async def market(symbol: str):
    try:
        result = await get_market_quote(symbol)

        return {
            "success": True,
            "market": result,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        )