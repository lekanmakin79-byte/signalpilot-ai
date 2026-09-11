import os

from sqlmodel import Field, SQLModel, Session, create_engine


class SignalHistory(SQLModel, table=True):
    id: int | None = Field(
        default=None,
        primary_key=True,
    )

    symbol: str = Field(index=True)
    timeframe: str = Field(index=True)
    price: float
    direction: str
    confidence: float
    trend: str
    momentum: str
    volatility: str
    trend_score: float
    momentum_score: float
    volatility_score: float
    directional_score: float
    ema20: float | None = None
    ema50: float | None = None
    rsi14: float | None = None
    macd: float | None = None
    macd_signal: float | None = None
    macd_histogram: float | None = None
    atr14: float | None = None
    risk_level: str
    explanation: str
    data_points: int
    created_at: str

    # Market candle that generated the signal
    signal_timestamp: str | None = None

    # Outcome tracking
    evaluation_minutes: int | None = None
    evaluation_price: float | None = None
    price_change: float | None = None
    price_change_percent: float | None = None
    outcome: str = "PENDING"
    evaluated_at: str | None = None


# Production uses the Supabase PostgreSQL DATABASE_URL
# stored in Vercel.
#
# Local development continues to use the existing
# signalpilot.db SQLite database unless DATABASE_URL
# is explicitly provided in the local environment.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///signalpilot.db",
)


# SQLAlchemy defaults to psycopg2 for a plain
# postgresql:// URL. This project uses psycopg 3,
# so explicitly select the psycopg driver.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+psycopg://",
        1,
    )

elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgres://",
        "postgresql+psycopg://",
        1,
    )


if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={
            "check_same_thread": False,
        },
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
    )


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session