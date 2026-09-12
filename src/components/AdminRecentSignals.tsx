"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
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
  outcome?: string | null;
  created_at?: string | null;
  signal_timestamp?: string | null;
  evaluation_minutes?: number | null;
  evaluation_price?: number | null;
  price_change_percent?: number | null;
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

function formatPrice(value: number) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(
    value >= 100 ? 2 : value >= 10 ? 3 : 5,
  );
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

  return <Clock3 className="h-4 w-4" />;
}

export default function AdminRecentSignals() {
  const [signals, setSignals] = useState<SignalRecord[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(
    null,
  );

  const loadSignals = useCallback(
    async (manual = false) => {
      if (manual) {
        setRefreshing(true);
      }

      try {
        setError(null);

        const response = await fetch(
          `${API_URL}/history/signals?limit=10`,
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
          "[SignalPilot Admin Recent Signals]",
          requestError,
        );

        setError(
          "Unable to load recent signal history.",
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
            Recent Signal History
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Latest signals generated by SignalPilot AI.
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
              Loading recent signals...
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Connecting to the SignalPilot history service.
            </p>
          </div>
        ) : error ? (
          <div className="px-5 py-10 text-center">
            <XCircle className="mx-auto h-10 w-10 text-red-500" />

            <p className="mt-3 text-sm font-semibold text-slate-900">
              Signal history unavailable
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
              No signals recorded yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Newly generated signals will appear here.
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
                    Latest Signals
                  </h3>

                  <p className="text-sm text-slate-500">
                    Showing the 10 most recent recorded signals.
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
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
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {signal.symbol}
                          </p>
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
                          {signal.timeframe} ·{" "}
                          {formatDate(
                            signal.signal_timestamp ||
                              signal.created_at,
                          )}
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

                    <div className="mt-3">
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
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}