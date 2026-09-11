import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlmodel import SQLModel, Session, select

from app.database import SignalHistory


load_dotenv()


SQLITE_URL = "sqlite:///signalpilot.db"

SUPABASE_URL = os.getenv("DATABASE_URL")

if not SUPABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set in backend/.env"
    )


if SUPABASE_URL.startswith("postgresql://"):
    SUPABASE_URL = SUPABASE_URL.replace(
        "postgresql://",
        "postgresql+psycopg://",
        1,
    )


print("Connecting to local SQLite database...")

sqlite_engine = create_engine(
    SQLITE_URL,
    connect_args={
        "check_same_thread": False,
    },
)


print("Connecting to Supabase PostgreSQL...")

supabase_engine = create_engine(
    SUPABASE_URL,
    pool_pre_ping=True,
)


try:
    # ---------------------------------------------------------
    # 1. Verify the local SQLite data
    # ---------------------------------------------------------

    with Session(sqlite_engine) as sqlite_session:
        local_records = list(
            sqlite_session.exec(
                select(SignalHistory).order_by(
                    SignalHistory.id
                )
            )
        )

    print(
        f"Local SQLite records found: {len(local_records)}"
    )

    if not local_records:
        raise RuntimeError(
            "No SignalHistory records were found in SQLite."
        )

    # ---------------------------------------------------------
    # 2. Create the PostgreSQL table
    # ---------------------------------------------------------

    print("Creating Supabase tables if necessary...")

    SQLModel.metadata.create_all(
        supabase_engine
    )

    # ---------------------------------------------------------
    # 3. Check existing Supabase records
    # ---------------------------------------------------------

    with Session(supabase_engine) as supabase_session:
        existing_records = list(
            supabase_session.exec(
                select(SignalHistory).order_by(
                    SignalHistory.id
                )
            )
        )

    print(
        f"Existing Supabase records: "
        f"{len(existing_records)}"
    )

    existing_ids = {
        record.id
        for record in existing_records
        if record.id is not None
    }

    # ---------------------------------------------------------
    # 4. Copy records that do not already exist
    # ---------------------------------------------------------

    records_to_insert = [
        record
        for record in local_records
        if record.id not in existing_ids
    ]

    print(
        f"Records to migrate: "
        f"{len(records_to_insert)}"
    )

    if records_to_insert:
        with Session(supabase_engine) as supabase_session:

            for record in records_to_insert:

                migrated_record = SignalHistory(
                    id=record.id,
                    symbol=record.symbol,
                    timeframe=record.timeframe,
                    price=record.price,
                    direction=record.direction,
                    confidence=record.confidence,
                    trend=record.trend,
                    momentum=record.momentum,
                    volatility=record.volatility,
                    trend_score=record.trend_score,
                    momentum_score=record.momentum_score,
                    volatility_score=record.volatility_score,
                    directional_score=record.directional_score,
                    ema20=record.ema20,
                    ema50=record.ema50,
                    rsi14=record.rsi14,
                    macd=record.macd,
                    macd_signal=record.macd_signal,
                    macd_histogram=record.macd_histogram,
                    atr14=record.atr14,
                    risk_level=record.risk_level,
                    explanation=record.explanation,
                    data_points=record.data_points,
                    created_at=record.created_at,
                    signal_timestamp=record.signal_timestamp,
                    evaluation_minutes=record.evaluation_minutes,
                    evaluation_price=record.evaluation_price,
                    price_change=record.price_change,
                    price_change_percent=record.price_change_percent,
                    outcome=record.outcome,
                    evaluated_at=record.evaluated_at,
                )

                supabase_session.add(
                    migrated_record
                )

            supabase_session.commit()

        print(
            "Migration records inserted successfully."
        )
    else:
        print(
            "No new records needed to be inserted."
        )

    # ---------------------------------------------------------
    # 5. Verify the migrated data
    # ---------------------------------------------------------

    with Session(supabase_engine) as supabase_session:

        migrated_records = list(
            supabase_session.exec(
                select(SignalHistory).order_by(
                    SignalHistory.id
                )
            )
        )

    print(
        f"Supabase records after migration: "
        f"{len(migrated_records)}"
    )

    local_ids = {
        record.id
        for record in local_records
    }

    supabase_ids = {
        record.id
        for record in migrated_records
    }

    missing_ids = local_ids - supabase_ids

    if missing_ids:
        raise RuntimeError(
            "Migration verification failed. "
            f"Missing IDs: {sorted(missing_ids)}"
        )

    print()
    print("=" * 60)
    print("MIGRATION SUCCESSFUL")
    print("=" * 60)
    print(
        f"Local SQLite records: {len(local_records)}"
    )
    print(
        f"Supabase records:     {len(migrated_records)}"
    )
    print(
        f"Verified record IDs:  {len(local_ids)}"
    )
    print("=" * 60)


finally:
    sqlite_engine.dispose()
    supabase_engine.dispose()