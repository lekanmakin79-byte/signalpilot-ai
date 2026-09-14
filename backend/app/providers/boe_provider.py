from __future__ import annotations

import xml.etree.ElementTree as ET
from typing import Any

import httpx


BOE_BASE_URL = (
    "https://www.bankofengland.co.uk/"
    "boeapps/database/_iadb-fromshowcolumns.asp"
)

BANK_RATE_SERIES = "IUDBEDR"


class BOEProviderError(RuntimeError):
    """Raised when the Bank of England provider cannot return data."""


def _parse_observations(xml_text: str) -> list[dict[str, Any]]:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as error:
        raise BOEProviderError(
            f"Bank of England returned invalid XML: {error}"
        ) from error

    observations: list[dict[str, Any]] = []

    for element in root.iter():
        period = (
            element.attrib.get("TIME")
            or element.attrib.get("OBS_DATE")
        )

        value = element.attrib.get("OBS_VALUE")

        if not period or value is None:
            continue

        try:
            numeric_value = float(value)
        except (TypeError, ValueError):
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


async def get_bank_rate(
    last_n_observations: int = 10,
) -> dict[str, Any]:
    if last_n_observations < 1:
        raise ValueError(
            "last_n_observations must be at least 1"
        )

    params = {
        "CodeVer": "new",
        "xml.x": "yes",
        "Datefrom": "01/Jan/2000",
        "Dateto": "now",
        "SeriesCodes": BANK_RATE_SERIES,
        "UsingCodes": "Y",
        "VPD": "Y",
        "VFD": "N",
    }

    headers = {
        "User-Agent": (
            "SignalPilot-AI/1.0 "
            "(market-intelligence research application)"
        ),
        "Accept": (
            "application/xml,text/xml,"
            "application/xhtml+xml,*/*"
        ),
    }

    try:
        async with httpx.AsyncClient(
            timeout=20,
            follow_redirects=True,
        ) as client:
            response = await client.get(
                BOE_BASE_URL,
                params=params,
                headers=headers,
            )
    except httpx.HTTPError as error:
        raise BOEProviderError(
            f"Bank of England provider request failed: {error}"
        ) from error

    if response.status_code != 200:
        raise BOEProviderError(
            "Bank of England provider returned "
            f"HTTP {response.status_code}: "
            f"{response.text[:500]}"
        )

    observations = _parse_observations(
        response.text
    )

    if not observations:
        raise BOEProviderError(
            "Bank of England returned no "
            "Bank Rate observations."
        )

    observations = observations[
        -last_n_observations:
    ]

    latest = observations[-1]

    return {
        "provider": "Bank of England",
        "series": BANK_RATE_SERIES,
        "available": True,
        "observations": observations,
        "latest": latest,
        "updated_at": latest["period"],
        "source_url": BOE_BASE_URL,
    }