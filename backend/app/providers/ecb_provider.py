from __future__ import annotations

from typing import Any

import httpx


ECB_BASE_URL = "https://data-api.ecb.europa.eu/service"

ECB_DEPOSIT_FACILITY_SERIES = (
    "B.U2.EUR.4F.KR.DFR.LEV"
)

ECB_MRO_FIXED_RATE_SERIES = (
    "B.U2.EUR.4F.KR.MRR_FR.LEV"
)


class ECBProviderError(RuntimeError):
    """Raised when the ECB provider cannot return usable data."""


def _extract_observations(
    payload: dict[str, Any],
) -> list[dict[str, Any]]:
    """
    Extract normalized observations from ECB SDMX-JSON.

    Supports:
    - ECB dataSets responses
    - legacy/test data responses
    - dictionary/list dimension structures
    - indexed ECB observation arrays
    """

    structure = payload.get("structure") or {}
    dimensions = structure.get("dimensions") or {}

    observation_dimension: Any = None

    if isinstance(dimensions, dict):
        observation_dimension = dimensions.get(
            "observation"
        )

    elif isinstance(dimensions, list):
        for dimension in dimensions:
            if not isinstance(dimension, dict):
                continue

            dimension_id = str(
                dimension.get("id", "")
            ).upper()

            if dimension_id in {
                "TIME_PERIOD",
                "TIME",
                "OBSERVATION",
                "PERIOD",
            }:
                observation_dimension = dimension
                break

    # ECB SDMX-JSON normally returns:
    #
    # "observation": [
    #     {
    #         "id": "TIME_PERIOD",
    #         "values": [...]
    #     }
    # ]
    #
    # Unwrap that structure first.
    if (
        isinstance(observation_dimension, list)
        and observation_dimension
        and all(
            isinstance(item, dict)
            for item in observation_dimension
        )
    ):
        for dimension in observation_dimension:
            dimension_id = str(
                dimension.get("id", "")
            ).upper()

            if dimension_id in {
                "TIME_PERIOD",
                "TIME",
                "OBSERVATION",
                "PERIOD",
            }:
                observation_dimension = dimension
                break

    if isinstance(
        observation_dimension,
        dict,
    ):
        time_values = observation_dimension.get(
            "values",
            [],
        )

    elif isinstance(
        observation_dimension,
        list,
    ):
        time_values = observation_dimension

    else:
        time_values = []

    if not isinstance(time_values, list):
        time_values = []

    periods: list[str] = []

    for value in time_values:
        if isinstance(value, dict):
            period = value.get("id")

            if period is None:
                period = value.get("name")
        else:
            period = value

        if period is not None:
            periods.append(str(period))

    datasets = payload.get("dataSets")

    if datasets is None:
        datasets = payload.get("data")

    if not isinstance(datasets, list):
        return []

    observations: list[dict[str, Any]] = []

    for dataset in datasets:
        if not isinstance(dataset, dict):
            continue

        series_container = dataset.get(
            "series"
        )

        if not isinstance(
            series_container,
            dict,
        ):
            continue

        for series in series_container.values():
            if not isinstance(series, dict):
                continue

            series_observations = series.get(
                "observations"
            )

            if not isinstance(
                series_observations,
                dict,
            ):
                continue

            for index, observation in (
                series_observations.items()
            ):
                try:
                    observation_index = int(index)
                except (
                    TypeError,
                    ValueError,
                ):
                    continue

                if (
                    observation_index < 0
                    or observation_index >= len(periods)
                ):
                    continue

                if isinstance(
                    observation,
                    list,
                ):
                    if not observation:
                        continue

                    value = observation[0]

                elif isinstance(
                    observation,
                    dict,
                ):
                    value = observation.get(
                        "value"
                    )

                else:
                    value = observation

                if value is None:
                    continue

                try:
                    numeric_value = float(value)
                except (
                    TypeError,
                    ValueError,
                ):
                    continue

                period = periods[
                    observation_index
                ]

                if period in {
                    "TIME_PERIOD",
                    "TIME",
                    "OBSERVATION",
                    "PERIOD",
                }:
                    continue

                observations.append(
                    {
                        "period": period,
                        "value": numeric_value,
                    }
                )

    observations.sort(
        key=lambda item: item["period"]
    )

    return observations


