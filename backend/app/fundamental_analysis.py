from __future__ import annotations


def build_fundamental_analysis(
    symbol: str,
    data: dict | None = None,
) -> dict:
    """
    Build a normalized fundamental-analysis record.

    Fundamental values must come from a verified external
    provider. This function deliberately does not invent
    economic or macroeconomic values when provider data
    is unavailable.
    """

    data = data or {}

    # If the provider explicitly says available=False,
    # respect that. Otherwise, provider-backed data is
    # considered available when meaningful provider data
    # is present.
    if "available" in data:
        available = bool(data["available"])
    else:
        available = bool(
            data.get("provider")
            or data.get("factors")
            or data.get("score") is not None
        )

    if not available:
        return {
            "symbol": symbol,
            "available": False,
            "status": "DATA_UNAVAILABLE",
            "bias": "NEUTRAL",
            "score": None,
            "factors": [],
            "provider": data.get("provider"),
            "updated_at": data.get("updated_at"),
            "message": (
                data.get("message")
                or (
                    "Fundamental data is not currently "
                    "available from a configured "
                    "macroeconomic data provider."
                )
            ),
            "disclaimer": (
                "Fundamental analysis is an analytical "
                "assessment and is not financial advice."
            ),
        }

    factors = data.get(
        "factors",
        [],
    )

    score = data.get("score")

    if score is not None:
        try:
            score = float(score)
        except (TypeError, ValueError):
            score = None

    if score is None:
        bias = "NEUTRAL"
    elif score > 0:
        bias = "POSITIVE"
    elif score < 0:
        bias = "NEGATIVE"
    else:
        bias = "NEUTRAL"

    return {
        "symbol": symbol,
        "available": True,
        "status": "AVAILABLE",
        "bias": bias,
        "score": score,
        "factors": factors,
        "provider": data.get("provider"),
        "updated_at": data.get("updated_at"),
        "disclaimer": (
            "Fundamental analysis is an analytical "
            "assessment and is not financial advice."
        ),
    }