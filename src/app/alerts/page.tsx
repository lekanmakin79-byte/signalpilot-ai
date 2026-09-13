"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  ChevronRight,
  Clock3,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import {
  getMarketQuotes,
  getSignal,
  type MarketQuote,
  type SignalResult,
} from "@/lib/signalpilot-api";
import {
createSupabaseBrowserClient
} from "@/lib/supabase-browser";

type AlertCondition =
  | "PRICE_ABOVE"
  | "PRICE_BELOW"
  | "SIGNAL_UP"
  | "SIGNAL_DOWN";

type MarketAlert = {
  id: string;
  symbol: string;
  condition: AlertCondition;
  targetPrice: number | null;
  minimumConfidence: number | null;
  enabled: boolean;
  createdAt: string;
};

const ALERT_STORAGE_KEY = "signalpilot_alerts";

const AVAILABLE_MARKETS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "XAU/USD",
];

const DEFAULT_ALERTS: MarketAlert[] = [];

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatPrice(
  symbol: string,
  price: number | undefined,
) {
  if (!isValidNumber(price)) {
    return "â€”";
  }

  if (symbol === "XAU/USD") {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (symbol === "USD/JPY") {
    return price.toFixed(3);
  }

  return price.toFixed(5);
}

function loadLegacyAlerts(): MarketAlert[] {
  if (typeof window === "undefined") {
    return DEFAULT_ALERTS;
  }

  try {
    const saved = window.localStorage.getItem(
      ALERT_STORAGE_KEY,
    );

    if (!saved) {
      return DEFAULT_ALERTS;
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return DEFAULT_ALERTS;
    }

    return parsed.filter((alert) => {
      return (
        alert &&
        typeof alert.id === "string" &&
        typeof alert.symbol === "string" &&
        AVAILABLE_MARKETS.includes(alert.symbol) &&
        typeof alert.condition === "string" &&
        [
          "PRICE_ABOVE",
          "PRICE_BELOW",
          "SIGNAL_UP",
          "SIGNAL_DOWN",
        ].includes(alert.condition) &&
        typeof alert.enabled === "boolean"
      );
    });
  } catch {
    return DEFAULT_ALERTS;
  }
}

function clearLegacyAlerts() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(
      ALERT_STORAGE_KEY,
    );
  } catch {
    // Ignore localStorage cleanup failures.
  }
}

function getConditionLabel(
  condition: AlertCondition,
) {
  switch (condition) {
    case "PRICE_ABOVE":
      return "Price above";

    case "PRICE_BELOW":
      return "Price below";

    case "SIGNAL_UP":
      return "UP signal";

    case "SIGNAL_DOWN":
      return "DOWN signal";

    default:
      return "Alert";
  }
}

function getConditionDescription(
  condition: AlertCondition,
) {
  switch (condition) {
    case "PRICE_ABOVE":
      return "Triggers when the market moves above your target price.";

    case "PRICE_BELOW":
      return "Triggers when the market moves below your target price.";

    case "SIGNAL_UP":
      return "Monitors for a quantitative UP signal.";

    case "SIGNAL_DOWN":
      return "Monitors for a quantitative DOWN signal.";

    default:
      return "";
  }
}

function getConditionIcon(
  condition: AlertCondition,
) {
  if (condition === "PRICE_ABOVE") {
    return <TrendingUp size={16} />;
  }

  if (condition === "PRICE_BELOW") {
    return <TrendingDown size={16} />;
  }

  if (condition === "SIGNAL_UP") {
    return <Bell size={16} />;
  }

  return <Bell size={16} />;
}

function getConditionClasses(
  condition: AlertCondition,
) {
  if (
    condition === "PRICE_ABOVE" ||
    condition === "SIGNAL_UP"
  ) {
    return "bg-emerald-50 text-emerald-600";
  }

  return "bg-red-50 text-red-600";
}

