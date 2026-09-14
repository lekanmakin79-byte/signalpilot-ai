import pytest

from app.fundamental_normalization import (
    build_currency_fundamental_data,
    country_to_currency,
    normalize_provider_record,
    sort_observations,
)


def test_us_maps_to_usd():
    assert country_to_currency("us") == "USD"


def test_uk_maps_to_gbp():
    assert country_to_currency("uk") == "GBP"


def test_japan_maps_to_jpy():
    assert country_to_currency("japan") == "JPY"


def test_euro_area_maps_to_eur():
    assert country_to_currency("euro_area") == "EUR"


def test_country_mapping_is_case_insensitive():
    assert country_to_currency("US") == "USD"
    assert country_to_currency("UK") == "GBP"


def test_unknown_country_is_rejected():
    with pytest.raises(
        ValueError,
        match="Unsupported fundamental country",
    ):
        country_to_currency("australia")


def test_normalize_provider_record():
    record = {
        "provider": "FRED",
        "country": "us",
        "category": "inflation",
        "observations": [
            {
                "period": "2026-01",
                "value": 2.5,
            },
            {
                "period": "2026-02",
                "value": 2.6,
            },
        ],
        "updated_at": "2026-03-01T00:00:00Z",
        "source_url": "https://example.com",
    }

    result = normalize_provider_record(
        record
    )

    assert result["provider"] == "FRED"
    assert result["country"] == "us"
    assert result["currency"] == "USD"
    assert result["category"] == "inflation"
    assert result["available"] is True
    assert result["latest"]["value"] == 2.6


def test_empty_observations_are_unavailable():
    record = {
        "provider": "FRED",
        "country": "uk",
        "category": "growth",
        "observations": [],
    }

    result = normalize_provider_record(
        record
    )

    assert result["currency"] == "GBP"
    assert result["available"] is False
    assert result["latest"] is None


def test_build_currency_fundamental_data():
    records = [
        {
            "provider": "FRED",
            "country": "us",
            "category": "policy_rate",
            "observations": [
                {
                    "period": "2026-01",
                    "value": 4.0,
                }
            ],
        },
        {
            "provider": "BOE",
            "country": "uk",
            "category": "policy_rate",
            "observations": [
                {
                    "period": "2026-01",
                    "value": 3.75,
                }
            ],
        },
        {
            "provider": "FRED",
            "country": "us",
            "category": "inflation",
            "observations": [
                {
                    "period": "2026-01",
                    "value": 2.5,
                }
            ],
        },
    ]

    result = build_currency_fundamental_data(
        records
    )

    assert (
        result["policy_rates"]["USD"][0]["value"]
        == 4.0
    )

    assert (
        result["policy_rates"]["GBP"][0]["value"]
        == 3.75
    )

    assert (
        result["inflation"]["USD"][0]["value"]
        == 2.5
    )

    assert len(result["sources"]) == 3


def test_unknown_category_is_not_assigned():
    records = [
        {
            "provider": "FRED",
            "country": "us",
            "category": "unknown_metric",
            "observations": [
                {
                    "period": "2026-01",
                    "value": 10.0,
                }
            ],
        }
    ]

    result = build_currency_fundamental_data(
        records
    )

    assert result["policy_rates"] == {}
    assert result["inflation"] == {}
    assert result["growth"] == {}
    assert result["employment"] == {}
    assert result["sources"] == []


def test_sort_observations():
    observations = [
        {
            "period": "2026-03",
            "value": 3.0,
        },
        {
            "period": "2026-01",
            "value": 1.0,
        },
        {
            "period": "2026-02",
            "value": 2.0,
        },
    ]

    result = sort_observations(
        observations
    )

    assert [
        item["value"]
        for item in result
    ] == [1.0, 2.0, 3.0]