from app.trading_engine import (
    TradingDecisionConfig,
    evaluate_trading_decision,
)


def make_signal(
    direction="UP",
    confidence=80.0,
    quality_score=85.0,
    risk_level="LOWER",
):
    return {
        "symbol": "EUR/USD",
        "timeframe": "5m",
        "direction": direction,
        "confidence": confidence,
        "quality_score": quality_score,
        "risk_level": risk_level,
    }


def test_approves_valid_buy_signal():
    result = evaluate_trading_decision(
        make_signal(),
    )

    assert result.approved is True
    assert result.action == "BUY"
    assert result.reason == (
        "Signal passed all configured paper-trading rules."
    )


def test_approves_valid_sell_signal():
    result = evaluate_trading_decision(
        make_signal(direction="DOWN"),
    )

    assert result.approved is True
    assert result.action == "SELL"


def test_approves_moderate_risk_signal():
    result = evaluate_trading_decision(
        make_signal(risk_level="MODERATE"),
    )

    assert result.approved is True
    assert result.action == "BUY"


def test_rejects_elevated_risk_signal():
    result = evaluate_trading_decision(
        make_signal(risk_level="ELEVATED"),
    )

    assert result.approved is False
    assert result.action == "HOLD"
    assert (
        result.reason
        == (
            "Signal risk level is not permitted by the "
            "trading configuration."
        )
    )


def test_rejects_unknown_risk_level():
    result = evaluate_trading_decision(
        make_signal(risk_level="HIGH"),
    )

    assert result.approved is False
    assert result.action == "HOLD"
    assert (
        result.reason
        == (
            "Signal risk level is not permitted by the "
            "trading configuration."
        )
    )


def test_rejects_low_confidence():
    result = evaluate_trading_decision(
        make_signal(confidence=69.9),
    )

    assert result.approved is False
    assert result.action == "HOLD"
    assert (
        result.reason
        == "Signal confidence is below the configured minimum."
    )


def test_rejects_low_quality():
    result = evaluate_trading_decision(
        make_signal(quality_score=69.9),
    )

    assert result.approved is False
    assert result.action == "HOLD"
    assert (
        result.reason
        == "Signal quality is below the configured minimum."
    )


def test_rejects_unknown_direction():
    result = evaluate_trading_decision(
        make_signal(direction="NEUTRAL"),
    )

    assert result.approved is False
    assert result.action == "HOLD"
    assert (
        result.reason
        == "Signal direction is not tradable."
    )


def test_can_disable_long_trades():
    config = TradingDecisionConfig(
        allow_long=False,
    )

    result = evaluate_trading_decision(
        make_signal(direction="UP"),
        config=config,
    )

    assert result.approved is False
    assert result.action == "HOLD"
    assert result.reason == "Long trades are disabled."


def test_can_disable_short_trades():
    config = TradingDecisionConfig(
        allow_short=False,
    )

    result = evaluate_trading_decision(
        make_signal(direction="DOWN"),
        config=config,
    )

    assert result.approved is False
    assert result.action == "HOLD"
    assert result.reason == "Short trades are disabled."


def test_rejects_when_maximum_open_positions_reached():
    config = TradingDecisionConfig(
        maximum_open_positions=3,
    )

    result = evaluate_trading_decision(
        make_signal(),
        open_position_count=3,
        config=config,
    )

    assert result.approved is False
    assert result.action == "HOLD"
    assert (
        result.reason
        == (
            "Maximum number of open paper positions has "
            "been reached."
        )
    )


def test_allows_trade_below_maximum_open_positions():
    config = TradingDecisionConfig(
        maximum_open_positions=3,
    )

    result = evaluate_trading_decision(
        make_signal(),
        open_position_count=2,
        config=config,
    )

    assert result.approved is True
    assert result.action == "BUY"


def test_custom_thresholds_are_respected():
    config = TradingDecisionConfig(
        minimum_confidence=85.0,
        minimum_quality=90.0,
    )

    result = evaluate_trading_decision(
        make_signal(
            confidence=84.9,
            quality_score=95.0,
        ),
        config=config,
    )

    assert result.approved is False
    assert result.action == "HOLD"


def test_quality_can_be_read_from_nested_signal_quality():
    signal = {
        "symbol": "EUR/USD",
        "timeframe": "5m",
        "direction": "UP",
        "confidence": 80.0,
        "quality": {
            "score": 85.0,
        },
        "risk_level": "LOWER",
    }

    result = evaluate_trading_decision(signal)

    assert result.approved is True
    assert result.action == "BUY"
    assert result.quality_score == 85.0