"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
  Target,
  XCircle,
} from "lucide-react";

import {
  getPerformanceByConfidenceRange,
  getPerformanceByMarket,
  getPerformanceByTimeframe,
  getPerformanceSummary,
  type ConfidenceRangePerformance,
  type MarketPerformance,
  type PerformanceSummary,
  type TimeframePerformance,
} from "@/lib/signalpilot-api";

function formatPercent(
  value: number,
  decimals = 1,
) {
  return `${value.toFixed(decimals)}%`;
}

function getEvidenceLabel(
  signals: number,
) {
  if (signals === 0) {
    return "No sample";
  }

  if (signals < 10) {
    return "Very small";
  }

  if (signals < 30) {
    return "Small";
  }

  if (signals < 100) {
    return "Developing";
  }

  return "Established";
}

function getEvidenceClassName(
  signals: number,
) {
  if (signals === 0) {
    return "bg-slate-100 text-slate-500";
  }

  if (signals < 10) {
    return "bg-amber-50 text-amber-700";
  }

  if (signals < 30) {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-emerald-50 text-emerald-700";
}

export default function AdminPerformanceOverview() {
  const [summary, setSummary] =
    useState<PerformanceSummary | null>(null);

  const [markets, setMarkets] =
    useState<MarketPerformance[]>([]);

  const [timeframes, setTimeframes] =
    useState<TimeframePerformance[]>([]);

  const [confidenceRanges, setConfidenceRanges] =
    useState<ConfidenceRangePerformance[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadPerformance = useCallback(
    async (manual = false) => {
      if (manual) {
        setRefreshing(true);
      }

      try {
        setError(null);

        const [
          summaryResponse,
          marketResponse,
          timeframeResponse,
          confidenceResponse,
        ] = await Promise.all([
          getPerformanceSummary(),
          getPerformanceByMarket(),
          getPerformanceByTimeframe(),
          getPerformanceByConfidenceRange(),
        ]);

        setSummary(
          summaryResponse.summary,
        );

        setMarkets(
          marketResponse.markets,
        );

        setTimeframes(
          timeframeResponse.timeframes,
        );

        setConfidenceRanges(
          confidenceResponse.confidence_ranges,
        );
      } catch (requestError) {
        console.error(
          "[SignalPilot Admin Performance]",
          requestError,
        );

        setError(
          "Unable to load performance data.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadPerformance();

    const interval = window.setInterval(() => {
      void loadPerformance();
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadPerformance]);

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Signal Performance
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Performance and evaluation metrics across recorded signals.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadPerformance(true)}
          disabled={loading || refreshing}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="px-5 py-10 text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600" />

            <p className="mt-3 text-sm font-medium text-slate-700">
              Loading performance data...
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Calculating signal performance metrics.
            </p>
          </div>
        ) : error ? (
          <div className="px-5 py-10 text-center">
            <XCircle className="mx-auto h-10 w-10 text-red-500" />

            <p className="mt-3 text-sm font-semibold text-slate-900">
              Performance unavailable
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadPerformance(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 border-b border-slate-200 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Evaluated
                  </p>
                </div>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {summary?.evaluated_signals ?? 0}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />

                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Correct
                  </p>
                </div>

                <p className="mt-2 text-2xl font-bold text-emerald-800">
                  {summary?.correct ?? 0}
                </p>
              </div>

              <div className="rounded-xl bg-red-50 p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />

                  <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                    Incorrect
                  </p>
                </div>

                <p className="mt-2 text-2xl font-bold text-red-800">
                  {summary?.incorrect ?? 0}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-slate-600" />

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Neutral
                  </p>
                </div>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {summary?.neutral ?? 0}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />

                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Hit Rate
                  </p>
                </div>

                <p className="mt-2 text-2xl font-bold text-blue-800">
                  {formatPercent(
                    summary?.hit_rate ?? 0,
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-slate-600" />

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Avg Confidence
                  </p>
                </div>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatPercent(
                    summary?.average_confidence ?? 0,
                  )}
                </p>
              </div>
            </div>

            <div className="border-b border-slate-200 p-5">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-900">
                  Performance by Market
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Market-level results and sample strength.
                </p>
              </div>

              {markets.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  No evaluated market data available.
                </p>
              ) : (
                <div className="space-y-3">
                  {markets.map((market) => (
                    <div
                      key={market.market}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {market.market}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>
                              {market.evaluated_signals} evaluated
                            </span>

                            <span>•</span>

                            <span>
                              {market.correct} correct
                            </span>

                            <span>•</span>

                            <span>
                              {market.incorrect} incorrect
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEvidenceClassName(
                              market.evaluated_signals,
                            )}`}
                          >
                            {getEvidenceLabel(
                              market.evaluated_signals,
                            )}
                          </span>

                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {formatPercent(
                              market.hit_rate,
                            )}{" "}
                            hit rate
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-0 lg:grid-cols-2">
              <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
                <div className="mb-4">
                  <h3 className="font-semibold text-slate-900">
                    Performance by Timeframe
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Results grouped by signal timeframe.
                  </p>
                </div>

                {timeframes.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    No timeframe data available.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {timeframes.map((timeframe) => (
                      <div
                        key={timeframe.timeframe}
                        className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {timeframe.timeframe}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {timeframe.evaluated_signals} evaluated
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-slate-900">
                            {formatPercent(
                              timeframe.hit_rate,
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            hit rate
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="mb-4">
                  <h3 className="font-semibold text-slate-900">
                    Performance by Confidence
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Results grouped by confidence range.
                  </p>
                </div>

                {confidenceRanges.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    No confidence data available.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {confidenceRanges.map(
                      (confidenceRange) => (
                        <div
                          key={confidenceRange.range}
                          className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">
                              {confidenceRange.range}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {confidenceRange.evaluated_signals} evaluated
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-bold text-slate-900">
                              {formatPercent(
                                confidenceRange.hit_rate,
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              hit rate
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                <p className="text-xs leading-5 text-slate-500">
                  Performance metrics are calculated from evaluated
                  signals only. Small samples should not be treated as
                  reliable rankings.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}