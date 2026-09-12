from datetime import datetime, timezone

import httpx
from fastapi import APIRouter

from ..config import settings
from ..database import engine


router = APIRouter(
    prefix="/system",
    tags=["System"],
)


def _utc_now():
    return datetime.now(timezone.utc).isoformat()


async def _check_market_data():
    if not settings.market_data_api_key:
        return {
            "status": "unconfigured",
            "message": "Market-data API key is not configured.",
        }

    url = f"{settings.market_data_base_url}/quote"

    params = {
        "symbol": "EUR/USD",
        "apikey": settings.market_data_api_key,
    }

    try:
        async with httpx.AsyncClient(
            timeout=10.0
        ) as client:
            response = await client.get(
                url,
                params=params,
            )

        if response.status_code == 429:
            return {
                "status": "degraded",
                "message": "Market-data provider rate limit reached.",
            }

        if response.status_code != 200:
            return {
                "status": "down",
                "message": (
                    "Market-data provider returned HTTP "
                    f"{response.status_code}."
                ),
            }

        data = response.json()

        if data.get("status") == "error":
            return {
                "status": "down",
                "message": data.get(
                    "message",
                    "Market-data provider returned an error.",
                ),
            }

        if not data.get("close"):
            return {
                "status": "degraded",
                "message": "Market-data provider responded without quote data.",
            }

        return {
            "status": "healthy",
            "message": "Market-data provider is responding.",
        }

    except httpx.RequestError:
        return {
            "status": "down",
            "message": "Unable to reach the market-data provider.",
        }


async def _check_groq():
    if not settings.groq_api_key:
        return {
            "status": "unconfigured",
            "message": "Groq API key is not configured.",
        }

    url = "https://api.groq.com/openai/v1/models"

    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
    }

    try:
        async with httpx.AsyncClient(
            timeout=10.0
        ) as client:
            response = await client.get(
                url,
                headers=headers,
            )

        if response.status_code == 429:
            return {
                "status": "degraded",
                "message": "Groq API rate limit reached.",
            }

        if response.status_code != 200:
            return {
                "status": "down",
                "message": (
                    f"Groq API returned HTTP {response.status_code}."
                ),
            }

        return {
            "status": "healthy",
            "message": "Groq API is responding.",
            "model": settings.groq_model,
        }

    except httpx.RequestError:
        return {
            "status": "down",
            "message": "Unable to reach the Groq API.",
        }


def _check_database():
    try:
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")

        database_type = (
            "PostgreSQL"
            if engine.url.get_backend_name() == "postgresql"
            else "SQLite"
        )

        return {
            "status": "healthy",
            "message": "Database connection is working.",
            "database": database_type,
        }

    except Exception:
        return {
            "status": "down",
            "message": "Database connection failed.",
        }


@router.get("/health")
async def system_health():
    market_data, groq = await __import__(
        "asyncio"
    ).gather(
        _check_market_data(),
        _check_groq(),
    )

    database = _check_database()

    checks = {
        "backend": {
            "status": "healthy",
            "message": "SignalPilot AI backend is running.",
        },
        "market_data": market_data,
        "groq": groq,
        "database": database,
        "signal_engine": {
            "status": "healthy",
            "message": "Signal engine is available through the backend.",
        },
    }

    statuses = [
        check["status"]
        for check in checks.values()
    ]

    if "down" in statuses:
        overall_status = "degraded"

    elif "degraded" in statuses or "unconfigured" in statuses:
        overall_status = "degraded"

    else:
        overall_status = "healthy"

    return {
        "status": overall_status,
        "timestamp": _utc_now(),
        "checks": checks,
    }