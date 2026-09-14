from unittest.mock import AsyncMock, patch

from app.providers.boe_provider import (
    BOE_BASE_URL,
    BANK_RATE_SERIES,
    get_bank_rate,
)


class MockResponse:
    def __init__(
        self,
        text: str,
        status_code: int = 200,
    ):
        self.text = text
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(
                f"HTTP {self.status_code}"
            )


def make_response(
    text: str,
    status_code: int = 200,
) -> MockResponse:
    return MockResponse(
        text=text,
        status_code=status_code,
    )


def test_boe_provider_normalises_bank_rate_data():
    xml = """
    <Root>
        <Series Code="YWMB47D">
            <OBSERVATION
                OBS_DATE="2026-01-01"
                OBS_VALUE="4.00"
            />
            <OBSERVATION
                OBS_DATE="2026-02-01"
                OBS_VALUE="3.75"
            />
        </Series>
    </Root>
    """

    response = make_response(xml)

    with patch(
        "app.providers.boe_provider.httpx.AsyncClient.get",
        new=AsyncMock(
            return_value=response
        ),
    ):
        import asyncio

        result = asyncio.run(
            get_bank_rate(
                last_n_observations=2
            )
        )

    assert (
        result["provider"]
        == "Bank of England"
    )

    assert (
        result["series"]
        == "IUDBEDR"
    )

    assert (
        result["available"]
        is True
    )

    assert (
        result["observations"]
        == [
            {
                "period": "2026-01-01",
                "value": 4.00,
            },
            {
                "period": "2026-02-01",
                "value": 3.75,
            },
        ]
    )

    assert (
        result["latest"]
        == {
            "period": "2026-02-01",
            "value": 3.75,
        }
    )

    assert (
        result["updated_at"]
        == "2026-02-01"
    )


def test_boe_provider_rejects_invalid_observation_limit():
    import asyncio

    try:
        asyncio.run(
            get_bank_rate(
                last_n_observations=0
            )
        )
    except ValueError as error:
        assert (
            str(error)
            == "last_n_observations must be at least 1"
        )
    else:
        raise AssertionError(
            "Expected ValueError"
        )


def test_boe_provider_parses_real_time_attribute():
    xml = """
    <Root>
        <Series Code="IUDBEDR">
            <Cube
                TIME="2026-09-10"
                OBS_VALUE="4.00"
            />
            <Cube
                TIME="2026-09-11"
                OBS_VALUE="3.75"
            />
        </Series>
    </Root>
    """

    response = make_response(xml)

    with patch(
        "app.providers.boe_provider.httpx.AsyncClient.get",
        new=AsyncMock(
            return_value=response
        ),
    ):
        import asyncio

        result = asyncio.run(
            get_bank_rate(
                last_n_observations=2
            )
        )

    assert (
        result["observations"]
        == [
            {
                "period": "2026-09-10",
                "value": 4.00,
            },
            {
                "period": "2026-09-11",
                "value": 3.75,
            },
        ]
    )


def test_boe_provider_rejects_invalid_xml():
    xml = "<Root><Broken>"

    response = make_response(xml)

    with patch(
        "app.providers.boe_provider.httpx.AsyncClient.get",
        new=AsyncMock(
            return_value=response
        ),
    ):
        import asyncio

        try:
            asyncio.run(
                get_bank_rate()
            )
        except RuntimeError as error:
            assert (
                "invalid XML"
                in str(error)
            )
        else:
            raise AssertionError(
                "Expected BOEProviderError"
            )


def test_boe_provider_rejects_empty_observations():
    xml = """
    <Root>
        <Series Code="IUDBEDR">
            <Cube TIME="2026-09-10" />
        </Series>
    </Root>
    """

    response = make_response(xml)

    with patch(
        "app.providers.boe_provider.httpx.AsyncClient.get",
        new=AsyncMock(
            return_value=response
        ),
    ):
        import asyncio

        try:
            asyncio.run(
                get_bank_rate()
            )
        except RuntimeError as error:
            assert (
                "no Bank Rate observations"
                in str(error)
            )
        else:
            raise AssertionError(
                "Expected BOEProviderError"
            )


def test_boe_provider_handles_http_error():
    response = make_response(
        "Forbidden",
        status_code=403,
    )

    with patch(
        "app.providers.boe_provider.httpx.AsyncClient.get",
        new=AsyncMock(
            return_value=response
        ),
    ):
        import asyncio

        try:
            asyncio.run(
                get_bank_rate()
            )
        except RuntimeError as error:
            assert (
                "HTTP 403"
                in str(error)
            )
        else:
            raise AssertionError(
                "Expected BOEProviderError"
            )