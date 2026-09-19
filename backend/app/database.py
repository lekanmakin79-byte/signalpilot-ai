import os

from sqlmodel import Field, SQLModel, Session, create_engine


class SignalHistory(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)

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
    signal_timestamp: str | None = None

    evaluation_minutes: int | None = None
    evaluation_price: float | None = None
    price_change: float | None = None
    price_change_percent: float | None = None
    outcome: str = "PENDING"
    evaluated_at: str | None = None


class PaperTradingAccount(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)

    name: str = Field(index=True)

    initial_balance: float
    balance: float
    equity: float

    currency: str = "USD"

    status: str = Field(
        default="ACTIVE",
        index=True,
    )

    created_at: str
    updated_at: str


class PaperOrder(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)

    account_id: int = Field(index=True)

    symbol: str = Field(index=True)
    timeframe: str = Field(index=True)
    side: str = Field(index=True)

    order_type: str = "MARKET"

    quantity: float

    requested_price: float
    executed_price: float | None = None

    stop_loss: float | None = None
    take_profit: float | None = None

    status: str = Field(
        default="PENDING",
        index=True,
    )

    signal_history_id: int | None = Field(
        default=None,
        index=True,
    )

    confidence: float | None = None
    quality_score: float | None = None

    created_at: str
    executed_at: str | None = None


class PaperPosition(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)

    account_id: int = Field(index=True)

    symbol: str = Field(index=True)
    timeframe: str = Field(index=True)
    side: str = Field(index=True)

    quantity: float

    entry_price: float
    current_price: float

    stop_loss: float | None = None
    take_profit: float | None = None

    unrealised_pnl: float = 0.0
    realised_pnl: float | None = None

    status: str = Field(
        default="OPEN",
        index=True,
    )

    order_id: int = Field(index=True)

    opened_at: str
    closed_at: str | None = None
    exit_price: float | None = None


class TradingControl(SQLModel, table=True):
    """
    Backend-enforced control for automated paper trading.

    When enabled is False, automated trade creation must stop.
    Existing paper positions are not automatically closed.
    """

    id: int | None = Field(
        default=None,
        primary_key=True,
    )

    name: str = Field(
        default="paper_trading",
        index=True,
        unique=True,
    )

    enabled: bool = True

    reason: str | None = None

    updated_at: str


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///signalpilot.db",
)


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