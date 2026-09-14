import json

import httpx

from .config import settings


GROQ_CHAT_COMPLETIONS_URL = (
    "https://api.groq.com/openai/v1/chat/completions"
)


SYSTEM_PROMPT = """
You are the AI interpretation layer for SignalPilot AI, a market
intelligence and research application.

Interpret ONLY the market-intelligence evidence supplied to you.

The supplied evidence may contain:
- technical market analysis
- signal quality
- comparative market ranking
- opportunity scoring
- fundamental economic analysis
- fundamental factors
- policy-rate information
- inflation information
- growth information
- descriptive data analytics
- diagnostic data analytics
- predictive analytical baselines
- prescriptive analytical recommendations

IMPORTANT RULES:

1. Use ONLY information supplied in the market analysis.
2. Do not invent prices, indicators, economic values, events, news,
   probabilities, providers, or external information.
3. Do not browse for or assume information that is not supplied.
4. The confidence value is a model-confidence score, NOT a calibrated
   probability of a future outcome.
5. Fundamental scores and biases describe the supplied analytical
   evidence. They are not guarantees of future market movement.
6. Predictive analytics are analytical baselines based on supplied
   historical data. They are not guaranteed forecasts.
7. Prescriptive analytics are evidence-based analytical observations,
   not trading instructions.
8. Never describe a market condition or trade as safe, very safe,
   risk-free, or likely to succeed.
9. A lower analytical risk classification does not mean that losses
   cannot occur.
10. Do not provide instructions to buy, sell, enter, exit, short, go long,
    use leverage, or place a trade.
11. Do not make guarantees.
12. RSI interpretation MUST follow these exact rules:
    - RSI below 30 may be described as oversold.
    - RSI above 70 may be described as overbought.
    - RSI from 30 through 70 MUST NOT be described as oversold.
    - RSI from 30 through 70 MUST NOT be described as overbought.
    - An RSI between 30 and 70 may be described as relatively weak,
      relatively strong, below the midpoint, above the midpoint, or
      neutral only when supported by the supplied value.
    - Never infer a reversal or continuation guarantee from RSI.
13. Low volatility describes recent price movement and does not mean that
    a future move will be decisive.
14. Clearly distinguish technical, fundamental, descriptive, diagnostic,
    predictive, and prescriptive evidence when relevant.
15. If fundamental analysis is unavailable, do not invent fundamental
    conclusions. State that the fundamental layer is unavailable.
16. If one of the four data-analytics layers is unavailable or empty,
    do not invent a conclusion from it.
17. Clearly explain uncertainty and limitations.
18. Keep the response concise, factual, and educational.
19. Return valid JSON only.
20. The JSON must contain all seven requested fields.
21. Use plain ASCII punctuation only.
22. Use normal hyphens (-), not typographic dashes or smart quotes.
"""


