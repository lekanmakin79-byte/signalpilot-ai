from __future__ import annotations

from datetime import datetime, timezone

import httpx

from ..config import settings


FRED_BASE_URL = (
    "https://api.stlouisfed.org/fred"
)


class FREDProviderError(RuntimeError):
    """Raised when the FRED provider cannot return valid data."""


async def get_series_observations(
    series_id: str,
    limit: int = 10,
) -> dict:
    """
    Retrieve observations for a FRED economic series.

    FRED requires a registered API key for API access.
    The key is read from SignalPilot configuration and
    is never returned in the response.
    """

    series_id = series_id.strip().upper()

    if not series_id:
        raise ValueError(
            "FRED series ID is required."
        )

    if limit < 1:
        raise ValueError(
            "limit must be at least 1."
        )

    api_key = settings.fred_api_key.strip()

    if not api_key:
        raise FREDProviderError(
            "FRED API key is not configured."
        )

    url = (
        f"{FRED_BASE_URL}/series/"
        "observations"
    )

    params = {
        "series_id": series_id,
        "api_key": api_key,
        "file_type": "json",
        "sort_order": "asc",
    }

    try:
        async with httpx.AsyncClient(
            timeout=15.0
        ) as client:
            response = await client.get(
                url,
                params=params,
            )
    except httpx.HTTPError as error:
        raise FREDProviderError(
            "Unable to connect to the FRED "
            "data provider."
        ) from error

    if response.status_code != 200:
        raise FREDProviderError(
            "FRED provider returned "
            f"HTTP {response.status_code}."
        )

    try:
        payload = response.json()
    except ValueError as error:
        raise FREDProviderError(
            "FRED provider returned invalid JSON."
        ) from error

    observations = _extract_observations(
        payload
    )

    if not observations:
        raise FREDProviderError(
            "FRED returned no usable observations."
        )

    observations = observations[-limit:]

    return {
        "provider": "FRED",
        "series": series_id,
        "available": True,
        "observations": observations,
        "latest": observations[-1],
        "updated_at": datetime.now(
            timezone.utc
        ).isoformat(),
        "source_url": url,
    }


def _extract_observations(
    payload: dict,
) -> list[dict]:
    """
    Convert FRED observations into SignalPilot's
    provider-independent observation format.

    FRED can return '.' for missing observations;
    these are deliberately excluded rather than
    converted into fabricated numeric values.
    """

    raw_observations = payload.get(
        "observations",
        [],
    )

    if not isinstance(
        raw_observations,
        list,
    ):
        return []

    observations = []

    for item in raw_observations:
        if not isinstance(
            item,
            dict,
        ):
            continue

        period = item.get(
            "date"
        )

        raw_value = item.get(
            "value"
        )

        if not period or raw_value in (
            None,
            "",
            ".",
        ):
            continue

        try:
            value = float(
                raw_value
            )
        except (
            TypeError,
            ValueError,
        ):
            continue

        observations.append(
            {
                "period": str(period),
                "value": value,
            }
        )

    observations.sort(
        key=lambda item: item["period"]
    )

    return observations