function createAlertId() {
  return `alert_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export default function AlertsPage() {
  const router = useRouter();

  const [alerts, setAlerts] = useState<MarketAlert[]>(
    DEFAULT_ALERTS,
  );

  const [markets, setMarkets] = useState<MarketQuote[]>(
    [],
  );

  const [latestSignals, setLatestSignals] =
  useState<Record<string, SignalResult>>({});

  const [loading, setLoading] = useState(true);
  const [loadingAlerts, setLoadingAlerts] =
  useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [showCreateAlert, setShowCreateAlert] =
    useState(false);

  const [selectedSymbol, setSelectedSymbol] =
    useState("EUR/USD");

  const [selectedCondition, setSelectedCondition] =
    useState<AlertCondition>("PRICE_ABOVE");

  const [targetPrice, setTargetPrice] =
    useState("");

  const [minimumConfidence, setMinimumConfidence] =
    useState("70");

  async function loadAlertsFromSupabase() {
  try {
    setLoadingAlerts(true);
    setError("");

    const supabase =
      createSupabaseBrowserClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/auth/login");
      return;
    }

    const {
      data,
      error: alertsError,
    } = await supabase
      .from("alerts")
      .select(
        "id, symbol, condition, target_price, minimum_confidence, enabled, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (alertsError) {
      console.error(
        "Failed to load Alerts:",
        alertsError,
      );

      setError(
        "Unable to load your saved alerts.",
      );

      return;
    }

    const databaseAlerts: MarketAlert[] =
      (data ?? [])
        .filter((alert) =>
          AVAILABLE_MARKETS.includes(
            alert.symbol,
          ),
        )
        .map((alert) => ({
          id: String(alert.id),
          symbol: alert.symbol,
          condition:
            alert.condition as AlertCondition,
          targetPrice:
            alert.target_price !== null
              ? Number(alert.target_price)
              : null,
          minimumConfidence:
            alert.minimum_confidence !== null
              ? Number(
                  alert.minimum_confidence,
                )
              : null,
          enabled: Boolean(alert.enabled),
          createdAt: alert.created_at,
        }));

    if (databaseAlerts.length > 0) {
      setAlerts(databaseAlerts);
      clearLegacyAlerts();
      return;
    }

    /*
     * First-time migration:
     * Preserve alerts previously stored in this browser.
     */
    const legacyAlerts =
      loadLegacyAlerts();

    if (legacyAlerts.length === 0) {
      setAlerts([]);
      clearLegacyAlerts();
      return;
    }

    const rows = legacyAlerts.map(
      (alert) => ({
        user_id: user.id,
        symbol: alert.symbol,
        condition: alert.condition,
        target_price:
          alert.targetPrice,
        minimum_confidence:
          alert.minimumConfidence,
        enabled: alert.enabled,
        created_at: alert.createdAt,
      }),
    );

        const {
      data: migratedData,
      error: migrationError,
    } = await supabase
      .from("alerts")
      .insert(rows)
      .select(
        "id, symbol, condition, target_price, minimum_confidence, enabled, created_at",
      );

    if (migrationError || !migratedData) {
      console.error(
        "Failed to migrate Alerts:",
        migrationError,
      );

      setError(
        "Unable to migrate your existing alerts.",
      );

      return;
    }

    const migratedAlerts: MarketAlert[] =
      migratedData
        .filter((alert) =>
          AVAILABLE_MARKETS.includes(
            alert.symbol,
          ),
        )
        .map((alert) => ({
          id: String(alert.id),
          symbol: alert.symbol,
          condition:
            alert.condition as AlertCondition,
          targetPrice:
            alert.target_price !== null
              ? Number(alert.target_price)
              : null,
          minimumConfidence:
            alert.minimum_confidence !== null
              ? Number(
                  alert.minimum_confidence,
                )
              : null,
          enabled: Boolean(alert.enabled),
          createdAt: alert.created_at,
        }));

    setAlerts(migratedAlerts);
    clearLegacyAlerts();
  } catch (err) {
    console.error(
      "Alerts load failed:",
      err,
    );

    setError(
      err instanceof Error
        ? err.message
        : "Unable to load your alerts.",
    );
  } finally {
    setLoadingAlerts(false);
  }
}

useEffect(() => {
  loadAlertsFromSupabase();
}, []);

  async function loadMarkets(
    showRefreshState = false,
  ) {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const result = await getMarketQuotes();

      if (
        !result ||
        !Array.isArray(result.markets)
      ) {
        setMarkets([]);
        setError(
          "Market data returned an unexpected response.",
        );
        return;
      }

      setMarkets(result.markets);
    } catch (err) {
      console.error(
        "Alerts market load failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load live market data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadMarkets();
  }, []);

  async function loadLatestSignals() {
  const signalAlerts = alerts.filter(
    (alert) =>
      alert.enabled &&
      (alert.condition === "SIGNAL_UP" ||
        alert.condition === "SIGNAL_DOWN"),
  );

  if (signalAlerts.length === 0) {
    setLatestSignals({});
    return;
  }

  const symbols = Array.from(
    new Set(
      signalAlerts.map(
        (alert) => alert.symbol,
      ),
    ),
  );

  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const response = await getSignal(
            symbol,
            "5m",
            100,
          );

          if (
            response.success &&
            response.signal
          ) {
            return [
              symbol,
              response.signal,
            ] as const;
          }

          return null;
        } catch (err) {
          console.error(
            `Failed to load signal for ${symbol}:`,
            err,
          );

          return null;
        }
      }),
    );

    const signalMap: Record<
      string,
      SignalResult
    > = {};

    for (const result of results) {
      if (result) {
        signalMap[result[0]] = result[1];
      }
    }

    setLatestSignals(signalMap);
  } catch (err) {
    console.error(
      "Failed to load alert signals:",
      err,
    );
  }
}

useEffect(() => {
  loadLatestSignals();
}, [alerts]);

  const activeAlerts = useMemo(
    () =>
      alerts.filter(
        (alert) => alert.enabled,
      ),
    [alerts],
  );

  const triggeredAlerts = useMemo(() => {
  return alerts.filter((alert) => {
    if (!alert.enabled) {
      return false;
    }

    const market = markets.find(
      (item) => item.symbol === alert.symbol,
    );

    if (!market || !isValidNumber(market.price)) {
      return false;
    }

    if (alert.condition === "PRICE_ABOVE") {
      return (
        alert.targetPrice !== null &&
        market.price >= alert.targetPrice
      );
    }

    if (alert.condition === "PRICE_BELOW") {
      return (
        alert.targetPrice !== null &&
        market.price <= alert.targetPrice
      );
    }

    const signal =
      latestSignals[alert.symbol];

    if (!signal) {
      return false;
    }

    if (
      alert.minimumConfidence === null ||
      !isValidNumber(signal.confidence)
    ) {
      return false;
    }

    if (
      signal.confidence <
      alert.minimumConfidence
    ) {
      return false;
    }

    if (
      alert.condition === "SIGNAL_UP"
    ) {
      return signal.direction === "UP";
    }

    if (
      alert.condition === "SIGNAL_DOWN"
    ) {
      return signal.direction === "DOWN";
    }

    return false;
  });
}, [
  alerts,
  markets,
  latestSignals,
]);

  function resetAlertForm() {
    setSelectedSymbol("EUR/USD");
    setSelectedCondition("PRICE_ABOVE");
    setTargetPrice("");
    setMinimumConfidence("70");
  }

  function openCreateAlert() {
    resetAlertForm();
    setShowCreateAlert(true);
  }

  async function createAlert() {
    const requiresPrice =
      selectedCondition === "PRICE_ABOVE" ||
      selectedCondition === "PRICE_BELOW";

    let parsedPrice: number | null = null;

    if (requiresPrice) {
      parsedPrice = Number(targetPrice);

      if (
        !targetPrice.trim() ||
        !Number.isFinite(parsedPrice) ||
        parsedPrice <= 0
      ) {
        setError(
          "Enter a valid positive target price.",
        );
        return;
      }
    }

    let parsedConfidence: number | null = null;

    if (
      selectedCondition === "SIGNAL_UP" ||
      selectedCondition === "SIGNAL_DOWN"
    ) {
      parsedConfidence = Number(
        minimumConfidence,
      );

      if (
        !Number.isFinite(parsedConfidence) ||
        parsedConfidence < 0 ||
        parsedConfidence > 95
      ) {
        setError(
          "Confidence must be between 0 and 95.",
        );
        return;
      }
    }

        try {
      const supabase =
        createSupabaseBrowserClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/auth/login");
        return;
      }

      const {
        data,
        error: insertError,
      } = await supabase
        .from("alerts")
        .insert({
          user_id: user.id,
          symbol: selectedSymbol,
          condition: selectedCondition,
          target_price: parsedPrice,
          minimum_confidence:
            parsedConfidence,
          enabled: true,
        })
        .select(
          "id, symbol, condition, target_price, minimum_confidence, enabled, created_at",
        )
        .single();

      if (insertError || !data) {
        console.error(
          "Failed to create Alert:",
          insertError,
        );

        setError(
          "Unable to save your alert.",
        );

        return;
      }

      const newAlert: MarketAlert = {
        id: String(data.id),
        symbol: data.symbol,
        condition:
          data.condition as AlertCondition,
        targetPrice:
          data.target_price !== null
            ? Number(data.target_price)
            : null,
        minimumConfidence:
          data.minimum_confidence !== null
            ? Number(
                data.minimum_confidence,
              )
            : null,
        enabled: Boolean(data.enabled),
        createdAt: data.created_at,
      };

      setAlerts((current) => [
        newAlert,
        ...current,
      ]);

      setShowCreateAlert(false);
      setError("");
    } catch (err) {
      console.error(
        "Alert creation failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create alert.",
      );
    }

	 }

  async function toggleAlert(id: string) {
  const alert = alerts.find(
    (item) => item.id === id,
  );

  if (!alert) {
    return;
  }

  try {
    setError("");

    const supabase =
      createSupabaseBrowserClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/auth/login");
      return;
    }

    const {
      error: updateError,
    } = await supabase
      .from("alerts")
      .update({
        enabled: !alert.enabled,
      })
      .eq("id", Number(id))
      .eq("user_id", user.id);

    if (updateError) {
      console.error(
        "Failed to update Alert:",
        updateError,
      );

      setError(
        "Unable to update this alert.",
      );

      return;
    }

    setAlerts((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              enabled: !item.enabled,
            }
          : item,
      ),
    );
  } catch (err) {
    console.error(
      "Alert toggle failed:",
      err,
    );

    setError(
      err instanceof Error
        ? err.message
        : "Unable to update this alert.",
    );
  }
}

  async function deleteAlert(id: string) {
  try {
    setError("");

    const supabase =
      createSupabaseBrowserClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/auth/login");
      return;
    }

    const {
      error: deleteError,
    } = await supabase
      .from("alerts")
      .delete()
      .eq("id", Number(id))
      .eq("user_id", user.id);

    if (deleteError) {
      console.error(
        "Failed to delete Alert:",
        deleteError,
      );

      setError(
        "Unable to delete this alert.",
      );

      return;
    }

    setAlerts((current) =>
      current.filter(
        (alert) => alert.id !== id,
      ),
    );
  } catch (err) {
    console.error(
      "Alert deletion failed:",
      err,
    );

    setError(
      err instanceof Error
        ? err.message
        : "Unable to delete this alert.",
    );
  }
}

  function getMarketPrice(symbol: string) {
    const market = markets.find(
      (item) => item.symbol === symbol,
    );

    return market?.price;
  }

  function isTriggered(alert: MarketAlert) {
    const market = markets.find(
      (item) => item.symbol === alert.symbol,
    );

    if (
      !market ||
      !isValidNumber(market.price)
    ) {
      return false;
    }

    if (alert.condition === "PRICE_ABOVE") {
      return (
        alert.targetPrice !== null &&
        market.price >= alert.targetPrice
      );
    }

    if (alert.condition === "PRICE_BELOW") {
      return (
        alert.targetPrice !== null &&
        market.price <= alert.targetPrice
      );
    }

    return false;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() =>
                router.push("/dashboard")
              }
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <Bell
                  size={18}
                  className="text-blue-600"
                />

                <span className="text-sm font-medium text-blue-600">
                  Market Monitoring
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Alerts
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Set monitoring conditions for the
                markets you follow.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                loadMarkets(true)
              }
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateAlert}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
            >
              <Plus size={17} />

              Create alert
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Total alerts
              </span>

              <Bell
                size={18}
                className="text-blue-500"
              />
            </div>

            <div className="text-2xl font-bold text-slate-900">
              {alerts.length}
            </div>

            <div className="mt-1 text-xs text-slate-400">
              Saved to your account
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Active alerts
              </span>

              <Check
                size={18}
                className="text-emerald-500"
              />
            </div>

            <div className="text-2xl font-bold text-slate-900">
              {activeAlerts.length}
            </div>

            <div className="mt-1 text-xs text-slate-400">
              Currently enabled
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Conditions met
              </span>

              <AlertTriangle
                size={18}
                className="text-amber-500"
              />
            </div>

            <div className="text-2xl font-bold text-slate-900">
              {triggeredAlerts.length}
            </div>

            <div className="mt-1 text-xs text-slate-400">
              Based on latest market data and quantitative signals
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <X
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div>
              <div className="font-medium">
                Alert notice
              </div>

              <div className="mt-1 text-red-600/80">
                {error}
              </div>
            </div>
          </div>
        )}

        {/* Triggered conditions */}
        {triggeredAlerts.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <AlertTriangle size={19} />
              </div>

              <div>
                <h2 className="font-semibold text-amber-900">
                  Alert conditions currently met
                </h2>

                <p className="mt-1 text-xs leading-5 text-amber-800/70">
                  One or more price conditions have
                  been reached according to the latest
                  market data. These alerts are
                  informational and do not execute trades.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alerts list */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Your alerts
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Monitor conditions without executing trades
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Market data available
            </div>
          </div>

          {loading || loadingAlerts ? (
            <div className="p-10 text-center">
              <RefreshCw
                size={24}
                className="mx-auto mb-3 animate-spin text-blue-500"
              />

              <p className="text-sm text-slate-500">
                Loading your alerts...
              </p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                <Bell size={25} />
              </div>

              <h3 className="font-semibold text-slate-900">
                No alerts yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Create an alert to monitor a price
                condition or quantitative signal.
              </p>

              <button
                type="button"
                onClick={openCreateAlert}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
              >
                <Plus size={16} />

                Create alert
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {alerts.map((alert) => {
                const currentPrice =
                  getMarketPrice(
                    alert.symbol,
                  );

                const triggered =
                  isTriggered(alert);

                return (
                  <div
                    key={alert.id}
                    className="px-5 py-5 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getConditionClasses(
                            alert.condition,
                          )}`}
                        >
                          {getConditionIcon(
                            alert.condition,
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-900">
                              {alert.symbol}
                            </h3>

                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                              Alert
                            </span>

                            {triggered && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                Condition met
                              </span>
                            )}
                          </div>

                          <div className="mt-1 text-sm font-medium text-slate-700">
                            {getConditionLabel(
                              alert.condition,
                            )}
                            {alert.targetPrice !==
                              null && (
                              <span className="ml-1 font-bold text-slate-900">
                                {formatPrice(
                                  alert.symbol,
                                  alert.targetPrice,
                                )}
                              </span>
                            )}

                            {alert.minimumConfidence !==
                              null && (
                              <span className="ml-1 font-bold text-slate-900">
                                {alert.minimumConfidence}%
                              </span>
                            )}
                          </div>

                          <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                            {getConditionDescription(
                              alert.condition,
                            )}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <Clock3 size={13} />

                              Current price:{" "}
                              <strong className="text-slate-600">
                                {formatPrice(
                                  alert.symbol,
                                  currentPrice,
                                )}
                              </strong>
                            </span>

                            <span>
                              {alert.enabled
                                ? "Enabled"
                                : "Disabled"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 lg:shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            toggleAlert(
                              alert.id,
                            )
                          }
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                            alert.enabled
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          {alert.enabled ? (
                            <Bell size={14} />
                          ) : (
                            <BellOff size={14} />
                          )}

                          {alert.enabled
                            ? "Enabled"
                            : "Disabled"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              "/markets",
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        >
                          Analyze

                          <ChevronRight
                            size={14}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteAlert(
                              alert.id,
                            )
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${alert.symbol} alert`}
                          title="Delete alert"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick links */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">

          <button
            type="button"
            onClick={() =>
              router.push("/watchlist")
            }
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Search size={19} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Watchlist
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Review your monitored markets
                </p>
              </div>

              <ChevronRight
                size={17}
                className="text-slate-300 transition group-hover:text-slate-600"
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push("/signals")
            }
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/30"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp size={19} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Signals
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Review current quantitative signals
                </p>
              </div>

              <ChevronRight
                size={17}
                className="text-slate-300 transition group-hover:text-slate-600"
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push("/settings")
            }
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Settings size={19} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Alert settings
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Manage your SignalPilot preferences
                </p>
              </div>

              <ChevronRight
                size={17}
                className="text-slate-300 transition group-hover:text-slate-600"
              />
            </div>
          </button>
        </div>

        {/* Important note */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Check size={17} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Alert monitoring status
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Your alerts are securely stored in your SignalPilot account.
				Price conditions are checked against the latest market quotes,
				while signal conditions are evaluated against SignalPilot's latest
				quantitative signals and minimum confidence threshold.
				These conditions are checked when this page loads or refreshes.
				SignalPilot does not execute trades or place orders from
				these alerts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create alert modal */}
      {showCreateAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowCreateAlert(false);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Create alert
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Configure a market monitoring condition
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCreateAlert(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <div className="space-y-5 p-5">

              {/* Market */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Market
                </label>

                <select
                  value={selectedSymbol}
                  onChange={(event) =>
                    setSelectedSymbol(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                >
                  {AVAILABLE_MARKETS.map(
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

              {/* Condition */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Alert condition
                </label>

                <select
                  value={selectedCondition}
                  onChange={(event) =>
                    setSelectedCondition(
                      event.target
                        .value as AlertCondition,
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                >
                  <option value="PRICE_ABOVE">
                    Price above
                  </option>

                  <option value="PRICE_BELOW">
                    Price below
                  </option>

                  <option value="SIGNAL_UP">
                    UP signal
                  </option>

                  <option value="SIGNAL_DOWN">
                    DOWN signal
                  </option>
                </select>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {getConditionDescription(
                    selectedCondition,
                  )}
                </p>
              </div>

              {/* Price */}
              {(selectedCondition ===
                "PRICE_ABOVE" ||
                selectedCondition ===
                  "PRICE_BELOW") && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Target price
                  </label>

                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={targetPrice}
                    onChange={(event) =>
                      setTargetPrice(
                        event.target.value,
                      )
                    }
                    placeholder={
                      selectedSymbol ===
                      "XAU/USD"
                        ? "Example: 4400"
                        : selectedSymbol ===
                            "USD/JPY"
                          ? "Example: 154.500"
                          : "Example: 1.16500"
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                  />

                  {isValidNumber(
                    getMarketPrice(
                      selectedSymbol,
                    ),
                  ) && (
                    <p className="mt-2 text-xs text-slate-400">
                      Current price:{" "}
                      <strong className="text-slate-600">
                        {formatPrice(
                          selectedSymbol,
                          getMarketPrice(
                            selectedSymbol,
                          ),
                        )}
                      </strong>
                    </p>
                  )}
                </div>
              )}

              {/* Confidence */}
              {(selectedCondition ===
                "SIGNAL_UP" ||
                selectedCondition ===
                  "SIGNAL_DOWN") && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Minimum confidence
                  </label>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      max="95"
                      step="1"
                      value={
                        minimumConfidence
                      }
                      onChange={(event) =>
                        setMinimumConfidence(
                          event.target.value,
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                    />

                    <span className="text-sm font-medium text-slate-500">
                      %
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    This stores the minimum signal
                    confidence you want the alert to
                    monitor.
                  </p>
                </div>
              )}

              {/* Disclaimer */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex gap-3">
                  <AlertTriangle
                    size={17}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />

                  <p className="text-xs leading-5 text-amber-800">
                    Alerts are monitoring tools for
                    market research. They do not place
                    trades or guarantee an outcome.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() =>
                    setShowCreateAlert(false)
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={createAlert}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  <Plus size={16} />

                  Create alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
