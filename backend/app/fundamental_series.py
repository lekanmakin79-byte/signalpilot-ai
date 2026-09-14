from __future__ import annotations


FRED_SERIES = {
    "us": {
        "policy_rate": "FEDFUNDS",
        "inflation": "CPIAUCSL",
        "growth": "GDPC1",
    },
    "uk": {
        "inflation": "GBRCPIALLMINMEI",
        "growth": "GBRRGDPQDSNAQ",
    },
    "japan": {
    "growth": "JPNRGDPEXP",
    },
    "euro_area": {
        "growth": "CLVMNACSCAB1GQEA",
    },
}


ECB_SERIES = {
    "deposit_facility_rate": {
        "dataset": "FM",
        "description": "ECB deposit facility rate",
    },
    "main_refinancing_rate": {
        "dataset": "FM",
        "description": "ECB main refinancing operations rate",
    },
}


BOE_SERIES = {
    "policy_rate": "IUDBEDR",
}


BOJ_SERIES = {
    "policy_rate": {
        "database": "FM01",
        "series": "STRDCLUCON",
        "description": (
            "Uncollateralized Overnight Call Rate, "
            "Average (Daily)"
        ),
    },
}


MARKET_FUNDAMENTAL_SERIES = {
    "EUR/USD": {
        "base": "euro_area",
        "quote": "us",
        "policy_sources": [
            "ECB",
            "FRED",
        ],
        "factors": [
            "policy_rate_differential",
            "inflation",
            "growth",
        ],
    },
    "GBP/USD": {
        "base": "uk",
        "quote": "us",
        "policy_sources": [
            "BOE",
            "FRED",
        ],
        "factors": [
            "policy_rate_differential",
            "inflation",
            "growth",
        ],
    },
    "USD/JPY": {
        "base": "us",
        "quote": "japan",
        "policy_sources": [
            "FRED",
            "BOJ",
        ],
        "factors": [
            "policy_rate_differential",
            "inflation",
            "growth",
        ],
    },
    "XAU/USD": {
        "base": "us",
        "quote": "gold",
        "policy_sources": [
            "FRED",
        ],
        "factors": [
            "us_policy_rate",
            "us_inflation",
            "us_growth",
        ],
    },
}