async def _get_series(
    series_key: str,
    last_n_observations: int = 10,
) -> dict[str, Any]:
    """
    Retrieve one ECB FM time series.
    """

    if last_n_observations < 1:
        raise ValueError(
            "last_n_observations must be at least 1"
        )

    url = f"{ECB_BASE_URL}/data/FM/{series_key}"


    params = {
        "format": "jsondata",
    }

    headers = {
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(
            timeout=20.0
        ) as client:
            response = await client.get(
                url,
                params=params,
                headers=headers,
            )
    except httpx.HTTPError as error:
        raise ECBProviderError(
            f"ECB request failed: {error}"
        ) from error

    if response.status_code >= 400:
        raise ECBProviderError(
            f"ECB HTTP {response.status_code}: "
            f"{response.text[:1000]}"
        )

    try:
        payload = response.json()
    except ValueError as error:
        raise ECBProviderError(
            "ECB returned invalid JSON."
        ) from error

    observations = _extract_observations(
        payload
    )

    if not observations:
        raise ECBProviderError(
            "ECB returned no usable observations."
        )

    observations = observations[
        -last_n_observations:
    ]

    return {
        "provider": "European Central Bank",
        "series": series_key,
        "available": True,
        "observations": observations,
        "latest": observations[-1],
        "updated_at": observations[-1]["period"],
        "source_url": url,
    }


async def _get_exchange_rate_series(
    series_key: str,
    last_n_observations: int = 10,
) -> dict[str, Any]:
    """
    Retrieve an ECB exchange-rate series.
    """

    if last_n_observations < 1:
        raise ValueError(
            "last_n_observations must be at least 1"
        )

    url = (
        f"{ECB_BASE_URL}/data/EXR/"
        f"{series_key}"
    )

    params = {
        "format": "jsondata",
    }

    headers = {
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(
            timeout=20.0
        ) as client:
            response = await client.get(
                url,
                params=params,
                headers=headers,
            )
    except httpx.HTTPError as error:
        raise ECBProviderError(
            f"ECB request failed: {error}"
        ) from error

    if response.status_code >= 400:
        raise ECBProviderError(
            f"ECB HTTP {response.status_code}: "
            f"{response.text[:1000]}"
        )

    try:
        payload = response.json()
    except ValueError as error:
        raise ECBProviderError(
            "ECB returned invalid JSON."
        ) from error

    observations = _extract_observations(
        payload
    )

    if not observations:
        raise ECBProviderError(
            "ECB returned no usable observations."
        )

    observations = observations[
        -last_n_observations:
    ]

    return {
        "provider": "European Central Bank",
        "series": series_key,
        "available": True,
        "observations": observations,
        "latest": observations[-1],
        "updated_at": observations[-1]["period"],
        "source_url": url,
    }


async def get_exchange_rate(
    currency: str,
    last_n_observations: int = 10,
) -> dict[str, Any]:
    """
    Retrieve ECB euro reference exchange-rate observations.
    """

    currency = currency.upper().strip()

    if not currency:
        raise ValueError(
            "currency must not be empty"
        )

    series_key = (
        f"D.{currency}.EUR.SP00.A"
    )

    data = await _get_exchange_rate_series(
        series_key=series_key,
        last_n_observations=last_n_observations,
    )

    data["currency"] = currency
    data["unit"] = (
        f"{currency} per EUR"
    )

    return data


async def get_policy_rate(
    last_n_observations: int = 10,
) -> dict[str, Any]:
    """
    Retrieve the ECB Deposit Facility Rate.
    """

    data = await _get_series(
        series_key=ECB_DEPOSIT_FACILITY_SERIES,
        last_n_observations=last_n_observations,
    )

    data.update(
        {
            "factor": "policy_rate",
            "policy_rate_type": (
                "deposit_facility"
            ),
            "currency": "EUR",
            "unit": "percent",
        }
    )

    return data


async def get_main_refinancing_rate(
    last_n_observations: int = 10,
) -> dict[str, Any]:
    """
    Retrieve the ECB Main Refinancing Operations
    fixed-rate tender series.
    """

    data = await _get_series(
        series_key=ECB_MRO_FIXED_RATE_SERIES,
        last_n_observations=last_n_observations,
    )

    data.update(
        {
            "factor": "policy_rate",
            "policy_rate_type": (
                "main_refinancing_operations"
            ),
            "currency": "EUR",
            "unit": "percent",
        }
    )

    return data
