from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import create_db_and_tables
from .routes.analysis import router as analysis_router
from .routes.outcomes import router as outcomes_router
from .routes.performance import router as performance_router
from .routes.markets import router as markets_router
from .routes.signals import router as signals_router
from .routes.history import router as history_router
from .routes.strategy_lab import router as strategy_lab_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(
    title="SignalPilot AI API",
    description="AI-powered market intelligence backend",
    version="0.4.0",
    lifespan=lifespan,
)


allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "name": "SignalPilot AI",
        "status": "online",
        "version": "0.4.0",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
    }


app.include_router(markets_router)
app.include_router(outcomes_router)
app.include_router(performance_router)
app.include_router(signals_router)
app.include_router(analysis_router)
app.include_router(history_router)
app.include_router(strategy_lab_router)