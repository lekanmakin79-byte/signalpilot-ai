from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import create_db_and_tables
from .routes.analysis import router as analysis_router
from .routes.outcomes import router as outcomes_router
from .routes.performance import router as performance_router
from .routes.markets import router as markets_router
from .routes.signals import router as signals_router
from .routes.ranking import router as ranking_router
from .routes.opportunities import router as opportunities_router
from .routes.history import router as history_router
from .routes.strategy_lab import router as strategy_lab_router
from .routes.system import router as system_router
from .routes.analytics import router as analytics_router
from .routes.fundamentals import router as fundamentals_router


API_PREFIX = "/api/backend"


class VercelPathMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            path = scope.get("path", "")

            if path == API_PREFIX:
                scope["path"] = "/"

            elif path.startswith(f"{API_PREFIX}/"):
                scope["path"] = path[len(API_PREFIX):]

        await self.app(scope, receive, send)


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
app.include_router(ranking_router)
app.include_router(opportunities_router)
app.include_router(signals_router)
app.include_router(analysis_router)
app.include_router(history_router)
app.include_router(strategy_lab_router)
app.include_router(system_router)
app.include_router(analytics_router)
app.include_router(fundamentals_router)


app.add_middleware(VercelPathMiddleware)