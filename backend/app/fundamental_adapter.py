from __future__ import annotations

from .fundamental_series import (
    BOE_SERIES,
    BOJ_SERIES,
    ECB_SERIES,
    FRED_SERIES,
    MARKET_FUNDAMENTAL_SERIES,
)


def build_provider_requests(
    symbol: str,
) -> dict:
    """
    Build the verified provider requests required for
    one SignalPilot market.

    This function only describes what data is required.
    It does not make network requests.
    """

    symbol = symbol.strip().upper()

    if symbol not in MARKET_FUNDAMENTAL_SERIES:
        raise ValueError(
            f"Unsupported fundamental market: {symbol}"
        )

    configuration = (
        MARKET_FUNDAMENTAL_SERIES[symbol]
    )

    requests = {
        "market": symbol,
        "fred": [],
        "ecb": [],
        "boe": [],
        "boj": [],
    }

    base = configuration["base"]
    quote = configuration["quote"]

    if base == "us" or quote == "us":
        us_series = FRED_SERIES["us"]

        for category, series_id in us_series.items():
            requests["fred"].append(
                {
                    "country": "us",
                    "category": category,
                    "series_id": series_id,
                }
            )

    if base == "uk" or quote == "uk":
        uk_series = FRED_SERIES["uk"]

        for category, series_id in uk_series.items():
            requests["fred"].append(
                {
                    "country": "uk",
                    "category": category,
                    "series_id": series_id,
                }
            )

        requests["boe"].append(
            {
                "category": "policy_rate",
                "series_id": BOE_SERIES[
                    "policy_rate"
                ],
            }
        )

    if base == "japan" or quote == "japan":
        japan_series = FRED_SERIES["japan"]

        for category, series_id in japan_series.items():
            requests["fred"].append(
                {
                    "country": "japan",
                    "category": category,
                    "series_id": series_id,
                }
            )

        requests["boj"].append(
            {
                "database": BOJ_SERIES[
                    "policy_rate"
                ]["database"],
                "series_id": BOJ_SERIES[
                    "policy_rate"
                ]["series"],
                "category": "policy_rate",
            }
        )

    if base == "euro_area" or quote == "euro_area":
        requests["ecb"].append(
            {
                "category": "policy_rate",
                "series": ECB_SERIES[
                    "deposit_facility_rate"
                ],
            }
        )

        requests["fred"].append(
            {
                "country": "euro_area",
                "category": "growth",
                "series_id": FRED_SERIES[
                    "euro_area"
                ]["growth"],
            }
        )

    return requests


def normalize_provider_response(
    provider: str,
    category: str,
    country: str,
    payload: dict,
) -> dict:
    """
    Convert a provider response into the normalized
    structure consumed by the market fundamental engine.

    No economic interpretation is performed here.
    """

    provider = provider.strip()

    observations = payload.get(
        "observations",
        [],
    )

    if not isinstance(
        observations,
        list,
    ):
        observations = []

    normalized = {
        "provider": provider,
        "country": country,
        "category": category,
        "available": bool(
            observations
        ),
        "observations": observations,
        "latest": (
            observations[-1]
            if observations
            else None
        ),
        "updated_at": payload.get(
            "updated_at"
        ),
        "source_url": payload.get(
            "source_url"
        ),
    }

    return normalized


def build_normalized_fundamental_data(
    provider_records: list[dict],
) -> dict:
    """
    Assemble normalized provider records into the
    structure expected by market_fundamentals.py.
    """

    result = {
        "policy_rates": {},
        "inflation": {},
        "growth": {},
        "employment": {},
        "sources": [],
    }

    for record in provider_records:
        if not isinstance(
            record,
            dict,
        ):
            continue

        country = str(
            record.get(
                "country",
                "",
            )
        ).lower()

        category = str(
            record.get(
                "category",
                "",
            )
        ).lower()

        observations = record.get(
            "observations",
            [],
        )

        if not country or not observations:
            continue

        if category == "policy_rate":
            result[
                "policy_rates"
            ].setdefault(
                country,
                [],
            ).extend(
                observations
            )

        elif category == "inflation":
            result[
                "inflation"
            ].setdefault(
                country,
                [],
            ).extend(
                observations
            )

        elif category == "growth":
            result[
                "growth"
            ].setdefault(
                country,
                [],
            ).extend(
                observations
            )

        elif category == "employment":
            result[
                "employment"
            ].setdefault(
                country,
                [],
            ).extend(
                observations
            )

        source = {
            "provider": record.get(
                "provider"
            ),
            "country": country,
            "category": category,
            "source_url": record.get(
                "source_url"
            ),
            "updated_at": record.get(
                "updated_at"
            ),
        }

        result["sources"].append(
            source
        )

    return result