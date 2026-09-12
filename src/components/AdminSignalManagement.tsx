"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Eye,
  Minus,
  RefreshCw,
  XCircle,
} from "lucide-react";

type SignalRecord = {
  id: number;
  symbol: string;
  timeframe: string;
  price: number;
  direction: string;
  confidence: number;
  trend?: string | null;
  momentum?: string | null;
  volatility?: string | null;
  risk_level?: string | null;
  explanation?: string | null;
  data_points?: number | null;
  created_at?: string | null;
  signal_timestamp?: string | null;
  evaluation_minutes?: number | null;
  evaluation_price?: number | null;
  price_change?: number | null;
  price_change_percent?: number | null;
  outcome?: string | null;
  evaluated_at?: string | null;
};

type HistoryResponse = {
  success: boolean;
  count: number;
  signals: SignalRecord[];
};

const API_URL =
  process.env.NEXT_PUBLIC_SIGNALPILOT_API_URL ||
  "http://127.0.0.1:8000";

function formatConfidence(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatPrice(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(
    value >= 100 ? 2 : value >= 10 ? 3 : 5,
  );
}

function formatChange(value?: number | null) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  const prefix = value > 0 ? "+" : "";

  return `${prefix}${value.toFixed(4)}%`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getDirectionClasses(direction: string) {
  const value = direction.toUpperCase();

  if (value === "UP" || value === "BULLISH") {
    return {
      badge: "bg-emerald-50 text-emerald-700",
      icon: "text-emerald-600",
    };
  }

  if (value === "DOWN" || value === "BEARISH") {
    return {
      badge: "bg-red-50 text-red-700",
      icon: "text-red-600",
    };
  }

  return {
    badge: "bg-slate-100 text-slate-600",
    icon: "text-slate-500",
  };
}

function getOutcomeClasses(outcome?: string | null) {
  const value = outcome?.toUpperCase();

  if (value === "CORRECT") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (value === "INCORRECT") {
    return "bg-red-50 text-red-700";
  }

  if (value === "NEUTRAL") {
    return "bg-slate-100 text-slate-600";
  }

  if (value === "INVALID") {
    return "bg-orange-50 text-orange-700";
  }

  return "bg-amber-50 text-amber-700";
}

function getOutcomeLabel(outcome?: string | null) {
  const value = outcome?.toUpperCase();

  if (value === "CORRECT") {
    return "Correct";
  }

  if (value === "INCORRECT") {
    return "Incorrect";
  }

  if (value === "NEUTRAL") {
    return "Neutral";
  }

  if (value === "INVALID") {
    return "Invalid";
  }

  return "Pending";
}

function DirectionIcon({
  direction,
}: {
  direction: string;
}) {
  const value = direction.toUpperCase();

  const classes = `h-4 w-4 ${
    getDirectionClasses(direction).icon
  }`;

  if (value === "UP" || value === "BULLISH") {
    return <ArrowUpRight className={classes} />;
  }

  if (value === "DOWN" || value === "BEARISH") {
    return <ArrowDownRight className={classes} />;
  }

  return <Minus className={classes} />;
}

function OutcomeIcon({
  outcome,
}: {
  outcome?: string | null;
}) {
  const value = outcome?.toUpperCase();

  if (value === "CORRECT") {
    return <CheckCircle2 className="h-4 w-4" />;
  }

  if (value === "INCORRECT") {
    return <XCircle className="h-4 w-4" />;
  }

  if (value === "INVALID") {
    return <XCircle className="h-4 w-4" />;
  }

  return <Clock3 className="h-4 w-4" />;
}

export default function AdminSignalManagement() {
  const [signals, setSignals] = useState<SignalRecord[]>([]);
  const [selectedSignal, setSelectedSignal] =
    useState<SignalRecord | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSignals = useCallback(
    async (manual = false) => {
      if (manual) {
        setRefreshing(true);
      }

      try {
        setError(null);

        const response = await fetch(
          `${API_URL}/history/signals?limit=50`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            `History endpoint returned HTTP ${response.status}.`,
          );
        }

        const data =
          (await response.json()) as HistoryResponse;

        setSignals(data.signals ?? []);
      } catch (requestError) {
        console.error(
          "[SignalPilot Admin Signal Management]",
          requestError,
        );

        setError(
          "Unable to load signal management data.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadSignals();

    const interval = window.setInterval(() => {
      void loadSignals();
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadSignals]);

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Signal Management
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Inspect recorded signals and evaluation results.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadSignals(true)}
          disabled={loading || refreshing}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="px-5 py-10 text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600" />

            <p className="mt-3 text-sm font-medium text-slate-700">
              Loading signal management...
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Connecting to the SignalPilot history service.
            </p>
          </div>
        ) : error ? (
          <div className="px-5 py-10 text-center">
            <XCircle className="mx-auto h-10 w-10 text-red-500" />

            <p className="mt-3 text-sm font-semibold text-slate-900">
              Signal management unavailable
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadSignals(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        ) : signals.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Activity className="mx-auto h-10 w-10 text-slate-400" />

            <p className="mt-3 text-sm font-semibold text-slate-900">
              No signals recorded
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Signal records will appear here when generated.
            </p>
          </div>
        ) : (
          <>
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Activity className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    Recorded Signals
                  </h3>

                  <p className="text-sm text-slate-500">
                    Showing the latest {signals.length} recorded signals.
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      ID
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Market
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Timeframe
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Direction
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Confidence
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Price
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Outcome
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Signal Time
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      View
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {signals.map((signal) => {
                    const directionClasses =
                      getDirectionClasses(
                        signal.direction,
                      );

                    return (
                      <tr
                        key={signal.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 text-sm font-mono text-slate-500">
                          #{signal.id}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-semibold text-slate-900">
                            {signal.symbol}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {signal.timeframe}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${directionClasses.badge}`}
                          >
                            <DirectionIcon
                              direction={
                                signal.direction
                              }
                            />

                            {signal.direction}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-semibold text-slate-900">
                            {formatConfidence(
                              signal.confidence,
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-mono text-sm text-slate-700">
                            {formatPrice(signal.price)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${getOutcomeClasses(
                              signal.outcome,
                            )}`}
                          >
                            <OutcomeIcon
                              outcome={
                                signal.outcome
                              }
                            />

                            {getOutcomeLabel(
                              signal.outcome,
                            )}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                          {formatDate(
                            signal.signal_timestamp ||
                              signal.created_at,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedSignal(signal)
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {signals.map((signal) => {
                const directionClasses =
                  getDirectionClasses(
                    signal.direction,
                  );

                return (
                  <div
                    key={signal.id}
                    className="p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {signal.symbol}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          #{signal.id} ·{" "}
                          {signal.timeframe}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${directionClasses.badge}`}
                      >
                        <DirectionIcon
                          direction={
                            signal.direction
                          }
                        />

                        {signal.direction}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Confidence
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {formatConfidence(
                            signal.confidence,
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Price
                        </p>

                        <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                          {formatPrice(signal.price)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${getOutcomeClasses(
                          signal.outcome,
                        )}`}
                      >
                        <OutcomeIcon
                          outcome={
                            signal.outcome
                          }
                        />

                        {getOutcomeLabel(
                          signal.outcome,
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSignal(signal)
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        <Eye className="h-4 w-4" />
                        View details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selectedSignal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Signal #{selectedSignal.id}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedSignal.symbol} ·{" "}
                  {selectedSignal.timeframe}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedSignal(null)
                }
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close signal details"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Direction
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {selectedSignal.direction}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Confidence
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {formatConfidence(
                    selectedSignal.confidence,
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Signal Price
                </p>

                <p className="mt-1 font-mono font-semibold text-slate-900">
                  {formatPrice(selectedSignal.price)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Outcome
                </p>

                <span
                  className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${getOutcomeClasses(
                    selectedSignal.outcome,
                  )}`}
                >
                  <OutcomeIcon
                    outcome={
                      selectedSignal.outcome
                    }
                  />

                  {getOutcomeLabel(
                    selectedSignal.outcome,
                  )}
                </span>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Trend
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {selectedSignal.trend || "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Momentum
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {selectedSignal.momentum || "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Volatility
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {selectedSignal.volatility || "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Risk Level
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {selectedSignal.risk_level || "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Evaluation Price
                </p>

                <p className="mt-1 font-mono font-semibold text-slate-900">
                  {formatPrice(
                    selectedSignal.evaluation_price,
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Price Change
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {formatChange(
                    selectedSignal.price_change_percent,
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Evaluation Window
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {selectedSignal.evaluation_minutes
                    ? `${selectedSignal.evaluation_minutes} minutes`
                    : "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Data Points
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {selectedSignal.data_points ?? "—"}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Signal Time
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {formatDate(
                  selectedSignal.signal_timestamp ||
                    selectedSignal.created_at,
                )}
              </p>

              {selectedSignal.evaluated_at && (
                <>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Evaluated At
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {formatDate(
                      selectedSignal.evaluated_at,
                    )}
                  </p>
                </>
              )}
            </div>

            {selectedSignal.explanation && (
              <div className="border-t border-slate-200 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  AI Explanation
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {selectedSignal.explanation}
                </p>
              </div>
            )}

            <div className="flex justify-end border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() =>
                  setSelectedSignal(null)
                }
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}