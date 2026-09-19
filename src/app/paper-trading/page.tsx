"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  XCircle,
  Zap,
} from "lucide-react";

import {
  useCallback,
useEffect,
useMemo,
useRef,
useState,
} from "react";
import { useRouter } from "next/navigation";

import SignalPilotNavigation from "@/components/SignalPilotNavigation";
import {
  autoEvaluatePaperTrade,
  closePaperPosition,
  createPaperTradingAccount,
  executePaperTrade,
  getPaperTradingAccount,
  getPaperTradingOrders,
  getPaperTradingPositions,
  getSignal,
  getTradingControlStatus,
  markPaperPosition,
  startAutomatedTrading,
  stopAutomatedTrading,
  type AutoPaperTradeResponse,
  type PaperOrder,
  type PaperPosition,
  type PaperTradingAccount,
  type SignalResult,
  type TradingControlStatus,
} from "@/lib/signalpilot-api";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";


const MARKET_SYMBOLS = [
  "EUR/USD",
  "GBP/USD",
  "XAU/USD",
  "USD/JPY",
];

const AUTO_REFRESH_INTERVAL_MS = 60_000;


function formatMoney(
  value: number,
  currency = "USD",
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}


function formatPrice(
  value: number | null | undefined,
) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (value >= 1000) {
    return value.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    );
  }

  if (value >= 100) {
    return value.toFixed(2);
  }

  if (value >= 10) {
    return value.toFixed(3);
  }

  return value.toFixed(5);
}


function formatDate(
  value: string | null | undefined,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}


function getPnlClass(value: number) {
  if (value > 0) {
    return "text-emerald-600";
  }

  if (value < 0) {
    return "text-red-600";
  }

  return "text-slate-500";
}


function getSignalLabel(
  signal: SignalResult | null,
) {
  if (!signal) {
    return "No signal";
  }

  if (signal.direction === "UP") {
    return "BUY";
  }

  if (signal.direction === "DOWN") {
    return "SELL";
  }

  return "HOLD";
}


