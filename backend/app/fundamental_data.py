from __future__ import annotations


async def get_fundamental_data(
    symbol: str,
) -> dict:
    """
    Return provider-backed fundamental data when configured.

    Until a verified macroeconomic provider is connected,
    return an explicit unavailable state rather than
    fabricating economic values.
    """

    return {
        "symbol": symbol,
        "available": False,
        "provider": None,
        "factors": [],
        "score": None,
        "message": (
            "No fundamental-data provider is currently configured."
        ),
    }