def _build_prompt(
    analysis: dict,
) -> str:
    rsi_value = (
        analysis.get("indicators", {})
        .get("rsi14")
    )

    if isinstance(rsi_value, (int, float)):
        if rsi_value < 30:
            rsi_instruction = (
                f"RSI14 is {rsi_value:.2f}. "
                "This value is below 30 and may be described as "
                "oversold. Do not imply that a reversal is guaranteed."
            )
        elif rsi_value > 70:
            rsi_instruction = (
                f"RSI14 is {rsi_value:.2f}. "
                "This value is above 70 and may be described as "
                "overbought. Do not imply that a reversal is guaranteed."
            )
        else:
            rsi_instruction = (
                f"RSI14 is {rsi_value:.2f}. "
                "This value is between 30 and 70. "
                "It MUST NOT be described as oversold or overbought. "
                "It may be described as relatively weak, relatively "
                "strong, below the midpoint, above the midpoint, or "
                "neutral only when supported by the value."
            )
    else:
        rsi_instruction = (
            "RSI14 is unavailable or not numeric. "
            "Do not make an oversold or overbought claim."
        )

    return f"""
Interpret this supplied SignalPilot AI market-intelligence analysis:

{json.dumps(analysis, indent=2)}

The analysis may contain technical, quality, ranking, opportunity,
fundamental, and four-layer data-analytics evidence.

The four data-analytics layers are:
- descriptive: what has happened in the supplied data
- diagnostic: what patterns or conditions are evident in the supplied data
- predictive: analytical baseline derived from the supplied historical data
- prescriptive: evidence-based analytical observation about the supplied
  conditions

Do not treat predictive analytics as guaranteed forecasts.
Do not treat prescriptive analytics as trading instructions.
Do not invent missing fundamental information.

RSI INTERPRETATION CONSTRAINT:

{rsi_instruction}

The RSI constraint above is mandatory. Do not contradict it.

Return ONE valid JSON object containing exactly these seven fields:

{{
  "summary": "Overall market-intelligence assessment.",
  "market_view": "Current analytical direction and supporting conditions.",
  "evidence": [
    "Evidence point 1.",
    "Evidence point 2.",
    "Evidence point 3."
  ],
  "uncertainty": "Limitations, conflicts, or reasons the assessment may change.",
  "risk_commentary": "Explanation of the supplied analytical risk classification without calling it safe or implying a probability of success.",
  "confidence_note": "Explain that the confidence score is a model-confidence measure and is not a calibrated probability.",
  "educational_note": "Explain that market conditions can change and technical, fundamental, and data analytics do not guarantee future results."
}}

ALL SEVEN FIELDS ARE REQUIRED.

Field requirements:

summary:
Give a concise overall interpretation using only supplied evidence.

market_view:
Describe the current quantitative direction and supporting conditions.
Where useful, distinguish between technical and fundamental evidence.

evidence:
Provide 3 to 5 points directly supported by the supplied analysis.
Evidence may come from technical, quality, ranking, opportunity,
fundamental, descriptive, diagnostic, predictive, or prescriptive data.

Do not describe RSI as oversold unless RSI is below 30.
Do not describe RSI as overbought unless RSI is above 70.
If RSI is between 30 and 70, explicitly avoid both labels.

uncertainty:
Explain limitations, conflicts, unavailable data, or conditions that
could change the assessment.
If there is no major indicator conflict, say so while still acknowledging
that market conditions can change.

risk_commentary:
Explain the supplied risk classification.
Do not call anything safe or risk-free.
Do not imply that lower risk means a higher chance of profit.

confidence_note:
State that the confidence value is a model-confidence score and not a
calibrated probability of a specific future outcome.

educational_note:
State that market conditions can change and current or historical
technical analysis, fundamental analysis, and data analytics do not
guarantee future price behavior.

Do not provide trading instructions.

Use plain ASCII punctuation only.
Use normal hyphens (-).
Do not use en dashes, em dashes, non-breaking hyphens, smart quotes,
or other typographic punctuation.
"""


def _sanitize_text(
    value: str,
) -> str:
    """
    Convert Unicode punctuation and common mojibake into
    predictable plain ASCII text.
    """

    replacements = {
        "Ã¢â‚¬â€œ": "-",
        "Ã¢â‚¬â€": "-",
        "Ã¢â‚¬â€˜": "-",
        "Ã¢â‚¬â€™": "-",
        "Ã¢â‚¬Ëœ": "'",
        "Ã¢â‚¬â„¢": "'",
        "Ã¢â‚¬Å“": '"',
        "Ã¢â‚¬\x9d": '"',
        "Ã¢â‚¬Â¦": "...",
        "Ã‚ ": " ",
        "Ã‚": "",

        "\u2010": "-",
        "\u2011": "-",
        "\u2012": "-",
        "\u2013": "-",
        "\u2014": "-",
        "\u2015": "-",
        "\u2212": "-",

        "\u2018": "'",
        "\u2019": "'",
        "\u201a": "'",
        "\u201b": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u201e": '"',
        "\u201f": '"',

        "\u2026": "...",
        "\u00a0": " ",
    }

    cleaned = value

    for old, new in replacements.items():
        cleaned = cleaned.replace(old, new)

    cleaned = cleaned.encode(
        "ascii",
        errors="ignore",
    ).decode(
        "ascii",
    )

    return cleaned


def _sanitize_interpretation(
    interpretation: dict,
) -> dict:
    """
    Sanitize all AI-generated text fields so the frontend
    receives predictable plain ASCII punctuation.
    """

    result = {}

    for key, value in interpretation.items():
        if isinstance(value, str):
            result[key] = _sanitize_text(value)

        elif isinstance(value, list):
            result[key] = [
                _sanitize_text(item)
                if isinstance(item, str)
                else item
                for item in value
            ]

        else:
            result[key] = value

    return result