function getSignalClasses(
  signal: SignalResult | null,
) {
  if (!signal) {
    return "bg-slate-100 text-slate-600";
  }

  if (signal.direction === "UP") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (signal.direction === "DOWN") {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}


function getAutoStatusText(
  result: AutoPaperTradeResponse | null,
) {
  if (!result) {
    return "Waiting for evaluation";
  }

  if (result.status === "EXECUTED") {
    return `${result.order?.side || "Trade"} paper trade executed`;
  }

  if (result.status === "SKIPPED_OPEN_POSITION") {
    return "Skipped — position already open";
  }

  return "Signal rejected by trading controls";
}


function getAutoStatusClasses(
  result: AutoPaperTradeResponse | null,
) {
  if (!result) {
    return "bg-slate-100 text-slate-600";
  }

  if (result.status === "EXECUTED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (result.status === "SKIPPED_OPEN_POSITION") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-red-50 text-red-700";
}


export default function PaperTradingPage() {
  const router = useRouter();

  const [
    account,
    setAccount,
  ] = useState<PaperTradingAccount | null>(null);

  const [
    positions,
    setPositions,
  ] = useState<PaperPosition[]>([]);

  const [
    orders,
    setOrders,
  ] = useState<PaperOrder[]>([]);

  const [
    selectedSymbol,
    setSelectedSymbol,
  ] = useState("EUR/USD");

  const [
    signal,
    setSignal,
  ] = useState<SignalResult | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    loadingSignal,
    setLoadingSignal,
  ] = useState(false);

  const [
    executing,
    setExecuting,
  ] = useState(false);

  const [
    autoTrading,
    setAutoTrading,
  ] = useState(false);
  
    const [
    tradingControl,
    setTradingControl,
  ] = useState<TradingControlStatus | null>(null);

  const [
    tradingControlLoading,
    setTradingControlLoading,
  ] = useState(true);

  const [
    tradingControlUpdating,
    setTradingControlUpdating,
  ] = useState(false);

  const [
    autoEvaluating,
    setAutoEvaluating,
  ] = useState(false);
  
  const autoEvaluationInProgressRef =
  useRef(false);

  const [
    autoResult,
    setAutoResult,
  ] = useState<AutoPaperTradeResponse | null>(null);

  const [
    creatingAccount,
    setCreatingAccount,
  ] = useState(false);

  const [
    closingPositionId,
    setClosingPositionId,
  ] = useState<number | null>(null);

  const [
    markingPositionId,
    setMarkingPositionId,
  ] = useState<number | null>(null);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    message,
    setMessage,
  ] = useState<string | null>(null);

  const [
    showCreateAccount,
    setShowCreateAccount,
  ] = useState(false);

  const [
    accountName,
    setAccountName,
  ] = useState("SignalPilot Demo");

  const [
    initialBalance,
    setInitialBalance,
  ] = useState("10000");

  const [
    lastUpdated,
    setLastUpdated,
  ] = useState<Date | null>(null);
  
    const loadTradingControl = useCallback(
    async () => {
      try {
        setTradingControlLoading(true);

        const response =
          await getTradingControlStatus();

        setTradingControl(response);
      } catch (controlError) {
        console.error(
          "Failed to load trading control:",
          controlError,
        );
      } finally {
        setTradingControlLoading(false);
      }
    },
    [],
  );
  
    async function handleTradingControlToggle() {
    setTradingControlUpdating(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        tradingControl?.enabled
          ? await stopAutomatedTrading()
          : await startAutomatedTrading();

      setTradingControl(response);

      if (!response.enabled) {
        setAutoTrading(false);

        setMessage(
          "Kill Switch activated. New automated paper trades are blocked.",
        );
      } else {
        setMessage(
          "Automated paper trading has been restarted.",
        );
      }
    } catch (controlError) {
      console.error(
        "Failed to update trading control:",
        controlError,
      );

      setError(
        controlError instanceof Error
          ? controlError.message
          : "Unable to update the trading control.",
      );
    } finally {
      setTradingControlUpdating(false);
    }
  }


  const loadTradingData = useCallback(
    async (
      accountId: number,
      showSpinner = false,
    ) => {
      if (showSpinner) {
        setRefreshing(true);
      }

      try {
        const [
          accountResponse,
          positionsResponse,
          ordersResponse,
        ] = await Promise.all([
          getPaperTradingAccount(accountId),
          getPaperTradingPositions(accountId),
          getPaperTradingOrders(accountId),
        ]);

        setAccount(accountResponse.account);
        setPositions(positionsResponse.positions);
        setOrders(ordersResponse.orders);
        setError(null);
        setLastUpdated(new Date());

      } catch (loadError) {
        console.error(
          "Failed to load paper trading data:",
          loadError,
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load paper trading data.",
        );

      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );


  const loadSignal = useCallback(
    async (
      symbol: string,
      showSpinner = true,
    ) => {
      if (showSpinner) {
        setLoadingSignal(true);
      }

      try {
        const response = await getSignal(
          symbol,
          "5m",
          100,
        );

        setSignal(response.signal);
        setError(null);
        setLastUpdated(new Date());

      } catch (signalError) {
        console.error(
          "Failed to load signal:",
          signalError,
        );

        setSignal(null);

        setError(
          signalError instanceof Error
            ? signalError.message
            : "Unable to load the market signal.",
        );

      } finally {
        if (showSpinner) {
          setLoadingSignal(false);
        }
      }
    },
    [],
  );


  const evaluateAutomatically = useCallback(
  async (
    accountId: number,
    symbol: string,
    showSpinner = false,
  ) => {
    if (autoEvaluationInProgressRef.current) {
      return;
    }

    autoEvaluationInProgressRef.current = true;

    if (showSpinner) {
      setAutoEvaluating(true);
    }

    try {
      const response =
        await autoEvaluatePaperTrade(
          accountId,
          symbol,
          "5m",
          100,
        );

      setAutoResult(response);

      if (response.signal) {
        setSignal(response.signal);
      }

      setAccount(response.account);

      setLastUpdated(new Date());

      if (response.status === "EXECUTED") {
        setMessage(
          `${response.order?.side || "Paper"} trade automatically executed for ${symbol}.`,
        );

        await loadTradingData(
          accountId,
          false,
        );
      } else if (
        response.status ===
        "SKIPPED_OPEN_POSITION"
      ) {
        setMessage(
          `${symbol}: automatic evaluation skipped because an open position already exists.`,
        );

        await loadTradingData(
          accountId,
          false,
        );
      } else {
        setMessage(
          `${symbol}: signal evaluated but the trading/risk controls did not approve execution.`,
        );
      }

      setError(null);
    } catch (autoError) {
      console.error(
        "Automatic paper trade evaluation failed:",
        autoError,
      );

      setError(
        autoError instanceof Error
          ? autoError.message
          : "Unable to evaluate the automatic paper trade.",
      );
    } finally {
      autoEvaluationInProgressRef.current = false;

      if (showSpinner) {
        setAutoEvaluating(false);
      }
    }
  },
  [loadTradingData],
);


  useEffect(() => {
    let mounted = true;

    async function initialise() {
      try {
        const supabase =
          createSupabaseBrowserClient();

        const {
          data,
          error: authError,
        } = await supabase.auth.getUser();

        if (!mounted) {
          return;
        }

        if (authError || !data.user) {
          router.replace("/");
          return;
        }
		
		        await loadTradingControl();

        const storedAccountId =
          window.localStorage.getItem(
            "signalpilot-paper-account-id",
          );

        if (storedAccountId) {
          const accountId =
            Number(storedAccountId);

          if (
            Number.isInteger(accountId) &&
            accountId > 0
          ) {
            try {
              await loadTradingData(accountId);

              if (mounted) {
                await loadSignal(
                  selectedSymbol,
                );
              }

              return;
            } catch {
              window.localStorage.removeItem(
                "signalpilot-paper-account-id",
              );
            }
          }
        }

        setLoading(false);
        setShowCreateAccount(true);

        await loadSignal(
          selectedSymbol,
        );

      } catch (initialiseError) {
        console.error(
          "Paper trading initialisation failed:",
          initialiseError,
        );

        if (mounted) {
          setLoading(false);
          setError(
            "Unable to initialise paper trading.",
          );
        }
      }
    }

    initialise();

    return () => {
      mounted = false;
    };
  }, [
    router,
    selectedSymbol,
    loadTradingData,
    loadSignal,
  ]);


  /*
   * Background refresh / automatic paper trading.
   *
   * When Auto Trading is OFF:
   *   - refresh account data
   *   - refresh the selected signal
   *
   * When Auto Trading is ON:
   *   - refresh account data
   *   - ask the backend to evaluate the selected market
   *   - the backend decides whether a paper trade is allowed
   *
   * The backend also prevents duplicate trades when an
   * open position already exists for the same account,
   * symbol and timeframe.
   *
   * The browser tab must remain visible. This avoids
   * unnecessary Twelve Data requests while hidden.
   */
  useEffect(() => {
    if (!account) {
      return;
    }

    const accountId = account.id;

    let active = true;

        async function refreshVisiblePage() {
      if (!active) {
        return;
      }

      if (
        document.visibilityState !==
        "visible"
      ) {
        return;
      }

      try {
        if (autoTrading) {
          if (autoEvaluationInProgressRef.current) {
            return;
          }

          await Promise.all([
            loadTradingData(
              accountId,
              false,
            ),
            evaluateAutomatically(
              accountId,
              selectedSymbol,
              false,
            ),
          ]);
        } else {
          await Promise.all([
            loadTradingData(
              accountId,
              false,
            ),
            loadSignal(
              selectedSymbol,
              false,
            ),
          ]);
        }
      } catch (autoRefreshError) {
        console.error(
          "Paper trading automatic refresh failed:",
          autoRefreshError,
        );
      }
    }

    const intervalId =
      window.setInterval(
        refreshVisiblePage,
        AUTO_REFRESH_INTERVAL_MS,
      );

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refreshVisiblePage();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      active = false;

      window.clearInterval(
        intervalId,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [
    account?.id,
    selectedSymbol,
    autoTrading,
    loadTradingData,
    loadSignal,
	loadTradingControl,
    evaluateAutomatically,
  ]);


  async function handleCreateAccount(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    const balance =
      Number(initialBalance);

    if (
      !Number.isFinite(balance) ||
      balance <= 0
    ) {
      setError(
        "Enter a valid starting balance greater than zero.",
      );
      return;
    }

    setCreatingAccount(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        await createPaperTradingAccount(
          accountName.trim() ||
            "SignalPilot Demo",
          balance,
          "USD",
        );

      const newAccount =
        response.account;

      window.localStorage.setItem(
        "signalpilot-paper-account-id",
        String(newAccount.id),
      );

      setAccount(newAccount);
      setShowCreateAccount(false);

      await loadTradingData(
        newAccount.id,
      );

      setMessage(
        "Paper trading account created successfully.",
      );

    } catch (createError) {
      console.error(
        "Failed to create paper account:",
        createError,
      );

      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create the paper trading account.",
      );

    } finally {
      setCreatingAccount(false);
    }
  }


  async function handleRefresh() {
  if (!account) {
    return;
  }

  if (autoTrading) {
    await Promise.all([
      loadTradingData(
        account.id,
        true,
      ),
      evaluateAutomatically(
        account.id,
        selectedSymbol,
        true,
      ),
    ]);

    return;
  }

  await Promise.all([
    loadTradingData(
      account.id,
      true,
    ),
    loadSignal(
      selectedSymbol,
      true,
    ),
  ]);
}


  async function handleSymbolChange(
    symbol: string,
  ) {
    setSelectedSymbol(symbol);
    setAutoResult(null);

    if (autoTrading && account) {
      await evaluateAutomatically(
        account.id,
        symbol,
        true,
      );
    } else {
      await loadSignal(symbol);
    }
  }


  async function handleToggleAutoTrading() {
    if (!account) {
      return;
    }

    const nextValue =
      !autoTrading;

    setError(null);
    setMessage(null);

    if (!nextValue) {
      setAutoTrading(false);

      setMessage(
        "Auto Trading is now OFF. No automatic paper trades will be submitted.",
      );

      return;
    }

    setAutoTrading(true);
    setAutoResult(null);

    /*
     * Evaluate immediately when Auto Trading is
     * enabled rather than waiting for the first
     * 60-second interval.
     */
    await evaluateAutomatically(
      account.id,
      selectedSymbol,
      true,
    );
  }


  async function handleExecuteTrade() {
    if (!account || !signal) {
      return;
    }

    if (
      signal.direction === "NEUTRAL"
    ) {
      setError(
        "The current signal is HOLD/NEUTRAL. No paper trade will be submitted.",
      );
      return;
    }

    setExecuting(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        await executePaperTrade(
          account.id,
          signal,
          signal.price,
          signal.indicators.atr14,
        );

      if (!response.success) {
        setError(
          response.reason ||
            "The paper trade was not executed.",
        );
        return;
      }

      if (!response.approved) {
        setError(
          response.reason ||
            "The trade was rejected by the trading/risk controls.",
        );
        return;
      }

      setMessage(
        `${getSignalLabel(signal)} paper trade executed for ${signal.symbol}.`,
      );

      await loadTradingData(
        account.id,
        false,
      );

    } catch (tradeError) {
      console.error(
        "Paper trade execution failed:",
        tradeError,
      );

      setError(
        tradeError instanceof Error
          ? tradeError.message
          : "Unable to execute the paper trade.",
      );

    } finally {
      setExecuting(false);
    }
  }


  async function handleMarkPosition(
    position: PaperPosition,
  ) {
    setMarkingPositionId(
      position.id,
    );
    setError(null);

    try {
      const marketSignal =
        await getSignal(
          position.symbol,
          position.timeframe,
          100,
        );

      const response =
        await markPaperPosition(
          position.id,
          marketSignal.signal.price,
        );

      setAccount(response.account);

      setPositions((current) =>
        current.map((item) =>
          item.id === position.id
            ? response.position
            : item,
        ),
      );

      setLastUpdated(new Date());

      setMessage(
        `${position.symbol} position marked to market.`,
      );

    } catch (markError) {
      console.error(
        "Failed to mark position:",
        markError,
      );

      setError(
        markError instanceof Error
          ? markError.message
          : "Unable to update the position.",
      );

    } finally {
      setMarkingPositionId(null);
    }
  }


  async function handleClosePosition(
    position: PaperPosition,
  ) {
    if (
      !window.confirm(
        `Close the ${position.side} ${position.symbol} paper position?`,
      )
    ) {
      return;
    }

    setClosingPositionId(
      position.id,
    );
    setError(null);
    setMessage(null);

    try {
      const marketSignal =
        await getSignal(
          position.symbol,
          position.timeframe,
          100,
        );

      const response =
        await closePaperPosition(
          position.id,
          marketSignal.signal.price,
        );

      setAccount(response.account);

      setPositions((current) =>
        current.filter(
          (item) =>
            item.id !== position.id,
        ),
      );

      await loadTradingData(
        position.account_id,
        false,
      );

      setLastUpdated(new Date());

      setMessage(
        `${position.symbol} position closed. Realised P&L: ${formatMoney(
          response.realised_pnl,
          response.account.currency,
        )}.`,
      );

    } catch (closeError) {
      console.error(
        "Failed to close position:",
        closeError,
      );

      setError(
        closeError instanceof Error
          ? closeError.message
          : "Unable to close the position.",
      );

    } finally {
      setClosingPositionId(null);
    }
  }


  const unrealisedPnl = useMemo(
    () =>
      positions.reduce(
        (
          total,
          position,
        ) =>
          total +
          Number(
            position.unrealised_pnl || 0,
          ),
        0,
      ),
    [positions],
  );

  const totalExposure = useMemo(
    () =>
      positions.reduce(
        (
          total,
          position,
        ) =>
          total +
          Math.abs(
            position.quantity *
              position.current_price,
          ),
        0,
      ),
    [positions],
  );


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SignalPilotNavigation />

        <main className="lg:pl-64">
          <div className="flex min-h-screen items-center justify-center">
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Loading paper trading...
            </div>
          </div>
        </main>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-50">
      <SignalPilotNavigation />

      <main className="lg:pl-64">

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <div className="mb-2 flex flex-wrap items-center gap-2">

                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Simulated Trading
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                  No broker connection
                </span>

                {autoTrading && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                    <Zap className="h-3.5 w-3.5" />
                    Auto Trading Active
                  </span>
                )}

              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Paper Trading
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Test SignalPilot strategies with virtual
                capital and simulated execution.
              </p>

            </div>


            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">

              <div className="text-center text-[11px] text-slate-400 sm:text-right">
                <p className="font-semibold text-slate-500">
                  {autoTrading
                    ? "Auto-evaluation: 60s"
                    : "Auto-refresh: 60s"}
                </p>

                {lastUpdated && (
                  <p className="mt-0.5">
                    Last updated {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={
                  refreshing ||
                  !account
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing
                      ? "animate-spin"
                      : ""
                  }`}
                />

                Refresh
              </button>

            </div>

          </div>


          {/* Messages */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div className="flex-1">
                <p className="font-semibold">
                  Paper trading message
                </p>

                <p className="mt-1">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>

            </div>
          )}


          {message && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">

              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

              <div className="flex-1">
                <p className="font-semibold">
                  Paper trading update
                </p>

                <p className="mt-1">
                  {message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMessage(null)}
                className="text-emerald-500 hover:text-emerald-700"
                aria-label="Dismiss message"
              >
                <X className="h-4 w-4" />
              </button>

            </div>
          )}


          {/* Account creation */}
          {showCreateAccount && (
            <div className="mb-6 rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">

              <div className="mb-5 flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Wallet className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Create your paper trading account
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Start with virtual capital. No real
                    money or broker account is connected.
                  </p>
                </div>

              </div>


              <form
                onSubmit={handleCreateAccount}
                className="grid gap-4 sm:grid-cols-3"
              >

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Account name
                  </label>

                  <input
                    value={accountName}
                    onChange={(event) =>
                      setAccountName(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 transition focus:ring-2"
                    placeholder="SignalPilot Demo"
                  />
                </div>


                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Starting balance
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={initialBalance}
                    onChange={(event) =>
                      setInitialBalance(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 transition focus:ring-2"
                  />
                </div>


                <div className="flex items-end">

                  <button
                    type="submit"
                    disabled={creatingAccount}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    {creatingAccount ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}

                    {creatingAccount
                      ? "Creating..."
                      : "Create paper account"}

                  </button>

                </div>

              </form>

            </div>
          )}


          {/* Account overview */}
          {account && (
            <>
              <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

                <StatCard
                  label="Balance"
                  value={formatMoney(
                    account.balance,
                    account.currency,
                  )}
                  icon={Wallet}
                />

                <StatCard
                  label="Equity"
                  value={formatMoney(
                    account.equity,
                    account.currency,
                  )}
                  icon={CircleDollarSign}
                />

                <StatCard
                  label="Unrealised P&L"
                  value={formatMoney(
                    unrealisedPnl,
                    account.currency,
                  )}
                  icon={
                    unrealisedPnl >= 0
                      ? TrendingUp
                      : TrendingDown
                  }
                  valueClassName={getPnlClass(
                    unrealisedPnl,
                  )}
                />

                <StatCard
                  label="Open Positions"
                  value={String(
                    positions.length,
                  )}
                  icon={Activity}
                />

                <StatCard
                  label="Exposure"
                  value={formatMoney(
                    totalExposure,
                    account.currency,
                  )}
                  icon={BarChart3}
                />

              </div>


              {/* Auto Trading control */}
              <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">

                  <div className="flex items-start gap-4">

                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        autoTrading
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-50 text-slate-500"
                      }`}
                    >
                      {autoEvaluating ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Zap className="h-5 w-5" />
                      )}
                    </div>

                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <h2 className="text-base font-bold text-slate-900">
                          Auto Trading
                        </h2>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                            autoTrading
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {autoTrading
                            ? "ON"
                            : "OFF"}
                        </span>

                      </div>
					  
					  {/* Kill Switch */}
<div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-red-600" />
        <h3 className="font-semibold text-slate-900">
          Trading Control
        </h3>

        {!tradingControlLoading && tradingControl && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              tradingControl.enabled
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {tradingControl.status}
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-slate-600">
        Backend control for new paper trades.
        Existing positions are not automatically closed.
      </p>
    </div>

    <button
      type="button"
      onClick={handleTradingControlToggle}
      disabled={tradingControlLoading || tradingControlUpdating}
      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
        tradingControl?.enabled
          ? "bg-red-600 hover:bg-red-700"
          : "bg-emerald-600 hover:bg-emerald-700"
      }`}
    >
      {tradingControlUpdating
        ? "Updating..."
        : tradingControl?.enabled
          ? "STOP NEW TRADES"
          : "START TRADING"}
    </button>
  </div>

  {!tradingControlLoading &&
    tradingControl &&
    !tradingControl.enabled && (
      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <strong>Kill Switch active:</strong> new paper trades are blocked.
        Existing positions remain available for manual management.
      </div>
    )}
</div>

                      <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                        When enabled, SignalPilot evaluates{" "}
                        <span className="font-semibold text-slate-700">
                          {selectedSymbol}
                        </span>{" "}
                        every 60 seconds and can create a
                        simulated BUY/SELL order only when the
                        trading and risk controls approve it.
                      </p>

                      {autoResult && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">

                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${getAutoStatusClasses(
                              autoResult,
                            )}`}
                          >
                            {autoResult.status ===
                            "EXECUTED" ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : autoResult.status ===
                              "SKIPPED_OPEN_POSITION" ? (
                              <ShieldCheck className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}

                            {getAutoStatusText(
                              autoResult,
                            )}
                          </span>

                          {autoResult.signal && (
                            <span className="text-[11px] text-slate-400">
                              Signal{" "}
                              {getSignalLabel(
                                autoResult.signal,
                              )}{" "}
                              · Confidence{" "}
                              {autoResult.signal.confidence.toFixed(
                                1,
                              )}{" "}
                              · Quality{" "}
                              {autoResult.signal.quality.quality_score.toFixed(
                                1,
                              )}
                            </span>
                          )}

                        </div>
                      )}

                    </div>

                  </div>


                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoTrading}
                    aria-label={
                      autoTrading
                        ? "Turn Auto Trading off"
                        : "Turn Auto Trading on"
                    }
                    onClick={
                      handleToggleAutoTrading
                    }
                    disabled={
                      autoEvaluating ||
                      account.status !== "ACTIVE"
                    }
                    className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition ${
                      autoTrading
                        ? "bg-emerald-600"
                        : "bg-slate-300"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >

                    <span
                      className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                        autoTrading
                          ? "translate-x-6"
                          : "translate-x-0"
                      }`}
                    />

                  </button>

                </div>


                <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">

                  <div className="flex flex-col gap-2 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">

                    <span>
                      <span className="font-semibold text-slate-600">
                        Selected market:
                      </span>{" "}
                      {selectedSymbol} · 5m
                    </span>

                    <span>
                      <span className="font-semibold text-slate-600">
                        Execution:
                      </span>{" "}
                      Paper trading only · No broker connection
                    </span>

                  </div>

                </div>

              </section>


              {/* Trading workspace */}
              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">

                {/* Signal execution panel */}
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

                  <div className="border-b border-slate-200 px-5 py-4">

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          Signal Execution
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                          Review the current SignalPilot signal
                          before submitting a simulated trade.
                        </p>
                      </div>


                      <select
                        value={selectedSymbol}
                        onChange={(event) =>
                          handleSymbolChange(
                            event.target.value,
                          )
                        }
                        disabled={
                          loadingSignal ||
                          autoEvaluating
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        {MARKET_SYMBOLS.map(
                          (symbol) => (
                            <option
                              key={symbol}
                              value={symbol}
                            >
                              {symbol}
                            </option>
                          ),
                        )}
                      </select>

                    </div>

                  </div>


                  <div className="p-5">

                    {loadingSignal ||
                    autoEvaluating ? (
                      <div className="flex min-h-64 items-center justify-center">

                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          {autoEvaluating
                            ? "Evaluating automatic paper trade..."
                            : "Loading market signal..."}
                        </div>

                      </div>
                    ) : signal ? (
                      <>

                        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                          <div className="rounded-xl bg-slate-50 p-4">

                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Signal
                            </p>

                            <div className="mt-2 flex items-center gap-2">

                              <span
                                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-bold ${getSignalClasses(
                                  signal,
                                )}`}
                              >

                                {signal.direction ===
                                "UP" ? (
                                  <ArrowUpRight className="h-4 w-4" />
                                ) : signal.direction ===
                                  "DOWN" ? (
                                  <ArrowDownRight className="h-4 w-4" />
                                ) : (
                                  <Activity className="h-4 w-4" />
                                )}

                                {getSignalLabel(
                                  signal,
                                )}

                              </span>

                            </div>

                          </div>


                          <div className="rounded-xl bg-slate-50 p-4">

                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Current Price
                            </p>

                            <p className="mt-2 text-xl font-bold text-slate-900">
                              {formatPrice(
                                signal.price,
                              )}
                            </p>

                          </div>


                          <div className="rounded-xl bg-slate-50 p-4">

                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Confidence
                            </p>

                            <p className="mt-2 text-xl font-bold text-blue-600">
                              {signal.confidence.toFixed(
                                1,
                              )}
                            </p>

                          </div>


                          <div className="rounded-xl bg-slate-50 p-4">

                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Signal Quality
                            </p>

                            <div className="mt-2 flex items-baseline gap-2">

                              <p
                                className={`text-xl font-bold ${
                                  signal.quality.quality_score >= 70
                                    ? "text-emerald-600"
                                    : "text-amber-600"
                                }`}
                              >
                                {signal.quality.quality_score.toFixed(1)}
                              </p>

                              <span className="text-xs font-semibold text-slate-500">
                                {signal.quality.quality_grade}
                              </span>

                            </div>

                          </div>

                        </div>


                        <div className="grid gap-3 sm:grid-cols-2">

                          <InfoRow
                            label="Trend"
                            value={signal.trend}
                          />

                          <InfoRow
                            label="Momentum"
                            value={signal.momentum}
                          />

                          <InfoRow
                            label="Volatility"
                            value={signal.volatility}
                          />

                          <InfoRow
                            label="Risk level"
                            value={signal.risk.risk_level}
                          />

                          <InfoRow
                            label="ATR(14)"
                            value={
                              signal.indicators.atr14 !==
                              null
                                ? formatPrice(
                                    signal.indicators
                                      .atr14,
                                  )
                                : "Unavailable"
                            }
                          />

                          <InfoRow
                            label="Timeframe"
                            value={
                              signal.timeframe
                            }
                          />

                        </div>


                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">

                          <div className="flex items-center justify-between">

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Quality Breakdown
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Components contributing to the Signal Quality Score.
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                signal.quality.quality_score >= 70
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {signal.quality.quality_score.toFixed(1)} / 100
                            </span>

                          </div>

                          <div className="mt-4 grid gap-2 sm:grid-cols-2">

                            <InfoRow
                              label="Directional strength"
                              value={`${signal.quality.components.directional_strength.toFixed(1)}`}
                            />

                            <InfoRow
                              label="Confidence"
                              value={`${signal.quality.components.confidence.toFixed(1)}`}
                            />

                            <InfoRow
                              label="Indicator agreement"
                              value={`${signal.quality.components.indicator_agreement.toFixed(1)}`}
                            />

                            <InfoRow
                              label="Volatility quality"
                              value={`${signal.quality.components.volatility_quality.toFixed(1)}`}
                            />

                            <InfoRow
                              label="Risk quality"
                              value={`${signal.quality.components.risk_quality.toFixed(1)}`}
                            />

                          </div>

                        </div>


                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">

                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Signal explanation
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {signal.explanation}
                          </p>

                        </div>


                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">

                          <div className="flex gap-3">

                            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                            <div>

                              <p className="text-sm font-bold text-amber-800">
                                Risk controls remain active
                              </p>

                              <p className="mt-1 text-xs leading-5 text-amber-700">
                                The paper trade is passed
                                through SignalPilot's
                                trading and risk engines
                                before an order is created.
                                A BUY/SELL signal does not
                                automatically guarantee
                                execution.
                              </p>

                            </div>

                          </div>

                        </div>


                        {autoTrading && (
                          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">

                            <div className="flex gap-3">

                              <Zap className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                              <div>

                                <p className="text-sm font-bold text-emerald-800">
                                  Auto Trading is active
                                </p>

                                <p className="mt-1 text-xs leading-5 text-emerald-700">
                                  The selected market is evaluated
                                  every 60 seconds while this browser
                                  tab remains visible. The backend
                                  decides whether a paper trade passes
                                  the configured trading and risk rules.
                                </p>

                              </div>

                            </div>

                          </div>
                        )}


                        <button
                          type="button"
                          onClick={
                            handleExecuteTrade
                          }
                          disabled={
                            executing ||
                            autoEvaluating ||
                            signal.direction ===
                              "NEUTRAL"
                          }
                          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >

                          {executing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Activity className="h-4 w-4" />
                          )}

                          {executing
                            ? "Executing paper trade..."
                            : signal.direction ===
                                "NEUTRAL"
                              ? "HOLD — No trade"
                              : `Execute ${getSignalLabel(
                                  signal,
                                )} Paper Trade`}

                        </button>

                      </>
                    ) : (
                      <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
                        No signal available.
                      </div>
                    )}

                  </div>

                </section>


                {/* Account details */}
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

                  <div className="border-b border-slate-200 px-5 py-4">

                    <div className="flex items-center justify-between">

                      <div>

                        <h2 className="text-base font-bold text-slate-900">
                          Paper Account
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                          {account.name}
                        </p>

                      </div>

                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                        {account.status}
                      </span>

                    </div>

                  </div>


                  <div className="p-5">

                    <div className="rounded-2xl bg-slate-50 p-5">

                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Account Equity
                      </p>

                      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                        {formatMoney(
                          account.equity,
                          account.currency,
                        )}
                      </p>

                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">

                        <Clock3 className="h-3.5 w-3.5" />

                        Updated{" "}
                        {formatDate(
                          account.updated_at,
                        )}

                      </div>

                    </div>


                    <div className="mt-4 space-y-3">

                      <DetailRow
                        label="Initial capital"
                        value={formatMoney(
                          account.initial_balance,
                          account.currency,
                        )}
                      />

                      <DetailRow
                        label="Available balance"
                        value={formatMoney(
                          account.balance,
                          account.currency,
                        )}
                      />

                      <DetailRow
                        label="Unrealised P&L"
                        value={formatMoney(
                          unrealisedPnl,
                          account.currency,
                        )}
                        valueClassName={getPnlClass(
                          unrealisedPnl,
                        )}
                      />

                      <DetailRow
                        label="Open exposure"
                        value={formatMoney(
                          totalExposure,
                          account.currency,
                        )}
                      />

                      <DetailRow
                        label="Open positions"
                        value={String(
                          positions.length,
                        )}
                      />

                    </div>

                  </div>

                </section>

              </div>


              {/* Open positions */}
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-200 px-5 py-4">

                  <div className="flex items-center justify-between">

                    <div>

                      <h2 className="text-base font-bold text-slate-900">
                        Open Positions
                      </h2>

                      <p className="mt-1 text-xs text-slate-500">
                        Simulated positions currently held
                        in this paper account.
                      </p>

                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {positions.length}
                    </span>

                  </div>

                </div>


                {positions.length === 0 ? (
                  <EmptyState
                    icon={Activity}
                    title="No open positions"
                    description="Approved paper trades will appear here as open simulated positions."
                  />
                ) : (
                  <div className="overflow-x-auto">

                    <table className="w-full min-w-[900px] text-left">

                      <thead className="border-b border-slate-100 bg-slate-50">

                        <tr>
                          <TableHeader>
                            Symbol
                          </TableHeader>

                          <TableHeader>
                            Side
                          </TableHeader>

                          <TableHeader>
                            Quantity
                          </TableHeader>

                          <TableHeader>
                            Entry
                          </TableHeader>

                          <TableHeader>
                            Current
                          </TableHeader>

                          <TableHeader>
                            Unrealised P&L
                          </TableHeader>

                          <TableHeader>
                            Opened
                          </TableHeader>

                          <TableHeader>
                            Actions
                          </TableHeader>
                        </tr>

                      </thead>


                      <tbody>

                        {positions.map(
                          (position) => (
                            <tr
                              key={
                                position.id
                              }
                              className="border-b border-slate-100 last:border-0"
                            >

                              <TableCell>
                                <span className="font-bold text-slate-900">
                                  {
                                    position.symbol
                                  }
                                </span>

                                <span className="ml-2 text-xs text-slate-400">
                                  {
                                    position.timeframe
                                  }
                                </span>
                              </TableCell>


                              <TableCell>

                                <span
                                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${
                                    position.side ===
                                    "BUY"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-red-50 text-red-700"
                                  }`}
                                >

                                  {position.side ===
                                  "BUY" ? (
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                  ) : (
                                    <ArrowDownRight className="h-3.5 w-3.5" />
                                  )}

                                  {
                                    position.side
                                  }

                                </span>

                              </TableCell>


                              <TableCell>
                                {position.quantity.toFixed(
                                  4,
                                )}
                              </TableCell>


                              <TableCell>
                                {formatPrice(
                                  position.entry_price,
                                )}
                              </TableCell>


                              <TableCell>
                                {formatPrice(
                                  position.current_price,
                                )}
                              </TableCell>


                              <TableCell>

                                <span
                                  className={`font-bold ${getPnlClass(
                                    position.unrealised_pnl,
                                  )}`}
                                >
                                  {formatMoney(
                                    position.unrealised_pnl,
                                    account.currency,
                                  )}
                                </span>

                              </TableCell>


                              <TableCell>
                                <span className="text-xs text-slate-500">
                                  {formatDate(
                                    position.opened_at,
                                  )}
                                </span>
                              </TableCell>


                              <TableCell>

                                <div className="flex items-center gap-2">

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleMarkPosition(
                                        position,
                                      )
                                    }
                                    disabled={
                                      markingPositionId ===
                                      position.id
                                    }
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                                  >

                                    {markingPositionId ===
                                    position.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      "Mark"
                                    )}

                                  </button>


                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleClosePosition(
                                        position,
                                      )
                                    }
                                    disabled={
                                      closingPositionId ===
                                      position.id
                                    }
                                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                                  >

                                    {closingPositionId ===
                                    position.id
                                      ? "Closing..."
                                      : "Close"}

                                  </button>

                                </div>

                              </TableCell>

                            </tr>
                          ),
                        )}

                      </tbody>

                    </table>

                  </div>
                )}

              </section>


              {/* Recent orders */}
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-200 px-5 py-4">

                  <div className="flex items-center justify-between">

                    <div>

                      <h2 className="text-base font-bold text-slate-900">
                        Recent Paper Orders
                      </h2>

                      <p className="mt-1 text-xs text-slate-500">
                        Simulated order execution history.
                      </p>

                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {orders.length}
                    </span>

                  </div>

                </div>


                {orders.length === 0 ? (
                  <EmptyState
                    icon={BarChart3}
                    title="No paper orders yet"
                    description="Approved simulated trades will appear here."
                  />
                ) : (
                  <div className="overflow-x-auto">

                    <table className="w-full min-w-[850px] text-left">

                      <thead className="border-b border-slate-100 bg-slate-50">

                        <tr>
                          <TableHeader>
                            Symbol
                          </TableHeader>

                          <TableHeader>
                            Side
                          </TableHeader>

                          <TableHeader>
                            Quantity
                          </TableHeader>

                          <TableHeader>
                            Executed Price
                          </TableHeader>

                          <TableHeader>
                            Stop Loss
                          </TableHeader>

                          <TableHeader>
                            Take Profit
                          </TableHeader>

                          <TableHeader>
                            Status
                          </TableHeader>

                          <TableHeader>
                            Created
                          </TableHeader>
                        </tr>

                      </thead>


                      <tbody>

                        {orders.map(
                          (order) => (
                            <tr
                              key={
                                order.id
                              }
                              className="border-b border-slate-100 last:border-0"
                            >

                              <TableCell>
                                <span className="font-bold text-slate-900">
                                  {
                                    order.symbol
                                  }
                                </span>

                                <span className="ml-2 text-xs text-slate-400">
                                  {
                                    order.timeframe
                                  }
                                </span>
                              </TableCell>


                              <TableCell>

                                <span
                                  className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ${
                                    order.side ===
                                    "BUY"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {
                                    order.side
                                  }
                                </span>

                              </TableCell>


                              <TableCell>
                                {order.quantity.toFixed(
                                  4,
                                )}
                              </TableCell>


                              <TableCell>
                                {formatPrice(
                                  order.executed_price,
                                )}
                              </TableCell>


                              <TableCell>
                                {formatPrice(
                                  order.stop_loss,
                                )}
                              </TableCell>


                              <TableCell>
                                {formatPrice(
                                  order.take_profit,
                                )}
                              </TableCell>


                              <TableCell>

                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase text-emerald-700">
                                  {
                                    order.status
                                  }
                                </span>

                              </TableCell>


                              <TableCell>
                                <span className="text-xs text-slate-500">
                                  {formatDate(
                                    order.created_at,
                                  )}
                                </span>
                              </TableCell>

                            </tr>
                          ),
                        )}

                      </tbody>

                    </table>

                  </div>
                )}

              </section>


              {/* Disclaimer */}
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">

                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                <div>

                  <p className="text-sm font-semibold text-slate-700">
                    Paper trading only
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    SignalPilot Paper Trading uses simulated
                    capital and simulated execution. It does
                    not place trades with a broker, exchange,
                    bank, or other financial institution.
                  </p>

                </div>

              </div>

            </>
          )}

        </div>
        <div className="mt-8 flex justify-center">
  <button
    type="button"
    onClick={() =>
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    }
    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
  >
    <ArrowUp className="h-4 w-4" />
    Back to Top
  </button>
</div>
      </main>
    </div>
  );
}


function StatCard({
  label,
  value,
  icon: Icon,
  valueClassName = "text-slate-900",
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <div className="flex items-center justify-between">

        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
          <Icon className="h-4 w-4" />
        </div>

      </div>

      <p
        className={`mt-3 text-xl font-bold ${valueClassName}`}
      >
        {value}
      </p>

    </div>
  );
}


function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">

      <span className="text-xs font-medium text-slate-500">
        {label}
      </span>

      <span className="text-xs font-bold text-slate-800">
        {value}
      </span>

    </div>
  );
}


function DetailRow({
  label,
  value,
  valueClassName = "text-slate-800",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">

      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span
        className={`text-sm font-bold ${valueClassName}`}
      >
        {value}
      </span>

    </div>
  );
}


function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
      {children}
    </th>
  );
}


function TableCell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td className="px-4 py-3 text-sm text-slate-600">
      {children}
    </td>
  );
}


function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">

      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-800">
        {title}
      </h3>

      <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
        {description}
      </p>

    </div>
  );
}
