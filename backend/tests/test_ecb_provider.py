import asyncio
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.providers.ecb_provider import (
    ECB_DEPOSIT_FACILITY_SERIES,
    ECB_MRO_FIXED_RATE_SERIES,
    ECBProviderError,
    _extract_observations,
    get_exchange_rate,
    get_main_refinancing_rate,
    get_policy_rate,
)


def _sample_payload():
    return {
        "structure": {
            "dimensions": {
                "observation": {
                    "values": [
                        {"id": "2026-09-10"},
                        {"id": "2026-09-11"},
                    ]
                }
            }
        },
        "data": [
            {
                "series": {
                    "0:0:0:0:0": {
                        "observations": {
                            "0": [1.1650],
                            "1": [1.1670],
                        }
                    }
                }
            }
        ],
    }


def _policy_rate_payload():
    return {
        "structure": {
            "dimensions": {
                "observation": {
                    "values": [
                        {"id": "2026-09-10"},
                        {"id": "2026-09-11"},
                    ]
                }
            }
        },
        "dataSets": [
            {
                "series": {
                    "0:0:0:0:0:0:0": {
                        "observations": {
                            "0": [2.00],
                            "1": [2.00],
                        }
                    }
                }
            }
        ],
    }


def test_ecb_provider_normalises_exchange_rate_data():
    observations = _extract_observations(
        _sample_payload()
    )

    assert observations == [
        {
            "period": "2026-09-10",
            "value": 1.165,
        },
        {
            "period": "2026-09-11",
            "value": 1.167,
        },
    ]


def test_ecb_provider_normalises_observation_list():
    payload = {
        "structure": {
            "dimensions": [
                {
                    "id": "observation",
                    "values": [
                        {"id": "2026-09-10"},
                        {"id": "2026-09-11"},
                    ],
                }
            ]
        },
        "dataSets": [
            {
                "series": {
                    "0": {
                        "observations": {
                            "0": [2.0],
                            "1": [2.25],
                        }
                    }
                }
            }
        ],
    }

    observations = _extract_observations(
        payload
    )

    assert observations[-1]["value"] == 2.25


def test_ecb_provider_maps_http_failure():
    request = httpx.Request(
        "GET",
        "https://data-api.ecb.europa.eu/service/data",
    )

    response = httpx.Response(
        500,
        request=request,
    )

    with patch(
        "app.providers.ecb_provider.httpx.AsyncClient.get",
        new=AsyncMock(return_value=response),
    ):
        with pytest.raises(
            ECBProviderError,
            match="HTTP 500",
        ):
            asyncio.run(
                get_exchange_rate("USD")
            )


def test_ecb_provider_maps_network_failure():
    with patch(
        "app.providers.ecb_provider.httpx.AsyncClient.get",
        new=AsyncMock(
            side_effect=httpx.ConnectError(
                "connection failed"
            )
        ),
    ):
        with pytest.raises(
            ECBProviderError,
            match="ECB request failed",
        ):
            asyncio.run(
                get_exchange_rate("USD")
            )


def test_ecb_provider_rejects_empty_currency():
    with pytest.raises(
        ValueError,
        match="currency must not be empty",
    ):
        asyncio.run(
            get_exchange_rate("")
        )


def test_ecb_provider_rejects_invalid_observation_limit():
    with pytest.raises(
        ValueError,
        match="last_n_observations",
    ):
        asyncio.run(
            get_exchange_rate(
                "USD",
                last_n_observations=0,
            )
        )


def test_ecb_provider_policy_rate_uses_verified_series():
    with patch(
        "app.providers.ecb_provider.httpx.AsyncClient.get",
        new=AsyncMock(
            return_value=httpx.Response(
                200,
                json=_policy_rate_payload(),
                request=httpx.Request(
                    "GET",
                    "https://data-api.ecb.europa.eu/service/data",
                ),
            )
        ),
    ):
        result = asyncio.run(
            get_policy_rate()
        )

    assert (
        result["series"]
        == ECB_DEPOSIT_FACILITY_SERIES
    )

    assert result["provider"] == (
        "European Central Bank"
    )

    assert result["factor"] == "policy_rate"
    assert result["policy_rate_type"] == (
        "deposit_facility"
    )
    assert result["currency"] == "EUR"
    assert result["unit"] == "percent"

    assert result["latest"]["value"] == 2.0


def test_ecb_provider_mro_uses_verified_series():
    with patch(
        "app.providers.ecb_provider.httpx.AsyncClient.get",
        new=AsyncMock(
            return_value=httpx.Response(
                200,
                json=_policy_rate_payload(),
                request=httpx.Request(
                    "GET",
                    "https://data-api.ecb.europa.eu/service/data",
                ),
            )
        ),
    ):
        result = asyncio.run(
            get_main_refinancing_rate()
        )

    assert (
        result["series"]
        == ECB_MRO_FIXED_RATE_SERIES
    )

    assert result["provider"] == (
        "European Central Bank"
    )

    assert result["factor"] == "policy_rate"

    assert result["policy_rate_type"] == (
        "main_refinancing_operations"
    )

    assert result["currency"] == "EUR"
    assert result["unit"] == "percent"


def test_ecb_provider_policy_rate_requires_data():
    empty_payload = {
        "structure": {
            "dimensions": {
                "observation": {
                    "values": []
                }
            }
        },
        "dataSets": [],
    }

    with patch(
        "app.providers.ecb_provider.httpx.AsyncClient.get",
        new=AsyncMock(
            return_value=httpx.Response(
                200,
                json=empty_payload,
                request=httpx.Request(
                    "GET",
                    "https://data-api.ecb.europa.eu/service/data",
                ),
            )
        ),
    ):
        with pytest.raises(
            ECBProviderError,
            match="no usable observations",
        ):
            asyncio.run(
                get_policy_rate()
            )


def test_ecb_provider_mro_requires_data():
    empty_payload = {
        "structure": {
            "dimensions": {
                "observation": {
                    "values": []
                }
            }
        },
        "dataSets": [],
    }

    with patch(
        "app.providers.ecb_provider.httpx.AsyncClient.get",
        new=AsyncMock(
            return_value=httpx.Response(
                200,
                json=empty_payload,
                request=httpx.Request(
                    "GET",
                    "https://data-api.ecb.europa.eu/service/data",
                ),
            )
        ),
    ):
        with pytest.raises(
            ECBProviderError,
            match="no usable observations",
        ):
            asyncio.run(
                get_main_refinancing_rate()
            )