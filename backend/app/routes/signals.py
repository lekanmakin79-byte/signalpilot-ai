from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sqlmodel import Session

from ..database import engine, SignalHistory
from ..market_data import get_candles
from ..signal_engine import generate_signal


router = APIRouter(
    prefix="/signals",
    tags=["Signals"],
)


@router.get("/{symbol:path}")
async def signal(
    symbol: str,
    interval: str = "5m",
    limit: int = 100,
):
    symbol = symbol.strip().upper()
    interval = interval.strip().lower()

    if limit < 50:
        raise HTTPException(
            status_code=400,
            detail="At least 50 candles are required to generate a signal.",
        )

    if limit > 5000:
        raise HTTPException(
            status_code=400,
            detail="Maximum candle limit is 5000.",
        )

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

        history_record = SignalHistory(
            symbol=result["symbol"],
            timeframe=result["timeframe"],
            price=result["price"],
            signal_timestamp=result["signal_timestamp"],
            direction=result["direction"],
            confidence=result["confidence"],
            trend=result["trend"],
            momentum=result["momentum"],
            volatility=result["volatility"],
            trend_score=result["scores"]["trend"],
            momentum_score=result["scores"]["momentum"],
            volatility_score=result["scores"]["volatility"],
            directional_score=result["scores"]["directional"],
            ema20=result["indicators"]["ema20"],
            ema50=result["indicators"]["ema50"],
            rsi14=result["indicators"]["rsi14"],
            macd=result["indicators"]["macd"]["macd"],
            macd_signal=result["indicators"]["macd"]["signal"],
            macd_histogram=result["indicators"]["macd"]["histogram"],
            atr14=result["indicators"]["atr14"],
            risk_level=result["risk"]["risk_level"],
            explanation=result["explanation"],
            data_points=result["data_points"],
            created_at=datetime.now(timezone.utc).isoformat(),
        )

        with Session(engine) as session:
            session.add(history_record)
            session.commit()
            session.refresh(history_record)

        return {
            "success": True,
            "signal": result,
            "history_id": history_record.id,
        }

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