import pytest

from app.risk_engine import (
    RiskConfig,
    calculate_risk_assessment,
)


def test_calculates_buy_risk_parameters():
    result = calculate_risk_assessment(
        symbol="EUR/USD",
        side="BUY",
        account_balance=10_000.0,
        entry_price=1.1000,
        atr14=0.0100,
    )

    assert result.approved is True
    assert result.risk_amount == pytest.approx(100.0)
    assert result.stop_distance == pytest.approx(0.015)
    assert result.quantity == pytest.approx(6666.66666667)
    assert result.notional_value == pytest.approx(7333.33333333)
    assert result.stop_loss == pytest.approx(1.085)
    assert result.take_profit == pytest.approx(1.13)


def test_calculates_sell_risk_parameters():
    result = calculate_risk_assessment(
        symbol="EUR/USD",
        side="SELL",
        account_balance=10_000.0,
        entry_price=1.1000,
        atr14=0.0100,
    )

    assert result.approved is True
    assert result.stop_loss == pytest.approx(1.115)
    assert result.take_profit == pytest.approx(1.07)


def test_calculates_usd_jpy_position_sizing():
    result = calculate_risk_assessment(
        symbol="USD/JPY",
        side="BUY",
        account_balance=10_000.0,
        entry_price=150.0,
        atr14=1.0,
    )

    assert result.approved is True
    assert result.risk_amount == pytest.approx(100.0)
    assert result.stop_distance == pytest.approx(1.5)
    assert result.quantity == pytest.approx(10000.0)
    assert result.notional_value == pytest.approx(10000.0)


def test_rejects_missing_atr():
    result = calculate_risk_assessment(
        symbol="EUR/USD",
        side="BUY",
        account_balance=10_000.0,
        entry_price=1.1000,
        atr14=None,
    )

    assert result.approved is False
    assert result.quantity == 0.0


def test_rejects_invalid_side():
    result = calculate_risk_assessment(
        symbol="EUR/USD",
        side="HOLD",
        account_balance=10_000.0,
        entry_price=1.1000,
        atr14=0.0100,
    )

    assert result.approved is False
    assert result.reason == "Trade side must be BUY or SELL."


def test_rejects_zero_balance():
    result = calculate_risk_assessment(
        symbol="EUR/USD",
        side="BUY",
        account_balance=0.0,
        entry_price=1.1000,
        atr14=0.0100,
    )

    assert result.approved is False


def test_custom_risk_configuration_is_respected():
    config = RiskConfig(
        risk_percent=2.0,
        stop_loss_atr_multiplier=2.0,
        reward_risk_ratio=3.0,
        max_position_exposure_percent=200.0,
    )

    result = calculate_risk_assessment(
        symbol="EUR/USD",
        side="BUY",
        account_balance=10_000.0,
        entry_price=1.1000,
        atr14=0.0100,
        config=config,
    )

    assert result.approved is True
    assert result.risk_amount == pytest.approx(200.0)
    assert result.stop_distance == pytest.approx(0.02)
    assert result.quantity == pytest.approx(10000.0)
    assert result.notional_value == pytest.approx(11000.0)
    assert result.stop_loss == pytest.approx(1.08)
    assert result.take_profit == pytest.approx(1.16)


def test_caps_position_exposure_instead_of_rejecting():
    config = RiskConfig(
        max_position_exposure_percent=1.0,
    )

    result = calculate_risk_assessment(
        symbol="EUR/USD",
        side="BUY",
        account_balance=10_000.0,
        entry_price=1.1000,
        atr14=0.0001,
        config=config,
    )

    assert result.approved is True
    assert result.notional_value == pytest.approx(100.0)
    assert result.quantity == pytest.approx(90.90909091)
    assert result.risk_amount == pytest.approx(0.01363636)
    assert result.stop_distance == pytest.approx(0.00015)
    assert result.stop_loss == pytest.approx(1.09985)
    assert result.take_profit == pytest.approx(1.1003)


def test_caps_small_atr_eur_usd_position_to_account_exposure():
    result = calculate_risk_assessment(
        symbol="EUR/USD",
        side="BUY",
        account_balance=10_000.0,
        entry_price=1.14864,
        atr14=0.00007,
    )

    assert result.approved is True
    assert result.notional_value == pytest.approx(10_000.0)

    expected_quantity = 10_000.0 / 1.14864

    assert result.quantity == pytest.approx(
        expected_quantity,
        rel=1e-10,
    )

    expected_risk_amount = round(
        result.quantity * result.stop_distance,
        8,
    )

    assert result.risk_amount == pytest.approx(
        expected_risk_amount,
        rel=1e-10,
    )

    assert result.stop_distance == pytest.approx(0.000105)
    assert result.stop_loss == pytest.approx(1.148535)
    assert result.take_profit == pytest.approx(1.14885)


def test_rejects_unsupported_currency_relationship():
    result = calculate_risk_assessment(
        symbol="GBP/JPY",
        side="BUY",
        account_balance=10_000.0,
        entry_price=200.0,
        atr14=1.0,
    )

    assert result.approved is False
    assert (
        result.reason
        == (
            "Position sizing for this currency relationship "
            "is not supported by Paper Trading v1."
        )
    )