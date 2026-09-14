from __future__ import annotations

import asyncio
from typing import Any

from .fundamental_adapter import build_provider_requests
from .fundamental_normalization import (
    build_currency_fundamental_data,
)
from .fundamental_series import (
    BOE_SERIES,
    BOJ_SERIES,
    ECB_SERIES,
    FRED_SERIES,
)
from .market_fundamentals import (
    build_market_fundamental_analysis,
)
from .providers.boe_provider import (
    get_bank_rate,
)
from .providers.boj_provider import (
    get_time_series,
)
from .providers.ecb_provider import (
    get_policy_rate,
)
from .providers.fred_provider import (
    get_series_observations,
)


class FundamentalServiceError(RuntimeError):
    """Raised when the fundamental service cannot operate."""


async def _get_fred_record(
    request: dict[str, Any],
) -> dict[str, Any] | None:
    """
    Retrieve and label one FRED series.

    Provider failures are isolated so one unavailable
    economic series does not prevent other verified
    providers from contributing data.
    """

    try:
        payload = await get_series_observations(
            series_id=request["series_id"],
            limit=10,
        )
    except Exception:
        return None

    return {
        "provider": payload.get(
            "provider",
            "FRED",
        ),
        "country": request["country"],
        "category": request["category"],
        "observations": payload.get(
            "observations",
            [],
        ),
        "updated_at": payload.get(
            "updated_at"
        ),
        "source_url": payload.get(
            "source_url"
        ),
    }


async def _get_ecb_record(
    request: dict[str, Any],
) -> dict[str, Any] | None:
    """
    Retrieve the verified ECB policy-rate series.
    """

    series_config = request.get(
        "series"
    )

    # The current fundamental_series.py stores ECB
    # metadata rather than the live series identifier.
    # Use the verified identifier explicitly here.
    if (
        isinstance(series_config, dict)
        and request.get("category") == "policy_rate"
    ):
        series_key = (
            "B.U2.EUR.4F.KR.DFR.LEV"
        )
    elif isinstance(
        series_config,
        str,
    ):
        series_key = series_config
    else:
        return None

    try:
        payload = await get_policy_rate(
            last_n_observations=10,
        )
    except Exception:
        return None

    return {
        "provider": payload.get(
            "provider",
            "European Central Bank",
        ),
        "country": "euro_area",
        "category": "policy_rate",
        "observations": payload.get(
            "observations",
            [],
        ),
        "updated_at": payload.get(
            "updated_at"
        ),
        "source_url": payload.get(
            "source_url"
        ),
        "series": series_key,
    }


async def _get_boe_record(
    request: dict[str, Any],
) -> dict[str, Any] | None:
    """
    Retrieve the verified Bank Rate series.
    """

    try:
        payload = await get_bank_rate(
            last_n_observations=10,
        )
    except Exception:
        return None

    return {
        "provider": payload.get(
            "provider",
            "Bank of England",
        ),
        "country": "uk",
        "category": "policy_rate",
        "observations": payload.get(
            "observations",
            [],
        ),
        "updated_at": payload.get(
            "updated_at"
        ),
        "source_url": payload.get(
            "source_url"
        ),
        "series": request.get(
            "series_id"
        ),
    }


async def _get_boj_record(
    request: dict[str, Any],
) -> dict[str, Any] | None:
    """
    Retrieve the verified Bank of Japan policy-rate
    series.
    """

    database = request.get(
        "database"
    )
    series_code = request.get(
        "series_id"
    )

    if not database or not series_code:
        return None

    try:
        payload = await get_time_series(
            database=database,
            series_code=series_code,
        )
    except Exception:
        return None

    return {
        "provider": payload.get(
            "provider",
            "Bank of Japan",
        ),
        "country": "japan",
        "category": "policy_rate",
        "observations": payload.get(
            "observations",
            [],
        ),
        "updated_at": payload.get(
            "updated_at"
        ),
        "source_url": payload.get(
            "source_url"
        ),
        "series": series_code,
    }


async def collect_fundamental_records(
    symbol: str,
) -> list[dict[str, Any]]:
    """
    Collect verified fundamental observations required
    for one supported SignalPilot market.

    Provider failures are isolated. Missing data is
    omitted rather than fabricated.
    """

    requests = build_provider_requests(
        symbol
    )

    tasks: list[Any] = []
    task_types: list[str] = []

    for request in requests["fred"]:
        tasks.append(
            _get_fred_record(request)
        )
        task_types.append("fred")

    for request in requests["ecb"]:
        tasks.append(
            _get_ecb_record(request)
        )
        task_types.append("ecb")

    for request in requests["boe"]:
        tasks.append(
            _get_boe_record(request)
        )
        task_types.append("boe")

    for request in requests["boj"]:
        tasks.append(
            _get_boj_record(request)
        )
        task_types.append("boj")

    if not tasks:
        return []

    results = await asyncio.gather(
        *tasks,
        return_exceptions=True,
    )

    records: list[dict[str, Any]] = []

    for result, provider_type in zip(
        results,
        task_types,
    ):
        if isinstance(
            result,
            Exception,
        ):
            continue

        if not isinstance(
            result,
            dict,
        ):
            continue

        observations = result.get(
            "observations",
            [],
        )

        if not observations:
            continue

        records.append(result)

    return records


async def get_currency_fundamental_data(
    symbol: str,
) -> dict[str, Any]:
    """
    Collect provider data and normalize it into the
    currency-based structure consumed by
    market_fundamentals.py.
    """

    symbol = symbol.strip().upper()

    records = await collect_fundamental_records(
        symbol
    )

    return build_currency_fundamental_data(
        records
    )


async def get_market_fundamental_analysis(
    symbol: str,
) -> dict[str, Any]:
    """
    Run the complete fundamental-analysis pipeline
    for one supported market.
    """

    symbol = symbol.strip().upper()

    data = await get_currency_fundamental_data(
        symbol
    )

    analysis = build_market_fundamental_analysis(
        symbol=symbol,
        data=data,
    )

    analysis["providers"] = sorted(
        {
            source.get(
                "provider"
            )
            for source in data.get(
                "sources",
                [],
            )
            if source.get("provider")
        }
    )

    analysis["source_count"] = len(
        data.get(
            "sources",
            [],
        )
    )

    return analysis