from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select

from ..database import SignalHistory, engine
from ..outcome_engine import (
    calculate_outcome,
    calculate_target_time,
    get_evaluation_price,
)

router = APIRouter(
    prefix="/outcomes",
    tags=["Outcome Tracking"],
)

MAX_REASONABLE_PRICE_CHANGE_RATIO = 0.50


@router.post("/evaluate")
async def evaluate_pending_signals():
    try:
        with Session(engine) as session:
            statement = (
                select(SignalHistory)
                .where(
                    SignalHistory.outcome == "PENDING"
                )
                .where(
                    SignalHistory.signal_timestamp != None
                )
                .order_by(
                    SignalHistory.id.asc()
                )
            )

            records = session.exec(statement).all()
            results = []
            now = datetime.now(timezone.utc)

            for record in records:
                if record.id == 5:
                    results.append(
                        {
                            "id": record.id,
                            "status": "SKIPPED",
                            "reason": (
                                "Legacy test signal created "
                                "before UTC timestamp correction."
                            ),
                        }
                    )
                    continue

                target_time, evaluation_minutes = (
                    calculate_target_time(
                        record.signal_timestamp,
                        record.timeframe,
                    )
                )

                record.evaluation_minutes = (
                    evaluation_minutes
                )

                if now < target_time:
                    results.append(
                        {
                            "id": record.id,
                            "status": "PENDING",
                            "reason": (
                                "Evaluation horizon has "
                                "not elapsed yet."
                            ),
                            "target_time": (
                                target_time.isoformat()
                            ),
                        }
                    )
                    continue

                try:
                    (
                        evaluation_price,
                        evaluation_timestamp,
                    ) = await get_evaluation_price(
                        symbol=record.symbol,
                        timeframe=record.timeframe,
                        target_time=target_time,
                    )

                    if (
                        record.price <= 0
                        or evaluation_price <= 0
                        or (
                            abs(
                                evaluation_price
                                - record.price
                            )
                            / record.price
                        )
                        > MAX_REASONABLE_PRICE_CHANGE_RATIO
                    ):
                        record.outcome = "INVALID"
                        record.evaluation_price = (
                            evaluation_price
                        )
                        record.price_change = None
                        record.price_change_percent = None
                        record.evaluated_at = (
                            datetime.now(
                                timezone.utc
                            ).isoformat()
                        )

                        results.append(
                            {
                                "id": record.id,
                                "status": "SKIPPED",
                                "reason": (
                                    "Signal price is "
                                    "incompatible with "
                                    "the evaluation price "
                                    "and has been marked "
                                    "INVALID."
                                ),
                                "evaluation_timestamp": (
                                    evaluation_timestamp
                                ),
                            }
                        )
                        continue

                    outcome = calculate_outcome(
                        direction=record.direction,
                        signal_price=record.price,
                        evaluation_price=evaluation_price,
                    )

                    record.evaluation_price = (
                        outcome["evaluation_price"]
                    )
                    record.price_change = (
                        outcome["price_change"]
                    )
                    record.price_change_percent = (
                        outcome["price_change_percent"]
                    )
                    record.outcome = outcome["outcome"]
                    record.evaluated_at = (
                        datetime.now(
                            timezone.utc
                        ).isoformat()
                    )

                    results.append(
                        {
                            "id": record.id,
                            "status": "EVALUATED",
                            "evaluation_timestamp": (
                                evaluation_timestamp
                            ),
                            **outcome,
                        }
                    )

                except RuntimeError as error:
                    results.append(
                        {
                            "id": record.id,
                            "status": "PENDING",
                            "reason": str(error),
                            "target_time": (
                                target_time.isoformat()
                            ),
                        }
                    )

            session.commit()

        return {
            "success": True,
            "evaluated": sum(
                1
                for item in results
                if item["status"] == "EVALUATED"
            ),
            "pending": sum(
                1
                for item in results
                if item["status"] == "PENDING"
            ),
            "skipped": sum(
                1
                for item in results
                if item["status"] == "SKIPPED"
            ),
            "results": results,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )
