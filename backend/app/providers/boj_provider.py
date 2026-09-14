from __future__ import annotations

from typing import Any

import httpx


BOJ_BASE_URL = (
    "https://www.stat-search.boj.or.jp/api/v1/getDataCode"
)


class BOJProviderError(RuntimeError):
    """Raised when the Bank of Japan provider cannot return data."""


def _parse_date(value: Any) -> str | None:
    if value is None:
        return None

    text = str(value).strip()

    if len(text) == 8 and text.isdigit():
        return (
            f"{text[0:4]}-"
            f"{text[4:6]}-"
            f"{text[6:8]}"
        )

    return text or None


def _parse_observations(
    payload: dict[str, Any],
) -> list[dict[str, Any]]:
    observations: list[dict[str, Any]] = []

    # ---------------------------------------------------------
    # Real Bank of Japan API format
    #
    # RESULTSET[
    #   {
    #       "VALUES": {
    #           "SURVEY_DATES": [...],
    #           "VALUES": [...]
    #       }
    #   }
    # ]
    # ---------------------------------------------------------
    result_sets = payload.get("RESULTSET", [])

    if isinstance(result_sets, list):
        for result in result_sets:
            if not isinstance(result, dict):
                continue

            values = result.get("VALUES")

            if not isinstance(values, dict):
                continue

            survey_dates = values.get(
                "SURVEY_DATES",
                [],
            )

            series_values = values.get(
                "VALUES",
                [],
            )

            if not isinstance(
                survey_dates,
                list,
            ):
                continue

            if not isinstance(
                series_values,
                list,
            ):
                continue

            for period, value in zip(
                survey_dates,
                series_values,
            ):
                normalized_period = _parse_date(
                    period
                )

                if normalized_period is None:
                    continue

                if value is None:
                    continue

                try:
                    numeric_value = float(value)
                except (TypeError, ValueError):
                    continue

                observations.append(
                    {
                        "period": normalized_period,
                        "value": numeric_value,
                    }
                )

    # ---------------------------------------------------------
    # Backward-compatible unit-test format
    #
    # {
    #     "data": [
    #         {
    #             "period": "...",
    #             "value": "..."
    #         }
    #     ]
    # }
    # ---------------------------------------------------------
    data = payload.get("data", [])

    if isinstance(data, list):
        for item in data:
            if not isinstance(item, dict):
                continue

            period = (
                item.get("period")
                or item.get("date")
                or item.get("time")
                or item.get("TIME")
                or item.get("TIME_PERIOD")
                or item.get("timePeriod")
            )

            value = (
                item.get("value")
                if "value" in item
                else item.get("VALUE")
            )

            if value is None:
                value = item.get("OBS_VALUE")

            normalized_period = _parse_date(
                period
            )

            if normalized_period is None:
                continue

            if value is None:
                continue

            try:
                numeric_value = float(value)
            except (TypeError, ValueError):
                continue

            observations.append(
                {
                    "period": normalized_period,
                    "value": numeric_value,
                }
            )

    observations.sort(
        key=lambda item: item["period"]
    )

    # Remove duplicate periods while preserving
    # the final occurrence.
    deduplicated: dict[
        str,
        dict[str, Any],
    ] = {}

    for observation in observations:
        deduplicated[
            observation["period"]
        ] = observation

    return [
        deduplicated[period]
        for period in sorted(deduplicated)
    ]


async def get_time_series(
    database: str,
    series_code: str,
    start_date: str = "202501",
    end_date: str | None = None,
) -> dict[str, Any]:
    if not database or not database.strip():
        raise ValueError(
            "database is required"
        )

    if not series_code or not series_code.strip():
        raise ValueError(
            "series code is required"
        )

    params = {
        "format": "json",
        "lang": "en",
        "db": database,
        "code": series_code,
        "startDate": start_date,
    }

    if end_date:
        params["endDate"] = end_date

    headers = {
        "User-Agent": (
            "SignalPilot-AI/1.0 "
            "(market-intelligence research application)"
        ),
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(
            timeout=20,
            follow_redirects=True,
        ) as client:
            response = await client.get(
                BOJ_BASE_URL,
                params=params,
                headers=headers,
            )
    except httpx.HTTPError as error:
        raise BOJProviderError(
            f"Bank of Japan provider request failed: {error}"
        ) from error

    if response.status_code != 200:
        raise BOJProviderError(
            "Bank of Japan provider returned "
            f"HTTP {response.status_code}: "
            f"{response.text[:500]}"
        )

    try:
        payload = response.json()
    except ValueError as error:
        raise BOJProviderError(
            "Bank of Japan returned invalid JSON."
        ) from error

    if not isinstance(payload, dict):
        raise BOJProviderError(
            "Bank of Japan returned an unexpected "
            "JSON response."
        )

    observations = _parse_observations(
        payload
    )

    if not observations:
        raise BOJProviderError(
            "Bank of Japan returned no observations."
        )

    latest = observations[-1]

    return {
        "provider": "Bank of Japan",
        "database": database,
        "series": series_code,
        "available": True,
        "observations": observations,
        "latest": latest,
        "updated_at": str(
            payload.get("DATE")
            or latest["period"]
        ),
        "source_url": BOJ_BASE_URL,
    }