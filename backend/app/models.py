from pydantic import BaseModel
from typing import Literal


class Candle(BaseModel):
    datetime: str
    open: float
    high: float
    low: float
    close: float


class MarketQuote(BaseModel):
    symbol: str
    price: float
    change_percent: float
    direction: Literal["UP", "DOWN", "FLAT"]


class MarketAnalysis(BaseModel):
    symbol: str
    price: float
    trend: str
    momentum: str
    volatility: str
    rsi: float | None = None


class Signal(BaseModel):
    symbol: str
    timeframe: str
    direction: Literal["UP", "DOWN", "NEUTRAL"]
    confidence: float
    trend: str
    momentum: str
    explanation: str