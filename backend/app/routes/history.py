from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select

from ..database import SignalHistory, engine


router = APIRouter(
    prefix="/history",
    tags=["Signal History"],
)


@router.get("/signals")
async def get_signal_history(
    limit: int = 50,
):
    try:
        limit = max(1, min(limit, 200))

        with Session(engine) as session:
            statement = (
                select(SignalHistory)
                .order_by(
                    SignalHistory.id.desc()
                )
                .limit(limit)
            )

            records = session.exec(statement).all()

        return {
            "success": True,
            "count": len(records),
            "signals": records,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )