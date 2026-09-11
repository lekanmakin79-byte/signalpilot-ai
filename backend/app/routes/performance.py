from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select

from ..database import SignalHistory, engine


router = APIRouter(
    prefix="/performance",
    tags=["Performance"],
)


@router.get("/summary")
async def get_performance_summary():
    try:
        with Session(engine) as session:
            statement = (
                select(SignalHistory)
                .where(
                    SignalHistory.outcome.in_(
                        [
                            "CORRECT",
                            "INCORRECT",
                            "NEUTRAL",
                        ]
                    )
                )
            )

            records = session.exec(statement).all()

        total = len(records)

        correct = sum(
            1
            for record in records
            if record.outcome == "CORRECT"
        )

        incorrect = sum(
            1
            for record in records
            if record.outcome == "INCORRECT"
        )

        neutral = sum(
            1
            for record in records
            if record.outcome == "NEUTRAL"
        )

        directional_total = correct + incorrect

        if directional_total > 0:
            hit_rate = (
                correct / directional_total
            ) * 100
        else:
            hit_rate = 0.0

        if total > 0:
            average_confidence = (
                sum(
                    record.confidence
                    for record in records
                )
                / total
            )
        else:
            average_confidence = 0.0

        average_price_change = (
            sum(
                record.price_change_percent or 0
                for record in records
            )
            / total
            if total > 0
            else 0.0
        )

        return {
            "success": True,
            "summary": {
                "evaluated_signals": total,
                "correct": correct,
                "incorrect": incorrect,
                "neutral": neutral,
                "hit_rate": round(hit_rate, 2),
                "average_confidence": round(
                    average_confidence,
                    2,
                ),
                "average_price_change_percent": round(
                    average_price_change,
                    6,
                ),
            },
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@router.get("/markets")
async def get_performance_by_market():
    try:
        with Session(engine) as session:
            statement = (
                select(SignalHistory)
                .where(
                    SignalHistory.outcome.in_(
                        [
                            "CORRECT",
                            "INCORRECT",
                            "NEUTRAL",
                        ]
                    )
                )
                .order_by(SignalHistory.symbol)
            )

            records = session.exec(statement).all()

        grouped = {}

        for record in records:
            symbol = record.symbol

            if symbol not in grouped:
                grouped[symbol] = {
                    "market": symbol,
                    "evaluated_signals": 0,
                    "correct": 0,
                    "incorrect": 0,
                    "neutral": 0,
                    "average_confidence": 0.0,
                    "average_price_change_percent": 0.0,
                }

            item = grouped[symbol]

            item["evaluated_signals"] += 1

            if record.outcome == "CORRECT":
                item["correct"] += 1

            elif record.outcome == "INCORRECT":
                item["incorrect"] += 1

            elif record.outcome == "NEUTRAL":
                item["neutral"] += 1

            item["average_confidence"] += record.confidence

            item["average_price_change_percent"] += (
                record.price_change_percent or 0
            )

        results = []

        for item in grouped.values():
            total = item["evaluated_signals"]

            directional_total = (
                item["correct"] + item["incorrect"]
            )

            if directional_total > 0:
                item["hit_rate"] = round(
                    (
                        item["correct"]
                        / directional_total
                    )
                    * 100,
                    2,
                )
            else:
                item["hit_rate"] = 0.0

            item["average_confidence"] = round(
                item["average_confidence"] / total,
                2,
            )

            item["average_price_change_percent"] = round(
                item["average_price_change_percent"]
                / total,
                6,
            )

            results.append(item)

        return {
            "success": True,
            "markets": results,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@router.get("/timeframes")
async def get_performance_by_timeframe():
    try:
        with Session(engine) as session:
            statement = (
                select(SignalHistory)
                .where(
                    SignalHistory.outcome.in_(
                        [
                            "CORRECT",
                            "INCORRECT",
                            "NEUTRAL",
                        ]
                    )
                )
                .order_by(SignalHistory.timeframe)
            )

            records = session.exec(statement).all()

        grouped = {}

        for record in records:
            timeframe = record.timeframe

            if timeframe not in grouped:
                grouped[timeframe] = {
                    "timeframe": timeframe,
                    "evaluated_signals": 0,
                    "correct": 0,
                    "incorrect": 0,
                    "neutral": 0,
                    "average_confidence": 0.0,
                }

            item = grouped[timeframe]

            item["evaluated_signals"] += 1

            if record.outcome == "CORRECT":
                item["correct"] += 1

            elif record.outcome == "INCORRECT":
                item["incorrect"] += 1

            elif record.outcome == "NEUTRAL":
                item["neutral"] += 1

            item["average_confidence"] += record.confidence

        results = []

        for item in grouped.values():
            total = item["evaluated_signals"]

            directional_total = (
                item["correct"] + item["incorrect"]
            )

            if directional_total > 0:
                item["hit_rate"] = round(
                    (
                        item["correct"]
                        / directional_total
                    )
                    * 100,
                    2,
                )
            else:
                item["hit_rate"] = 0.0

            item["average_confidence"] = round(
                item["average_confidence"] / total,
                2,
            )

            results.append(item)

        return {
            "success": True,
            "timeframes": results,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@router.get("/confidence-ranges")
async def get_performance_by_confidence_range():
    try:
        ranges = [
            {
                "range": "50-59%",
                "minimum": 50,
                "maximum": 59.99,
                "evaluated_signals": 0,
                "correct": 0,
                "incorrect": 0,
                "neutral": 0,
                "confidence_total": 0.0,
            },
            {
                "range": "60-69%",
                "minimum": 60,
                "maximum": 69.99,
                "evaluated_signals": 0,
                "correct": 0,
                "incorrect": 0,
                "neutral": 0,
                "confidence_total": 0.0,
            },
            {
                "range": "70-79%",
                "minimum": 70,
                "maximum": 79.99,
                "evaluated_signals": 0,
                "correct": 0,
                "incorrect": 0,
                "neutral": 0,
                "confidence_total": 0.0,
            },
            {
                "range": "80-89%",
                "minimum": 80,
                "maximum": 89.99,
                "evaluated_signals": 0,
                "correct": 0,
                "incorrect": 0,
                "neutral": 0,
                "confidence_total": 0.0,
            },
            {
                "range": "90-95%",
                "minimum": 90,
                "maximum": 95.01,
                "evaluated_signals": 0,
                "correct": 0,
                "incorrect": 0,
                "neutral": 0,
                "confidence_total": 0.0,
            },
        ]

        with Session(engine) as session:
            statement = (
                select(SignalHistory)
                .where(
                    SignalHistory.outcome.in_(
                        [
                            "CORRECT",
                            "INCORRECT",
                            "NEUTRAL",
                        ]
                    )
                )
            )

            records = session.exec(statement).all()

        for record in records:
            matching_range = None

            for confidence_range in ranges:
                if (
                    confidence_range["minimum"]
                    <= record.confidence
                    <= confidence_range["maximum"]
                ):
                    matching_range = confidence_range
                    break

            if matching_range is None:
                continue

            matching_range["evaluated_signals"] += 1

            if record.outcome == "CORRECT":
                matching_range["correct"] += 1

            elif record.outcome == "INCORRECT":
                matching_range["incorrect"] += 1

            elif record.outcome == "NEUTRAL":
                matching_range["neutral"] += 1

            matching_range["confidence_total"] += (
                record.confidence
            )

        results = []

        for item in ranges:
            total = item["evaluated_signals"]

            directional_total = (
                item["correct"] + item["incorrect"]
            )

            if directional_total > 0:
                hit_rate = (
                    item["correct"]
                    / directional_total
                ) * 100
            else:
                hit_rate = 0.0

            if total > 0:
                average_confidence = (
                    item["confidence_total"]
                    / total
                )
            else:
                average_confidence = 0.0

            results.append(
                {
                    "range": item["range"],
                    "evaluated_signals": total,
                    "correct": item["correct"],
                    "incorrect": item["incorrect"],
                    "neutral": item["neutral"],
                    "hit_rate": round(
                        hit_rate,
                        2,
                    ),
                    "average_confidence": round(
                        average_confidence,
                        2,
                    ),
                }
            )

        return {
            "success": True,
            "confidence_ranges": results,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )