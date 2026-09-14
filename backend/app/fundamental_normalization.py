from __future__ import annotations


PROVIDER_COUNTRY_TO_CURRENCY = {
    "us": "USD",
    "uk": "GBP",
    "japan": "JPY",
    "euro_area": "EUR",
}


def country_to_currency(country: str) -> str:
    """
    Convert the normalized provider country identifier
    into the currency identifier used by SignalPilot's
    market fundamental engine.
    """

    country = country.strip().lower()

    try:
        return PROVIDER_COUNTRY_TO_CURRENCY[country]
    except KeyError as error:
        raise ValueError(
            f"Unsupported fundamental country: {country}"
        ) from error


def normalize_provider_record(
    record: dict,
) -> dict:
    """
    Convert one provider record into the normalized
    SignalPilot fundamental representation.

    Provider metadata is preserved so the source can
    still be displayed and audited.
    """

    if not isinstance(record, dict):
        raise ValueError(
            "Fundamental provider record must be a dictionary."
        )

    provider = str(
        record.get("provider", "")
    ).strip()

    country = str(
        record.get("country", "")
    ).strip().lower()

    category = str(
        record.get("category", "")
    ).strip().lower()

    observations = record.get(
        "observations",
        [],
    )

    if not provider:
        raise ValueError(
            "Fundamental provider is required."
        )

    if not country:
        raise ValueError(
            "Fundamental country is required."
        )

    if not category:
        raise ValueError(
            "Fundamental category is required."
        )

    currency = country_to_currency(
        country
    )

    if not isinstance(
        observations,
        list,
    ):
        observations = []

    return {
        "provider": provider,
        "country": country,
        "currency": currency,
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
        "updated_at": record.get(
            "updated_at"
        ),
        "source_url": record.get(
            "source_url"
        ),
    }


def build_currency_fundamental_data(
    provider_records: list[dict],
) -> dict:
    """
    Convert provider records into the exact structure
    consumed by market_fundamentals.py.

    Output:

        {
            "policy_rates": {
                "USD": [...],
                "GBP": [...],
                "JPY": [...],
                "EUR": [...]
            },
            "inflation": {...},
            "growth": {...},
            "employment": {...},
            "sources": [...]
        }
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

        normalized = normalize_provider_record(
            record
        )

        currency = normalized[
            "currency"
        ]

        category = normalized[
            "category"
        ]

        observations = normalized[
            "observations"
        ]

        if not observations:
            continue

        if category == "policy_rate":
            target = result[
                "policy_rates"
            ]

        elif category == "inflation":
            target = result[
                "inflation"
            ]

        elif category == "growth":
            target = result[
                "growth"
            ]

        elif category == "employment":
            target = result[
                "employment"
            ]

        else:
            # Unknown categories are deliberately
            # ignored instead of silently assigning
            # them to an unrelated analytical bucket.
            continue

        target.setdefault(
            currency,
            [],
        ).extend(
            observations
        )

        result["sources"].append(
            {
                "provider": normalized[
                    "provider"
                ],
                "country": normalized[
                    "country"
                ],
                "currency": currency,
                "category": category,
                "updated_at": normalized[
                    "updated_at"
                ],
                "source_url": normalized[
                    "source_url"
                ],
            }
        )

    return result


def sort_observations(
    observations: list[dict],
) -> list[dict]:
    """
    Sort normalized observations chronologically.

    Supports the common period/date fields used by
    ECB, BoE, BoJ and FRED adapters.
    """

    def observation_key(
        observation: dict,
    ) -> str:
        return str(
            observation.get(
                "period"
            )
            or observation.get(
                "date"
            )
            or observation.get(
                "time"
            )
            or ""
        )

    return sorted(
        observations,
        key=observation_key,
    )