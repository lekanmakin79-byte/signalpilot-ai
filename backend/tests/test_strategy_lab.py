from app.strategy_lab import (
    MINIMUM_CANDLES,
    calculate_compounded_return,
    calculate_max_drawdown,
    calculate_outcome,
    run_backtest,
    validate_candles,
)


def make_candles(prices):
    candles = []

    for index, price in enumerate(prices):
        candles.append(
            {
                "datetime": f"2026-01-01 00:{index:02d}:00",
                "open": price,
                "high": price,
                "low": price,
                "close": price,
            }
        )

    return candles


def test_minimum_candles_requirement():
    assert MINIMUM_CANDLES == 52


def test_validate_candles_accepts_valid_data():
    prices = [
        1.0 + (index * 0.001)
        for index in range(52)
    ]

    candles = make_candles(prices)

    # validate_candles() is a validator.
    # It returns None when validation succeeds.
    assert validate_candles(candles) is None


def test_validate_candles_rejects_too_few_candles():
    prices = [
        1.0 + (index * 0.001)
        for index in range(51)
    ]

    candles = make_candles(prices)

    try:
        validate_candles(candles)
    except ValueError as error:
        assert "52" in str(error)
    else:
        raise AssertionError(
            "Expected ValueError for insufficient candles."
        )


def test_validate_candles_rejects_invalid_close_price():
    candles = make_candles(
        [
            1.0 + (index * 0.001)
            for index in range(52)
        ]
    )

    candles[-1]["close"] = "invalid"

    try:
        validate_candles(candles)
    except ValueError as error:
        message = str(error).lower()

        assert "close" in message
        assert "numeric" in message
    else:
        raise AssertionError(
            "Expected ValueError for invalid closing price."
        )


def test_calculate_outcome_up_correct():
    outcome, price_change, hypothetical_change = (
        calculate_outcome(
            direction="UP",
            signal_price=100.0,
            evaluation_price=101.0,
        )
    )

    assert outcome == "CORRECT"
    assert price_change == 1.0
    assert hypothetical_change == 1.0


def test_calculate_outcome_up_incorrect():
    outcome, price_change, hypothetical_change = (
        calculate_outcome(
            direction="UP",
            signal_price=100.0,
            evaluation_price=99.0,
        )
    )

    assert outcome == "INCORRECT"
    assert price_change == -1.0
    assert hypothetical_change == -1.0


def test_calculate_outcome_down_correct():
    outcome, price_change, hypothetical_change = (
        calculate_outcome(
            direction="DOWN",
            signal_price=100.0,
            evaluation_price=99.0,
        )
    )

    assert outcome == "CORRECT"
    assert price_change == -1.0
    assert hypothetical_change == 1.0


def test_calculate_outcome_down_incorrect():
    outcome, price_change, hypothetical_change = (
        calculate_outcome(
            direction="DOWN",
            signal_price=100.0,
            evaluation_price=101.0,
        )
    )

    assert outcome == "INCORRECT"
    assert price_change == 1.0
    assert hypothetical_change == -1.0


def test_calculate_outcome_neutral():
    outcome, price_change, hypothetical_change = (
        calculate_outcome(
            direction="NEUTRAL",
            signal_price=100.0,
            evaluation_price=101.0,
        )
    )

    assert outcome == "NEUTRAL"
    assert price_change == 1.0
    assert hypothetical_change == 0.0


def test_calculate_outcome_equal_prices_is_neutral():
    outcome, price_change, hypothetical_change = (
        calculate_outcome(
            direction="UP",
            signal_price=100.0,
            evaluation_price=100.0,
        )
    )

    assert outcome == "NEUTRAL"
    assert price_change == 0.0
    assert hypothetical_change == 0.0


def test_calculate_outcome_invalid_prices_are_neutral():
    outcome, price_change, hypothetical_change = (
        calculate_outcome(
            direction="UP",
            signal_price=0.0,
            evaluation_price=100.0,
        )
    )

    assert outcome == "NEUTRAL"
    assert price_change == 0.0
    assert hypothetical_change == 0.0


def test_compounded_return():
    result = calculate_compounded_return(
        [1.0, 2.0, -1.0]
    )

    expected = (
        (1 + 0.01)
        * (1 + 0.02)
        * (1 - 0.01)
        - 1
    ) * 100

    assert abs(result - expected) < 1e-9


def test_max_drawdown():
    changes = [
        5.0,
        -2.857142857142857,
        5.882352941176471,
        -4.62962962962963,
    ]

    result = calculate_max_drawdown(changes)

    assert abs(result - 4.62963) < 1e-5


def test_max_drawdown_empty_list():
    assert calculate_max_drawdown([]) == 0.0


def test_run_backtest_requires_enough_candles():
    prices = [
        1.0 + (index * 0.001)
        for index in range(51)
    ]

    candles = make_candles(prices)

    try:
        run_backtest(
            symbol="EUR/USD",
            timeframe="5m",
            candles=candles,
            minimum_confidence=0,
        )
    except ValueError as error:
        assert "52" in str(error)
    else:
        raise AssertionError(
            "Expected ValueError for insufficient candles."
        )