def _default_interpretation(
    analysis: dict,
) -> dict:
    direction = analysis.get(
        "direction",
        "NEUTRAL",
    )

    confidence = analysis.get(
        "confidence",
        0,
    )

    risk = analysis.get(
        "risk",
        {},
    )

    risk_level = risk.get(
        "risk_level",
        "UNSPECIFIED",
    )

    fundamental = analysis.get(
        "fundamental",
        {},
    )

    fundamental_status = fundamental.get(
        "status",
        "unavailable",
    )

    fundamental_bias = fundamental.get(
        "bias",
        "NEUTRAL",
    )

    if fundamental_status == "available":
        fundamental_evidence = (
            f"Supplied fundamental analysis currently has a "
            f"{fundamental_bias} bias."
        )
    else:
        fundamental_evidence = (
            "Fundamental analysis is currently unavailable."
        )

    return {
        "summary": (
            "The market-intelligence analysis indicates a "
            f"{direction.lower()} directional bias with "
            f"a model-confidence score of {confidence}."
        ),
        "market_view": (
            "The current analytical direction is supported by "
            "the supplied quantitative indicators. "
            f"{fundamental_evidence}"
        ),
        "evidence": [
            "The supplied trend indicators support the current analytical direction.",
            "The supplied momentum indicators contribute to the current directional assessment.",
            "The supplied volatility measurement describes the current market movement conditions.",
        ],
        "uncertainty": (
            "The assessment is based only on the supplied market "
            "intelligence and may change as new market data becomes "
            "available."
        ),
        "risk_commentary": (
            f"The quantitative engine classifies the current analytical "
            f"risk level as {risk_level}. This classification reflects "
            "the measured indicators and does not imply that future "
            "price movement is predictable or that losses cannot occur."
        ),
        "confidence_note": (
            f"The confidence value of {confidence} is a model-confidence "
            "score and does not represent a calibrated probability of "
            "a specific future outcome."
        ),
        "educational_note": (
            "Market conditions can change rapidly, and current or "
            "historical technical analysis, fundamental analysis, and "
            "data analytics do not guarantee future price behavior."
        ),
    }


def _normalise_interpretation(
    interpretation: dict,
    analysis: dict,
) -> dict:
    fallback = _default_interpretation(
        analysis,
    )

    result = {}

    for field in [
        "summary",
        "market_view",
        "uncertainty",
        "risk_commentary",
        "confidence_note",
        "educational_note",
    ]:
        value = interpretation.get(field)

        if isinstance(value, str) and value.strip():
            result[field] = value.strip()
        else:
            result[field] = fallback[field]

    evidence = interpretation.get("evidence")

    if isinstance(evidence, list):
        valid_evidence = [
            item.strip()
            for item in evidence
            if isinstance(item, str)
            and item.strip()
        ]
    else:
        valid_evidence = []

    if valid_evidence:
        result["evidence"] = valid_evidence[:5]
    else:
        result["evidence"] = fallback["evidence"]

    return _sanitize_interpretation(
        result,
    )


async def interpret_analysis(
    analysis: dict,
) -> dict:
    """
    Generate a structured AI interpretation of an existing
    market-intelligence analysis.
    """

    if not settings.groq_api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not configured."
        )

    payload = {
        "model": settings.groq_model,
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": _build_prompt(analysis),
            },
        ],
        "temperature": 0.2,
        "reasoning_effort": "low",
        "response_format": {
            "type": "json_object",
        },
    }

    headers = {
        "Authorization": (
            f"Bearer {settings.groq_api_key}"
        ),
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            GROQ_CHAT_COMPLETIONS_URL,
            headers=headers,
            json=payload,
        )

    if response.status_code != 200:
        raise RuntimeError(
            "Groq API request failed: "
            f"{response.status_code} {response.text}"
        )

    try:
        response_data = response.json()
    except ValueError as error:
        raise RuntimeError(
            "Groq returned an invalid JSON response."
        ) from error

    choices = response_data.get("choices")

    if not choices:
        raise RuntimeError(
            "Groq response did not contain any choices."
        )

    message = choices[0].get(
        "message",
        {},
    )

    content = message.get(
        "content",
    )

    if not content:
        raise RuntimeError(
            "Groq response did not contain message content."
        )

    try:
        interpretation = json.loads(
            content,
        )
    except json.JSONDecodeError as error:
        raise RuntimeError(
            "Groq returned content that was not valid JSON."
        ) from error

    if not isinstance(
        interpretation,
        dict,
    ):
        raise RuntimeError(
            "Groq response JSON must be an object."
        )

    return _normalise_interpretation(
        interpretation,
        analysis,
    )