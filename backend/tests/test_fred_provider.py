from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.providers.fred_provider import (
    FREDProviderError,
    get_series_observations,
)


def make_response(
    payload: dict,
) -> httpx.Response:
    request = httpx.Request(
        "GET",
        "https://api.stlouisfed.org/fred/"
        "series/observations",
    )

    return httpx.Response(
        200,
        json=payload,
        request=request,
    )


def test_fred_provider_rejects_empty_series_id():
    with pytest.raises(
        ValueError,
        match="series ID is required",
    ):
        import asyncio

        asyncio.run(
            get_series_observations("")
        )


def test_fred_provider_rejects_invalid_limit():
    with pytest.raises(
        ValueError,
        match="at least 1",
    ):
        import asyncio

        asyncio.run(
            get_series_observations(
                "FEDFUNDS",
                limit=0,
            )
        )


def test_fred_provider_requires_api_key():
    with patch(
        "app.providers.fred_provider.settings.fred_api_key",
        "",
    ):
        import asyncio

        with pytest.raises(
            FREDProviderError,
            match="API key is not configured",
        ):
            asyncio.run(
                get_series_observations(
                    "FEDFUNDS"
                )
            )


def test_fred_provider_normalises_observations():
    payload = {
        "observations": [
            {
                "date": "2026-01-01",
                "value": "3.64",
            },
            {
                "date": "2026-02-01",
                "value": ".",
            },
            {
                "date": "2026-03-01",
                "value": "3.65",
            },
        ]
    }

    response = make_response(
        payload
    )

    with patch(
        "app.providers.fred_provider.settings.fred_api_key",
        "test-api-key",
    ), patch(
        "app.providers.fred_provider.httpx.AsyncClient.get",
        new=AsyncMock(
            return_value=response
        ),
    ):
        import asyncio

        result = asyncio.run(
            get_series_observations(
                "FEDFUNDS",
                limit=2,
            )
        )

    assert result["provider"] == "FRED"
    assert result["series"] == "FEDFUNDS"
    assert result["available"] is True

    assert len(
        result["observations"]
    ) == 2

    assert (
        result["observations"][0]["period"]
        == "2026-01-01"
    )

    assert (
        result["observations"][0]["value"]
        == 3.64
    )

    assert (
        result["latest"]["value"]
        == 3.65
    )


def test_fred_provider_maps_http_failure():
    request = httpx.Request(
        "GET",
        "https://api.stlouisfed.org/fred/"
        "series/observations",
    )

    response = httpx.Response(
        500,
        request=request,
    )

    with patch(
        "app.providers.fred_provider.settings.fred_api_key",
        "test-api-key",
    ), patch(
        "app.providers.fred_provider.httpx.AsyncClient.get",
        new=AsyncMock(
            return_value=response
        ),
    ):
        import asyncio

        with pytest.raises(
            FREDProviderError,
            match="HTTP 500",
        ):
            asyncio.run(
                get_series_observations(
                    "FEDFUNDS"
                )
            )


def test_fred_provider_rejects_invalid_json():
    request = httpx.Request(
        "GET",
        "https://api.stlouisfed.org/fred/"
        "series/observations",
    )

    response = httpx.Response(
        200,
        text="not-json",
        request=request,
    )

    with patch(
        "app.providers.fred_provider.settings.fred_api_key",
        "test-api-key",
    ), patch(
        "app.providers.fred_provider.httpx.AsyncClient.get",
        new=AsyncMock(
            return_value=response
        ),
    ):
        import asyncio

        with pytest.raises(
            FREDProviderError,
            match="invalid JSON",
        ):
            asyncio.run(
                get_series_observations(
                    "FEDFUNDS"
                )
            )