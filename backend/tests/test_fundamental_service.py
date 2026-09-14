import asyncio

from app import fundamental_service


def test_collect_fundamental_records_isolates_provider_failure(
    monkeypatch,
):
    async def fake_fred(request):
        return {
            "provider": "FRED",
            "country": request["country"],
            "category": request["category"],
            "observations": [
                {
                    "period": "2026-01-01",
                    "value": 3.0,
                },
                {
                    "period": "2026-02-01",
                    "value": 3.1,
                },
            ],
            "updated_at": "2026-02-01",
            "source_url": "fred-test",
        }

    async def fake_ecb(request):
        return {
            "provider": "European Central Bank",
            "country": "euro_area",
            "category": "policy_rate",
            "observations": [
                {
                    "period": "2026-01-01",
                    "value": 2.0,
                },
            ],
            "updated_at": "2026-01-01",
            "source_url": "ecb-test",
        }

    async def fake_boe(request):
        return None

    async def fake_boj(request):
        return None

    monkeypatch.setattr(
        fundamental_service,
        "_get_fred_record",
        fake_fred,
    )

    monkeypatch.setattr(
        fundamental_service,
        "_get_ecb_record",
        fake_ecb,
    )

    monkeypatch.setattr(
        fundamental_service,
        "_get_boe_record",
        fake_boe,
    )

    monkeypatch.setattr(
        fundamental_service,
        "_get_boj_record",
        fake_boj,
    )

    records = asyncio.run(
        fundamental_service.collect_fundamental_records(
            "EUR/USD"
        )
    )

    assert len(records) >= 1

    assert any(
        record["provider"] == "FRED"
        for record in records
    )

    assert any(
        record["provider"]
        == "European Central Bank"
        for record in records
    )


def test_currency_fundamental_data_normalizes_currencies(
    monkeypatch,
):
    async def fake_collect(symbol):
        return [
            {
                "provider": "FRED",
                "country": "us",
                "category": "growth",
                "observations": [
                    {
                        "period": "2026-01-01",
                        "value": 1.0,
                    },
                    {
                        "period": "2026-04-01",
                        "value": 1.5,
                    },
                ],
                "updated_at": "2026-04-01",
                "source_url": "fred-test",
            },
            {
                "provider": "European Central Bank",
                "country": "euro_area",
                "category": "policy_rate",
                "observations": [
                    {
                        "period": "2026-06-01",
                        "value": 2.0,
                    },
                ],
                "updated_at": "2026-06-01",
                "source_url": "ecb-test",
            },
        ]

    monkeypatch.setattr(
        fundamental_service,
        "collect_fundamental_records",
        fake_collect,
    )

    data = asyncio.run(
        fundamental_service.get_currency_fundamental_data(
            "EUR/USD"
        )
    )

    assert "USD" in data["growth"]
    assert "EUR" in data["policy_rates"]

    assert (
        data["growth"]["USD"][-1]["value"]
        == 1.5
    )

    assert (
        data["policy_rates"]["EUR"][-1]["value"]
        == 2.0
    )


def test_market_fundamental_analysis_uses_normalized_data(
    monkeypatch,
):
    async def fake_data(symbol):
        return {
            "policy_rates": {
                "EUR": [
                    {
                        "period": "2026-01-01",
                        "value": 2.0,
                    }
                ],
                "USD": [
                    {
                        "period": "2026-01-01",
                        "value": 4.0,
                    }
                ],
            },
            "inflation": {},
            "growth": {},
            "employment": {},
            "sources": [
                {
                    "provider": "FRED",
                    "country": "us",
                    "currency": "USD",
                    "category": "growth",
                    "updated_at": "2026-01-01",
                    "source_url": "test",
                }
            ],
        }

    monkeypatch.setattr(
        fundamental_service,
        "get_currency_fundamental_data",
        fake_data,
    )

    result = asyncio.run(
        fundamental_service.get_market_fundamental_analysis(
            "EUR/USD"
        )
    )

    assert result["symbol"] == "EUR/USD"
    assert result["available"] is True
    assert result["factor_count"] == 1
    assert result["score"] == -100.0
    assert result["bias"] == "NEGATIVE"
    assert result["source_count"] == 1
    assert result["providers"] == ["FRED"]