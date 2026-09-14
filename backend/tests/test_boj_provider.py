from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.providers.boj_provider import (
    BOJProviderError,
    get_time_series,
)


def make_response(
    payload: dict,
) -> httpx.Response:
    request = httpx.Request(
        "GET",
        "https://www.stat-search.boj.or.jp/"
        "api/v1/getDataCode",
    )

    return httpx.Response(
        200,
        json=payload,
        request=request,
    )


def test_boj_provider_rejects_empty_database():
    with pytest.raises(
        ValueError,
        match="database is required",
    ):
        import asyncio

        asyncio.run(
            get_time_series(
                database="",
                series_code="TEST001",
            )
        )


def test_boj_provider_rejects_empty_series_code():
    with pytest.raises(
        ValueError,
        match="series code is required",
    ):
        import asyncio

        asyncio.run(
            get_time_series(
                database="TEST",
                series_code="",
            )
        )


def test_boj_provider_normalises_series_data():
    payload = {
        "data": [
            {
                "period": "2026-01",
                "value": "0.25",
            },
            {
                "period": "2026-02",
                "value": "0.50",
            },
        ]
    }

    response = make_response(
        payload
    )

    with patch(
        "app.providers.boj_provider.httpx.AsyncClient.get",
        new=AsyncMock(
            return_value=response
        ),
    ):
        import asyncio

        result = asyncio.run(
            get_time_series(
                database="TEST",
                series_code="TEST001",
                start_date="202601",
                end_date="202602",
            )
        )

    assert (
        result["provider"]
        == "Bank of Japan"
    )

    assert result["database"] == "TEST"
    assert result["series"] == "TEST001"
    assert result["available"] is True

    assert len(
        result["observations"]
    ) == 2

    assert (
        result["latest"]["value"]
        == 0.50
    )

    assert (
        result["observations"][0]["period"]
        == "2026-01"
    )


def test_boj_provider_maps_http_failure():
    request = httpx.Request(
        "GET",
        "https://www.stat-search.boj.or.jp/",
    )

    response = httpx.Response(
        500,
        request=request,
    )

    with patch(
        "app.providers.boj_provider.httpx.AsyncClient.get",
        new=AsyncMock(
            return_value=response
        ),
    ):
        import asyncio

        with pytest.raises(
            BOJProviderError,
            match="HTTP 500",
        ):
            asyncio.run(
                get_time_series(
                    database="TEST",
                    series_code="TEST001",
                )
            )


def test_boj_provider_rejects_invalid_json():
    request = httpx.Request(
        "GET",
        "https://www.stat-search.boj.or.jp/",
    )

    response = httpx.Response(
        200,
        text="not-json",
        request=request,
    )

    with patch(
        "app.providers.boj_provider.httpx.AsyncClient.get",
        new=AsyncMock(
            return_value=response
        ),
    ):
        import asyncio

        with pytest.raises(
            BOJProviderError,
            match="invalid JSON",
        ):
            asyncio.run(
                get_time_series(
                    database="TEST",
                    series_code="TEST001",
                )
            )