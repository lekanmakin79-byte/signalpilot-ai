"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
  getPerformanceByConfidenceRange,
  getPerformanceByMarket,
  getPerformanceByTimeframe,
  getPerformanceSummary,
  runStrategyLabBacktest,
  type ConfidenceRangePerformance,
  type MarketPerformance,
  type PerformanceSummary,
  type StrategyLabResponse,
  type StrategyLabResult,
  type StrategyLabSummary,
  type TimeframePerformance,
} from "@/lib/signalpilot-api";

import SignalPilotNavigation from "@/components/SignalPilotNavigation";
import ReturnToTop from "@/components/ReturnToTop";


const DEFAULT_MARKET = "EUR/USD";
const DEFAULT_TIMEFRAME = "5m";
const DEFAULT_CANDLES = 100;
const DEFAULT_CONFIDENCE = 0;

/*
 * A result is not considered strong enough for a "best"
 * ranking unless there are at least this many evaluated signals.
 *
 * This prevents statements such as:
 * "XAU/USD is best at 100%"
 * when that result is based on only one signal.
 */
const MINIMUM_RANKING_SIGNALS = 10;


function formatPercent(
  value: number,
  decimals = 1,
) {
  return `${value.toFixed(decimals)}%`;
}


function formatChange(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(4)}%`;
}


function formatDrawdown(value: number) {
  if (value === 0) {
    return "0.0000%";
  }

  return `-${Math.abs(value).toFixed(4)}%`;
}


function formatPrice(value: number) {
  return value.toFixed(5);
}


function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
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

  if (signals < 100) {
    return "bg-indigo-50 text-indigo-700";
  }

  return "bg-emerald-50 text-emerald-700";
}


function calculateDirectionalResults(
  results: StrategyLabResult[],
) {
  return results.filter(
    (result) =>
      result.direction === "UP" ||
      result.direction === "DOWN",
  );
}


function calculatePerformanceAnalytics(
  summary: StrategyLabSummary,
  results: StrategyLabResult[],
) {
  const directionalResults =
    calculateDirectionalResults(results);

  const evaluatedDirectionalResults =
    directionalResults.filter(
      (result) =>
        result.outcome === "CORRECT" ||
        result.outcome === "INCORRECT",
    );

  const winningResults =
    evaluatedDirectionalResults.filter(
      (result) => result.outcome === "CORRECT",
    );

  const losingResults =
    evaluatedDirectionalResults.filter(
      (result) => result.outcome === "INCORRECT",
    );

  const averageDirectionalChange =
    directionalResults.length > 0
      ? directionalResults.reduce(
          (sum, result) =>
            sum +
            result.hypothetical_directional_change_percent,
          0,
        ) / directionalResults.length
      : 0;

  const averageWinningMove =
    winningResults.length > 0
      ? winningResults.reduce(
          (sum, result) =>
            sum +
            result.hypothetical_directional_change_percent,
          0,
        ) / winningResults.length
      : 0;

  const averageLosingMove =
    losingResults.length > 0
      ? losingResults.reduce(
          (sum, result) =>
            sum +
            result.hypothetical_directional_change_percent,
          0,
        ) / losingResults.length
      : 0;

  const totalWinningMove =
    winningResults.reduce(
      (sum, result) =>
        sum +
        Math.max(
          result.hypothetical_directional_change_percent,
          0,
        ),
      0,
    );

  const totalLosingMove =
    losingResults.reduce(
      (sum, result) =>
        sum +
        Math.abs(
          Math.min(
            result.hypothetical_directional_change_percent,
            0,
          ),
        ),
      0,
    );

  const profitFactor =
    totalLosingMove > 0
      ? totalWinningMove / totalLosingMove
      : totalWinningMove > 0
        ? Infinity
        : 0;

  const winLossRatio =
    averageLosingMove < 0
      ? Math.abs(
          averageWinningMove /
            averageLosingMove,
        )
      : averageWinningMove > 0
        ? Infinity
        : 0;

  const upResults =
    evaluatedDirectionalResults.filter(
      (result) => result.direction === "UP",
    );

  const downResults =
    evaluatedDirectionalResults.filter(
      (result) => result.direction === "DOWN",
    );


  function directionStats(
    directionResults: StrategyLabResult[],
  ) {
    const correct =
      directionResults.filter(
        (result) =>
          result.outcome === "CORRECT",
      ).length;

    const incorrect =
      directionResults.filter(
        (result) =>
          result.outcome === "INCORRECT",
      ).length;

    const total =
      correct + incorrect;

    const averageChange =
      directionResults.length > 0
        ? directionResults.reduce(
            (sum, result) =>
              sum +
              result.hypothetical_directional_change_percent,
            0,
          ) / directionResults.length
        : 0;

    const cumulativeChange =
      directionResults.reduce(
        (sum, result) =>
          sum +
          result.hypothetical_directional_change_percent,
        0,
      );

    return {
      signals: directionResults.length,
      correct,
      incorrect,
      accuracy:
        total > 0
          ? (correct / total) * 100
          : 0,
      averageChange,
      cumulativeChange,
    };
  }


  const confidenceBands = [
    {
      label: "0–49%",
      min: 0,
      max: 49,
    },
    {
      label: "50–59%",
      min: 50,
      max: 59,
    },
    {
      label: "60–69%",
      min: 60,
      max: 69,
    },
    {
      label: "70–79%",
      min: 70,
      max: 79,
    },
    {
      label: "80–89%",
      min: 80,
      max: 89,
    },
    {
      label: "90%+",
      min: 90,
      max: 100,
    },
  ];


  const confidenceStats =
    confidenceBands.map(
      (band) => {
        const bandResults =
          evaluatedDirectionalResults.filter(
            (result) =>
              result.confidence >=
                band.min &&
              result.confidence <=
                band.max,
          );

        const correct =
          bandResults.filter(
            (result) =>
              result.outcome ===
              "CORRECT",
          ).length;

        const incorrect =
          bandResults.filter(
            (result) =>
              result.outcome ===
              "INCORRECT",
          ).length;

        const total =
          correct + incorrect;

        const averageChange =
          bandResults.length > 0
            ? bandResults.reduce(
                (sum, result) =>
                  sum +
                  result.hypothetical_directional_change_percent,
                0,
              ) / bandResults.length
            : 0;

        const cumulativeChange =
          bandResults.reduce(
            (sum, result) =>
              sum +
              result.hypothetical_directional_change_percent,
            0,
          );

        return {
          label: band.label,
          signals: bandResults.length,
          correct,
          incorrect,
          hitRate:
            total > 0
              ? (correct / total) *
                100
              : 0,
          averageChange,
          cumulativeChange,
        };
      },
    );


  return {
    directionalSignals:
      directionalResults.length,

    directionalAccuracy:
      evaluatedDirectionalResults.length >
      0
        ? (summary.correct /
            evaluatedDirectionalResults.length) *
          100
        : 0,

    averageDirectionalChange,

    averageWinningMove,

    averageLosingMove,

    winLossRatio,

    profitFactor,

    up: directionStats(upResults),

    down: directionStats(downResults),

    confidenceStats,
  };
}


export default function PerformancePage() {
  const router = useRouter();


  const [summary, setSummary] =
    useState<PerformanceSummary | null>(
      null,
    );

  const [markets, setMarkets] =
    useState<MarketPerformance[]>([]);

  const [timeframes, setTimeframes] =
    useState<TimeframePerformance[]>([]);

  const [
    confidenceRanges,
    setConfidenceRanges,
  ] = useState<
    ConfidenceRangePerformance[]
  >([]);

  const [strategyData, setStrategyData] =
    useState<StrategyLabResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [strategyLoading, setStrategyLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [strategyError, setStrategyError] =
    useState<string | null>(null);


  async function loadPerformance() {
    try {
      setLoading(true);
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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load performance metrics.",
      );
    } finally {
      setLoading(false);
    }
  }


  async function loadStrategyAnalytics() {
    try {
      setStrategyLoading(true);
      setStrategyError(null);

      const response =
        await runStrategyLabBacktest(
          DEFAULT_MARKET,
          DEFAULT_TIMEFRAME,
          DEFAULT_CANDLES,
          DEFAULT_CONFIDENCE,
        );

      setStrategyData(response);
    } catch (err) {
      setStrategyError(
        err instanceof Error
          ? err.message
          : "Unable to load Strategy Lab analytics.",
      );
    } finally {
      setStrategyLoading(false);
    }
  }


  async function loadAllPerformance() {
    await Promise.all([
      loadPerformance(),
      loadStrategyAnalytics(),
    ]);
  }


  useEffect(() => {
    loadAllPerformance();
  }, []);


  const sampleMessage = useMemo(() => {
    if (!summary) {
      return "";
    }

    if (
      summary.evaluated_signals === 0
    ) {
      return "No evaluated signals are available yet. Performance will appear here as signals reach their evaluation horizon.";
    }

    if (
      summary.evaluated_signals < 30
    ) {
      return `Small sample size: ${summary.evaluated_signals} evaluated signal${
        summary.evaluated_signals === 1
          ? ""
          : "s"
      }. Historical performance is not yet statistically reliable.`;
    }

    if (
      summary.evaluated_signals < 100
    ) {
      return `Current sample: ${summary.evaluated_signals} evaluated signals. Continue collecting outcomes before drawing strong conclusions about historical performance.`;
    }

    return `Current sample: ${summary.evaluated_signals} evaluated signals. Historical performance should still be interpreted alongside market conditions and methodology changes.`;
  }, [summary]);


  const analytics = useMemo(() => {
    if (!strategyData) {
      return null;
    }

    return calculatePerformanceAnalytics(
      strategyData.backtest,
      strategyData.results,
    );
  }, [strategyData]);


  const recentSignals = useMemo(() => {
    if (!strategyData) {
      return [];
    }

    return [...strategyData.results]
      .reverse()
      .slice(0, 10);
  }, [strategyData]);


    /*
   * A market is only eligible for a "best" comparison when:
   * 1. It has enough evaluated signals.
   * 2. At least two markets meet that evidence threshold.
   *
   * This prevents EUR/USD from being called "best" simply because
   * it is the only market with enough observations.
   */
  const eligibleMarkets = useMemo(() => {
    return markets.filter(
      (item) =>
        item.evaluated_signals >=
        MINIMUM_RANKING_SIGNALS,
    );
  }, [markets]);


  const bestMarket = useMemo(() => {
    if (eligibleMarkets.length < 2) {
      return null;
    }

    return [...eligibleMarkets].sort(
      (a, b) =>
        b.hit_rate - a.hit_rate ||
        b.evaluated_signals -
          a.evaluated_signals,
    )[0];
  }, [eligibleMarkets]);


  /*
   * A timeframe is only eligible for a "best" comparison when:
   * 1. It has enough evaluated signals.
   * 2. At least two timeframes meet that evidence threshold.
   *
   * This prevents 5m from being called "best" when it is currently
   * the only timeframe with meaningful recorded data.
   */
  const eligibleTimeframes = useMemo(() => {
    return timeframes.filter(
      (item) =>
        item.evaluated_signals >=
        MINIMUM_RANKING_SIGNALS,
    );
  }, [timeframes]);


  const bestTimeframe = useMemo(() => {
    if (eligibleTimeframes.length < 2) {
      return null;
    }

    return [...eligibleTimeframes].sort(
      (a, b) =>
        b.hit_rate - a.hit_rate ||
        b.evaluated_signals -
          a.evaluated_signals,
    )[0];
  }, [eligibleTimeframes]);


  /*
   * Direction ranking is based on the controlled Strategy Lab sample.
   */
  const bestDirection = useMemo(() => {
    if (!analytics) {
      return null;
    }

    const candidates = [
      {
        direction: "UP" as const,
        stats: analytics.up,
      },
      {
        direction: "DOWN" as const,
        stats: analytics.down,
      },
    ].filter(
      (item) =>
        item.stats.signals >=
        MINIMUM_RANKING_SIGNALS,
    );

    if (candidates.length === 0) {
      return null;
    }

    return [...candidates].sort(
      (a, b) =>
        b.stats.accuracy -
        a.stats.accuracy ||
        b.stats.signals -
          a.stats.signals,
    )[0];
  }, [analytics]);


  const strongestConfidenceBand =
    useMemo(() => {
      if (!analytics) {
        return null;
      }

      const eligible =
        analytics.confidenceStats.filter(
          (item) =>
            item.signals >=
            MINIMUM_RANKING_SIGNALS,
        );

      if (eligible.length === 0) {
        return null;
      }

      return [...eligible].sort(
        (a, b) =>
          b.hitRate - a.hitRate ||
          b.signals - a.signals,
      )[0];
    }, [analytics]);


  const highestConfidenceSignals =
    useMemo(() => {
      if (!analytics) {
        return 0;
      }

      return analytics.confidenceStats
        .filter(
          (item) =>
            item.label === "80–89%" ||
            item.label === "90%+",
        )
        .reduce(
          (sum, item) =>
            sum + item.signals,
          0,
        );
    }, [analytics]);


  function handleBack() {
    router.back();
  }


  return (
    <>
      <SignalPilotNavigation />

      <ReturnToTop />

      <main className="min-h-screen bg-slate-50 text-slate-900 lg:ml-64">

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">

          {/* Header */}
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>

              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                <BarChart3 className="h-4 w-4" />
                SignalPilot AI
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Performance
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-slate-500">
                Historical outcome analysis, directional performance,
                confidence behaviour, return and risk metrics.
              </p>

            </div>


            <div className="flex flex-wrap items-center gap-2">

              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>


              <button
                type="button"
                onClick={loadAllPerformance}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh performance
              </button>

            </div>

          </div>


          {/* Loading state */}
          {loading && (
            <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-600">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Loading performance metrics...
              </div>
            </div>
          )}


          {/* Error */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}


          {/* Historical sample warning */}
          {summary && (
            <div className="mb-8 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">

              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

              <div>

                <p className="font-semibold text-amber-900">
                  Historical performance sample
                </p>

                <p className="mt-1 text-sm text-amber-800">
                  {sampleMessage}
                </p>

              </div>

            </div>
          )}


          {/* Performance overview */}
          <section className="mb-10">

            <div className="mb-4">

              <h2 className="text-lg font-bold text-slate-900">
                Performance overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Outcome-based metrics from completed signal evaluations
                recorded by the application.
              </p>

            </div>


            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">

              <MetricCard
                label="Evaluated"
                value={
                  summary?.evaluated_signals ??
                  0
                }
                icon={
                  <Target className="h-5 w-5" />
                }
              />

              <MetricCard
                label="Correct"
                value={
                  summary?.correct ?? 0
                }
                icon={
                  <CheckCircle2 className="h-5 w-5" />
                }
                iconClassName="text-emerald-600"
              />

              <MetricCard
                label="Incorrect"
                value={
                  summary?.incorrect ?? 0
                }
                icon={
                  <XCircle className="h-5 w-5" />
                }
                iconClassName="text-red-600"
              />

              <MetricCard
                label="Neutral"
                value={
                  summary?.neutral ?? 0
                }
                icon={
                  <Clock3 className="h-5 w-5" />
                }
                iconClassName="text-slate-500"
              />

              <MetricCard
                label="Hit rate"
                value={formatPercent(
                  summary?.hit_rate ?? 0,
                )}
                icon={
                  <BarChart3 className="h-5 w-5" />
                }
              />

              <MetricCard
                label="Avg confidence"
                value={formatPercent(
                  summary?.average_confidence ??
                    0,
                )}
                icon={
                  <Target className="h-5 w-5" />
                }
              />

            </div>

          </section>


          {/* Strategy Lab sample */}
          <section className="mb-10">

            <div className="mb-4">

              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">

                <div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Strategy Lab performance analytics
                  </h2>

                  <p className="mt-1 max-w-3xl text-sm text-slate-500">
                    A controlled historical research sample used to
                    examine directional accuracy, confidence behaviour,
                    hypothetical returns and risk characteristics.
                  </p>

                </div>


                {strategyData && (
                  <div className="text-xs font-medium text-slate-500">
                    {strategyData.backtest.symbol} ·{" "}
                    {strategyData.backtest.timeframe} ·{" "}
                    {strategyData.backtest.candles_used} candles
                  </div>
                )}

              </div>

            </div>


            {/* Dataset distinction */}
            <div className="mb-5 grid gap-4 md:grid-cols-2">

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">

                <div className="flex items-start gap-3">

                  <div className="rounded-lg bg-white p-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>

                  <div>

                    <p className="font-semibold text-blue-900">
                      Recorded Performance
                    </p>

                    <p className="mt-1 text-sm leading-6 text-blue-800">
                      Uses completed evaluations recorded by the
                      application after signals were generated.
                      This is SignalPilot&apos;s accumulated outcome
                      history.
                    </p>

                  </div>

                </div>

              </div>


              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">

                <div className="flex items-start gap-3">

                  <div className="rounded-lg bg-white p-2">
                    <Target className="h-5 w-5 text-indigo-600" />
                  </div>

                  <div>

                    <p className="font-semibold text-indigo-900">
                      Strategy Lab Research
                    </p>

                    <p className="mt-1 text-sm leading-6 text-indigo-800">
                      Uses a controlled historical candle sample to
                      investigate how the signal engine behaves under
                      a defined dataset.
                    </p>

                  </div>

                </div>

              </div>

            </div>


            {strategyError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {strategyError}
              </div>
            )}


            {strategyLoading ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Loading Strategy Lab analytics...
                </div>

              </div>
            ) : analytics &&
              strategyData ? (
              <>

                {/* Sample metadata */}
                <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  <InfoCard
                    label="Market"
                    value={
                      strategyData.backtest.symbol
                    }
                  />

                  <InfoCard
                    label="Timeframe"
                    value={
                      strategyData.backtest.timeframe
                    }
                  />

                  <InfoCard
                    label="Historical candles"
                    value={
                      strategyData.backtest.candles_used
                    }
                  />

                  <InfoCard
                    label="Minimum confidence"
                    value={formatPercent(
                      strategyData.backtest.minimum_confidence,
                    )}
                  />

                </div>


                {/* Main analytics */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">

                  <MetricCard
                    label="Directional accuracy"
                    value={formatPercent(
                      analytics.directionalAccuracy,
                    )}
                    icon={
                      <Target className="h-5 w-5" />
                    }
                  />

                  <MetricCard
                    label="Directional signals"
                    value={
                      analytics.directionalSignals
                    }
                    icon={
                      <BarChart3 className="h-5 w-5" />
                    }
                  />

                  <MetricCard
                    label="Correct"
                    value={
                      strategyData.backtest.correct
                    }
                    icon={
                      <CheckCircle2 className="h-5 w-5" />
                    }
                    iconClassName="text-emerald-600"
                  />

                  <MetricCard
                    label="Incorrect"
                    value={
                      strategyData.backtest.incorrect
                    }
                    icon={
                      <XCircle className="h-5 w-5" />
                    }
                    iconClassName="text-red-600"
                  />

                  <MetricCard
                    label="Win/loss ratio"
                    value={
                      Number.isFinite(
                        analytics.winLossRatio,
                      )
                        ? analytics.winLossRatio.toFixed(
                            2,
                          )
                        : "∞"
                    }
                    icon={
                      <BarChart3 className="h-5 w-5" />
                    }
                  />

                  <MetricCard
                    label="Profit factor"
                    value={
                      Number.isFinite(
                        analytics.profitFactor,
                      )
                        ? analytics.profitFactor.toFixed(
                            2,
                          )
                        : "∞"
                    }
                    icon={
                      <ShieldCheck className="h-5 w-5" />
                    }
                  />

                </div>


                {/* Research interpretation */}
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

                  <div className="flex items-start gap-3">

                    <div className="rounded-lg bg-slate-100 p-2">
                      <BarChart3 className="h-5 w-5 text-slate-600" />
                    </div>

                    <div>

                      <p className="font-semibold text-slate-900">
                        What this Strategy Lab sample tells us
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        The Strategy Lab sample is useful for researching
                        how SignalPilot behaves under a defined historical
                        dataset. It should not be treated as proof of future
                        trading performance or as a substitute for live
                        validation.
                      </p>

                    </div>

                  </div>

                </div>


                {/* Return and risk */}
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  <AnalyticsCard
                    label="Avg directional move"
                    value={formatChange(
                      analytics.averageDirectionalChange,
                    )}
                    description="Average hypothetical movement after accounting for signal direction."
                  />

                  <AnalyticsCard
                    label="Cumulative directional change"
                    value={formatChange(
                      strategyData.backtest
                        .cumulative_directional_change_percent,
                    )}
                    description="Sum of hypothetical directional moves."
                  />

                  <AnalyticsCard
                    label="Compounded directional return"
                    value={formatChange(
                      strategyData.backtest
                        .compounded_directional_return_percent,
                    )}
                    description="Hypothetical compounded sequence."
                  />

                  <AnalyticsCard
                    label="Maximum drawdown"
                    value={formatDrawdown(
                      strategyData.backtest
                        .maximum_drawdown_percent,
                    )}
                    description="Largest hypothetical peak-to-trough decline."
                    negative
                  />

                </div>


                {/* Performance by direction */}
                <div className="mt-8">

                  <div className="mb-4">

                    <h3 className="text-base font-bold text-slate-900">
                      Performance by direction
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Historical results separated between UP and DOWN
                      directional signals. Sample size is shown alongside
                      accuracy so small groups are not overinterpreted.
                    </p>

                  </div>


                  <div className="grid gap-4 md:grid-cols-2">

                    <DirectionCard
                      direction="UP"
                      stats={analytics.up}
                    />

                    <DirectionCard
                      direction="DOWN"
                      stats={analytics.down}
                    />

                  </div>

                </div>


                {/* Confidence calibration */}
                <div className="mt-8">

                  <div className="mb-4">

                    <h3 className="text-base font-bold text-slate-900">
                      Confidence calibration
                    </h3>

                    <p className="mt-1 max-w-3xl text-sm text-slate-500">
                      This is the most important confidence diagnostic:
                      does a higher SignalPilot confidence score actually
                      correspond with stronger historical outcomes?
                    </p>

                  </div>


                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

                    <div className="overflow-x-auto">

                      <table className="w-full text-left text-sm">

                        <thead className="border-b border-slate-200 bg-slate-50">

                          <tr className="text-slate-500">

                            <th className="px-5 py-4 font-semibold">
                              Confidence
                            </th>

                            <th className="px-5 py-4 font-semibold">
                              Signals
                            </th>

                            <th className="px-5 py-4 font-semibold">
                              Correct
                            </th>

                            <th className="px-5 py-4 font-semibold">
                              Incorrect
                            </th>

                            <th className="px-5 py-4 font-semibold">
                              Hit rate
                            </th>

                            <th className="px-5 py-4 font-semibold">
                              Avg change
                            </th>

                            <th className="px-5 py-4 font-semibold">
                              Cumulative
                            </th>

                            <th className="px-5 py-4 font-semibold">
                              Evidence
                            </th>

                          </tr>

                        </thead>


                        <tbody>

                          {analytics.confidenceStats.map(
                            (item) => (
                              <tr
                                key={item.label}
                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                              >

                                <td className="px-5 py-4 font-semibold text-slate-900">
                                  {item.label}
                                </td>

                                <td className="px-5 py-4 text-slate-600">
                                  {item.signals}
                                </td>

                                <td className="px-5 py-4 font-medium text-emerald-600">
                                  {item.correct}
                                </td>

                                <td className="px-5 py-4 font-medium text-red-600">
                                  {item.incorrect}
                                </td>

                                <td className="px-5 py-4 font-semibold text-slate-700">
                                  {item.signals > 0
                                    ? formatPercent(
                                        item.hitRate,
                                      )
                                    : "—"}
                                </td>

                                <td
                                  className={`px-5 py-4 font-medium ${
                                    item.averageChange >=
                                    0
                                      ? "text-emerald-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {item.signals > 0
                                    ? formatChange(
                                        item.averageChange,
                                      )
                                    : "—"}
                                </td>

                                <td
                                  className={`px-5 py-4 font-medium ${
                                    item.cumulativeChange >=
                                    0
                                      ? "text-emerald-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {item.signals > 0
                                    ? formatChange(
                                        item.cumulativeChange,
                                      )
                                    : "—"}
                                </td>

                                <td className="px-5 py-4">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEvidenceClassName(
                                      item.signals,
                                    )}`}
                                  >
                                    {getEvidenceLabel(
                                      item.signals,
                                    )}
                                  </span>
                                </td>

                              </tr>
                            ),
                          )}

                        </tbody>

                      </table>

                    </div>

                  </div>


                  <div className="mt-4 grid gap-4 md:grid-cols-3">

                    <AnalyticsCard
                      label="Strongest observed band"
                      value={
                        strongestConfidenceBand
                          ? strongestConfidenceBand.label
                          : "Not enough evidence"
                      }
                      description={
                        strongestConfidenceBand
                          ? `${formatPercent(
                              strongestConfidenceBand.hitRate,
                            )} hit rate from ${strongestConfidenceBand.signals} signals.`
                          : "No confidence band currently has enough observations for a meaningful ranking."
                      }
                    />


                    <AnalyticsCard
                      label="Highest-confidence signals"
                      value={String(
                        highestConfidenceSignals,
                      )}
                      description="Combined signals from the 80%+ confidence ranges in the selected Strategy Lab sample."
                    />


                    <AnalyticsCard
                      label="80%+ historical hit rate"
                      value={formatPercent(
                        (() => {
                          const highConfidence =
                            analytics.confidenceStats.filter(
                              (item) =>
                                item.label ===
                                  "80–89%" ||
                                item.label ===
                                  "90%+",
                            );

                          const correct =
                            highConfidence.reduce(
                              (sum, item) =>
                                sum +
                                item.correct,
                              0,
                            );

                          const incorrect =
                            highConfidence.reduce(
                              (sum, item) =>
                                sum +
                                item.incorrect,
                              0,
                            );

                          const total =
                            correct +
                            incorrect;

                          return total > 0
                            ? (correct /
                                total) *
                                100
                            : 0;
                        })(),
                      )}
                      description="A higher confidence score did not automatically produce a stronger result in this sample."
                    />

                  </div>


                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">

                    <p className="text-xs leading-5 text-amber-800">

                      <span className="font-semibold text-amber-900">
                        Calibration warning:
                      </span>{" "}

                      Confidence should not be interpreted as a guaranteed
                      probability of success. A confidence range can appear
                      strong or weak simply because it contains relatively
                      few observations. More historical observations across
                      different market conditions are required before using
                      confidence as a filtering rule.

                    </p>

                  </div>

                </div>


                {/* Recent evaluated signals */}
                <div className="mt-8">

                  <div className="mb-4">

                    <h3 className="text-base font-bold text-slate-900">
                      Recent evaluated signals
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      The latest evaluated signals from the selected
                      Strategy Lab historical sample.
                    </p>

                  </div>


                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

                    <div className="overflow-x-auto">

                      <table className="w-full text-left text-sm">

                        <thead className="border-b border-slate-200 bg-slate-50">

                          <tr className="text-slate-500">

                            <th className="px-5 py-4 font-semibold">
                              Time
                            </th>

                            <th className="px-5 py-4 font-semibold">
                              Direction
                            </th>

                            <th className="px-5 py-4 font-semibold">
                              Confidence
                            </th>

                            <th className="px-5 py-4 font-semibold">
                              Signal price
                            </th>

                            <th className="px-5 py-4 font-semibold">
                              Evaluation price
                            </th>

                            <th className="px-5 py-4 font-semibold">
                              Outcome
                            </th>

                            <th className="px-5 py-4 font-semibold">
                              Directional move
                            </th>

                          </tr>

                        </thead>


                        <tbody>

                          {recentSignals.map(
                            (result) => (
                              <tr
                                key={`${result.timestamp}-${result.signal_price}`}
                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                              >

                                <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                                  {formatTimestamp(
                                    result.timestamp,
                                  )}
                                </td>


                                <td className="px-5 py-4">

                                  <span
                                    className={`inline-flex items-center gap-1 font-semibold ${
                                      result.direction ===
                                      "UP"
                                        ? "text-emerald-600"
                                        : result.direction ===
                                            "DOWN"
                                          ? "text-red-600"
                                          : "text-slate-500"
                                    }`}
                                  >

                                    {result.direction ===
                                      "UP" && (
                                      <ArrowUpRight className="h-4 w-4" />
                                    )}

                                    {result.direction ===
                                      "DOWN" && (
                                      <ArrowDownRight className="h-4 w-4" />
                                    )}

                                    {result.direction ===
                                      "NEUTRAL" && (
                                      <Clock3 className="h-4 w-4" />
                                    )}

                                    {result.direction}

                                  </span>

                                </td>


                                <td className="px-5 py-4 font-medium text-slate-700">
                                  {formatPercent(
                                    result.confidence,
                                  )}
                                </td>


                                <td className="px-5 py-4 text-slate-600">
                                  {formatPrice(
                                    result.signal_price,
                                  )}
                                </td>


                                <td className="px-5 py-4 text-slate-600">
                                  {formatPrice(
                                    result.evaluation_price,
                                  )}
                                </td>


                                <td className="px-5 py-4">
                                  <OutcomeBadge
                                    outcome={
                                      result.outcome
                                    }
                                  />
                                </td>


                                <td
                                  className={`px-5 py-4 font-medium ${
                                    result.hypothetical_directional_change_percent >=
                                    0
                                      ? "text-emerald-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {formatChange(
                                    result.hypothetical_directional_change_percent,
                                  )}
                                </td>

                              </tr>
                            ),
                          )}

                        </tbody>

                      </table>

                    </div>

                  </div>

                </div>


                {/* Analytics disclosure */}
                <div className="mt-4 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">

                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                  <div>

                    <p className="font-semibold text-blue-900">
                      Research-only performance analytics
                    </p>

                    <p className="mt-1 text-sm leading-6 text-blue-800">
                      These metrics describe the selected historical
                      Strategy Lab sample. Hypothetical directional
                      changes are analytical measurements, not actual
                      trading returns, and historical performance does
                      not guarantee future results.
                    </p>

                  </div>

                </div>

              </>
            ) : null}

          </section>


          {/* Recorded confidence analysis */}
          <section className="mb-10">

            <div className="mb-4">

              <h2 className="text-lg font-bold text-slate-900">
                Recorded signal confidence analysis
              </h2>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                This section uses completed evaluations recorded by the
                application. It is separate from the controlled Strategy
                Lab research sample above.
              </p>

            </div>


            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">

                <div className="flex items-start gap-3">

                  <div className="rounded-lg bg-white p-2 shadow-sm">
                    <Target className="h-5 w-5 text-slate-600" />
                  </div>

                  <div>

                    <p className="font-semibold text-slate-900">
                      Confidence calibration view
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      The sample size behind each confidence range matters
                      just as much as the displayed hit rate.
                    </p>

                  </div>

                </div>

              </div>


              {confidenceRanges.length ===
              0 ? (
                <EmptyState text="No evaluated confidence-range results yet." />
              ) : (
                <div className="overflow-x-auto">

                  <table className="w-full text-left text-sm">

                    <thead className="border-b border-slate-200 bg-white">

                      <tr className="text-slate-500">

                        <th className="px-5 py-4 font-semibold">
                          Confidence range
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Signals
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Correct
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Incorrect
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Neutral
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Hit rate
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Avg confidence
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Evidence
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {confidenceRanges.map(
                        (item) => {
                          const hasData =
                            item.evaluated_signals >
                            0;

                          return (
                            <tr
                              key={
                                item.range
                              }
                              className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                            >

                              <td className="px-5 py-4">
                                <span className="font-semibold text-slate-900">
                                  {item.range}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-slate-600">
                                {
                                  item.evaluated_signals
                                }
                              </td>

                              <td className="px-5 py-4 font-medium text-emerald-600">
                                {item.correct}
                              </td>

                              <td className="px-5 py-4 font-medium text-red-600">
                                {item.incorrect}
                              </td>

                              <td className="px-5 py-4 text-slate-500">
                                {item.neutral}
                              </td>

                              <td className="px-5 py-4">

                                {hasData ? (
                                  <span className="font-semibold text-slate-700">
                                    {formatPercent(
                                      item.hit_rate,
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">
                                    —
                                  </span>
                                )}

                              </td>

                              <td className="px-5 py-4 text-slate-700">

                                {hasData
                                  ? formatPercent(
                                      item.average_confidence,
                                    )
                                  : "—"}

                              </td>

                              <td className="px-5 py-4">

                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEvidenceClassName(
                                    item.evaluated_signals,
                                  )}`}
                                >
                                  {getEvidenceLabel(
                                    item.evaluated_signals,
                                  )}
                                </span>

                              </td>

                            </tr>
                          );
                        },
                      )}

                    </tbody>

                  </table>

                </div>
              )}


              <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">

                <p className="text-xs leading-5 text-slate-500">

                  <span className="font-semibold text-slate-700">
                    Interpretation:
                  </span>{" "}

                  A meaningful confidence calibration assessment requires
                  a sufficiently large number of evaluated signals across
                  multiple confidence ranges. A high hit rate based on a
                  very small sample should not be treated as evidence that
                  the confidence score is calibrated.

                </p>

              </div>

            </div>

          </section>


          {/* Where does SignalPilot perform best? */}
          <section className="mb-10">

            <div className="mb-4">

              <h2 className="text-lg font-bold text-slate-900">
                Where does SignalPilot perform best?
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Historical comparisons across direction, market and
                timeframe. Rankings require at least{" "}
                {MINIMUM_RANKING_SIGNALS} evaluated signals so that
                very small samples are not presented as strong evidence.
              </p>

            </div>


            <div className="grid gap-4 md:grid-cols-3">

              <RankingCard
                title="Best-supported direction"
                icon={
                  bestDirection?.direction ===
                  "UP" ? (
                    <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-red-600" />
                  )
                }
                value={
                  bestDirection
                    ? bestDirection.direction
                    : "Not enough evidence"
                }
                description={
                  bestDirection
                    ? `${formatPercent(
                        bestDirection.stats.accuracy,
                      )} from ${
                        bestDirection.stats.signals
                      } evaluated signals`
                    : `No direction currently has at least ${MINIMUM_RANKING_SIGNALS} evaluated signals.`
                }
                evidence={
                  bestDirection
                    ? getEvidenceLabel(
                        bestDirection.stats.signals,
                      )
                    : "No sample"
                }
                evidenceCount={
                  bestDirection?.stats.signals ??
                  0
                }
              />


                            <RankingCard
                title="Best-supported market"
                icon={
                  <TrendingUp className="h-5 w-5 text-slate-600" />
                }
                value={
                  bestMarket
                    ? bestMarket.market
                    : "No reliable ranking yet"
                }
                description={
                  bestMarket
                    ? `${formatPercent(
                        bestMarket.hit_rate,
                      )} from ${
                        bestMarket.evaluated_signals
                      } evaluated signals`
                    : eligibleMarkets.length === 1
                      ? `${eligibleMarkets[0].market} has enough data, but another market needs at least ${MINIMUM_RANKING_SIGNALS} evaluated signals before a comparison is meaningful.`
                      : `No market currently has enough data for a reliable comparison.`
                }
                evidence={
                  bestMarket
                    ? getEvidenceLabel(
                        bestMarket.evaluated_signals,
                      )
                    : "Comparison pending"
                }
                evidenceCount={
                  bestMarket?.evaluated_signals ??
                  eligibleMarkets[0]?.evaluated_signals ??
                  0
                }
              />


                            <RankingCard
                title="Best-supported timeframe"
                icon={
                  <Clock3 className="h-5 w-5 text-slate-600" />
                }
                value={
                  bestTimeframe
                    ? bestTimeframe.timeframe
                    : "No reliable ranking yet"
                }
                description={
                  bestTimeframe
                    ? `${formatPercent(
                        bestTimeframe.hit_rate,
                      )} from ${
                        bestTimeframe.evaluated_signals
                      } evaluated signals`
                    : eligibleTimeframes.length === 1
                      ? `${eligibleTimeframes[0].timeframe} has enough data, but another timeframe needs at least ${MINIMUM_RANKING_SIGNALS} evaluated signals before a comparison is meaningful.`
                      : `No timeframe currently has enough data for a reliable comparison.`
                }
                evidence={
                  bestTimeframe
                    ? getEvidenceLabel(
                        bestTimeframe.evaluated_signals,
                      )
                    : "Comparison pending"
                }
                evidenceCount={
                  bestTimeframe?.evaluated_signals ??
                  eligibleTimeframes[0]?.evaluated_signals ??
                  0
                }
              />

            </div>

          </section>


          {/* Performance by market */}
          <section className="mb-10">

            <div className="mb-4">

              <h2 className="text-lg font-bold text-slate-900">
                Performance by market
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Historical outcomes grouped by market. Sample size is
                displayed beside each result to avoid overinterpreting
                small datasets.
              </p>

            </div>


            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

              {markets.length ===
              0 ? (
                <EmptyState text="No evaluated market results yet." />
              ) : (
                <div className="overflow-x-auto">

                  <table className="w-full text-left text-sm">

                    <thead className="border-b border-slate-200 bg-slate-50">

                      <tr className="text-slate-500">

                        <th className="px-5 py-4 font-semibold">
                          Market
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Evaluated
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Evidence
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Correct
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Incorrect
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Neutral
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Hit rate
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Avg confidence
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Avg change
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {markets.map(
                        (item) => (
                          <tr
                            key={
                              item.market
                            }
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                          >

                            <td className="px-5 py-4 font-semibold text-slate-900">
                              {item.market}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {
                                item.evaluated_signals
                              }
                            </td>

                            <td className="px-5 py-4">

                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEvidenceClassName(
                                  item.evaluated_signals,
                                )}`}
                              >
                                {getEvidenceLabel(
                                  item.evaluated_signals,
                                )}
                              </span>

                            </td>

                            <td className="px-5 py-4 font-medium text-emerald-600">
                              {item.correct}
                            </td>

                            <td className="px-5 py-4 font-medium text-red-600">
                              {item.incorrect}
                            </td>

                            <td className="px-5 py-4 text-slate-500">
                              {item.neutral}
                            </td>

                            <td className="px-5 py-4 font-medium text-slate-700">
                              {formatPercent(
                                item.hit_rate,
                              )}
                            </td>

                            <td className="px-5 py-4 text-slate-700">
                              {formatPercent(
                                item.average_confidence,
                              )}
                            </td>

                            <td
                              className={`px-5 py-4 font-medium ${
                                item.average_price_change_percent >=
                                0
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              }`}
                            >
                              {formatChange(
                                item.average_price_change_percent,
                              )}
                            </td>

                          </tr>
                        ),
                      )}

                    </tbody>

                  </table>

                </div>
              )}

            </div>

          </section>


          {/* Performance by timeframe */}
          <section className="mb-10">

            <div className="mb-4">

              <h2 className="text-lg font-bold text-slate-900">
                Performance by timeframe
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Historical outcomes grouped by signal timeframe. A
                timeframe with very few evaluations should not automatically
                be considered the strongest configuration.
              </p>

            </div>


            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

              {timeframes.length ===
              0 ? (
                <EmptyState text="No evaluated timeframe results yet." />
              ) : (
                <div className="overflow-x-auto">

                  <table className="w-full text-left text-sm">

                    <thead className="border-b border-slate-200 bg-slate-50">

                      <tr className="text-slate-500">

                        <th className="px-5 py-4 font-semibold">
                          Timeframe
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Evaluated
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Evidence
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Correct
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Incorrect
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Neutral
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Hit rate
                        </th>

                        <th className="px-5 py-4 font-semibold">
                          Avg confidence
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {timeframes.map(
                        (item) => (
                          <tr
                            key={
                              item.timeframe
                            }
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                          >

                            <td className="px-5 py-4 font-semibold text-slate-900">
                              {item.timeframe}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {
                                item.evaluated_signals
                              }
                            </td>

                            <td className="px-5 py-4">

                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEvidenceClassName(
                                  item.evaluated_signals,
                                )}`}
                              >
                                {getEvidenceLabel(
                                  item.evaluated_signals,
                                )}
                              </span>

                            </td>

                            <td className="px-5 py-4 font-medium text-emerald-600">
                              {item.correct}
                            </td>

                            <td className="px-5 py-4 font-medium text-red-600">
                              {item.incorrect}
                            </td>

                            <td className="px-5 py-4 text-slate-500">
                              {item.neutral}
                            </td>

                            <td className="px-5 py-4 font-medium text-slate-700">
                              {formatPercent(
                                item.hit_rate,
                              )}
                            </td>

                            <td className="px-5 py-4 text-slate-700">
                              {formatPercent(
                                item.average_confidence,
                              )}
                            </td>

                          </tr>
                        ),
                      )}

                    </tbody>

                  </table>

                </div>
              )}

            </div>

          </section>


          {/* Methodology */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-start gap-3">

              <div className="rounded-lg bg-slate-100 p-2">
                <BarChart3 className="h-5 w-5 text-slate-600" />
              </div>

              <div>

                <h2 className="text-lg font-bold text-slate-900">
                  How performance is calculated
                </h2>


                <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">

                  <p>

                    <span className="font-semibold text-slate-900">
                      Historical hit rate
                    </span>{" "}

                    is calculated from evaluated directional signals:
                    correct outcomes divided by correct plus incorrect
                    outcomes. Neutral outcomes are excluded from the
                    hit-rate denominator.

                  </p>


                  <p>

                    <span className="font-semibold text-slate-900">
                      Directional performance
                    </span>{" "}

                    adjusts the observed price movement according to the
                    signal direction. For an UP signal, a positive price
                    change is favourable; for a DOWN signal, a negative
                    price change is favourable.

                  </p>


                  <p>

                    <span className="font-semibold text-slate-900">
                      Profit factor
                    </span>{" "}

                    compares the total magnitude of hypothetical winning
                    directional moves with the total magnitude of
                    hypothetical losing directional moves. It is an
                    analytical research metric rather than actual trading
                    profitability.

                  </p>


                  <p>

                    <span className="font-semibold text-slate-900">
                      Maximum drawdown
                    </span>{" "}

                    measures the largest hypothetical peak-to-trough
                    decline in the directional performance sequence.
                    It is displayed as a negative percentage because it
                    represents a decline from a previous peak.

                  </p>


                  <p>

                    <span className="font-semibold text-slate-900">
                      Model confidence
                    </span>{" "}

                    is SignalPilot&apos;s analytical confidence score. It is
                    not the same thing as historical accuracy and should
                    not be interpreted as a guaranteed probability of
                    success.

                  </p>


                  <p>

                    <span className="font-semibold text-slate-900">
                      Confidence calibration
                    </span>{" "}

                    examines whether signals with different confidence
                    scores actually demonstrate different historical
                    outcome rates. A useful calibration relationship
                    requires many observations across multiple market
                    conditions.

                  </p>


                  <p>

                    <span className="font-semibold text-slate-900">
                      Sample quality
                    </span>{" "}

                    is shown to prevent small groups from being treated as
                    statistically strong evidence. A result from one or
                    five signals is substantially less informative than
                    a result from a much larger sample.

                  </p>


                  <p>

                    <span className="font-semibold text-slate-900">
                      Best-supported rankings
                    </span>{" "}

                    require at least{" "}
                    {MINIMUM_RANKING_SIGNALS} evaluated signals. This is
                    a practical evidence threshold for the interface,
                    not a formal statistical significance test.

                  </p>


                  <p>

                    <span className="font-semibold text-slate-900">
                      Average price change
                    </span>{" "}

                    shows the observed percentage change between the
                    signal price and its evaluation price. It is provided
                    as an analytical measurement and does not represent
                    investment return.

                  </p>

                </div>

              </div>

            </div>

          </section>


          {/* Final interpretation */}
          <section className="mt-8 rounded-xl border border-indigo-200 bg-indigo-50 p-6">

            <div className="flex items-start gap-3">

              <div className="rounded-lg bg-white p-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
              </div>

              <div>

                <h2 className="text-lg font-bold text-indigo-900">
                  Performance interpretation
                </h2>

                <div className="mt-3 space-y-3 text-sm leading-6 text-indigo-800">

                  <p>
                    SignalPilot should not use a confidence score by itself
                    as proof that a signal is likely to succeed.
                  </p>

                  <p>
                    The current Strategy Lab evidence should be treated as
                    an early research signal. If one confidence band performs
                    better than another, the result needs to persist across
                    a much larger sample and different market conditions
                    before becoming a production filtering rule.
                  </p>

                  <p>
                    Direction, market and timeframe comparisons should also
                    be interpreted together with sample size. The strongest
                    percentage is not necessarily the strongest evidence when
                    it comes from only a handful of observations.
                  </p>

                  <p>
                    The long-term goal is to collect enough evaluated signals
                    to determine whether SignalPilot&apos;s confidence score
                    is genuinely calibrated and whether certain markets,
                    directions or timeframes consistently produce stronger
                    historical results.
                  </p>

                </div>

              </div>

            </div>

          </section>

        </div>

      </main>
    </>
  );
}


function MetricCard({
  label,
  value,
  icon,
  iconClassName = "text-slate-500",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow">

      <div className="mb-4 flex items-center justify-between">

        <div className={iconClassName}>
          {icon}
        </div>

      </div>


      <div className="text-2xl font-bold text-slate-900">
        {value}
      </div>


      <div className="mt-1 text-sm font-medium text-slate-500">
        {label}
      </div>

    </div>
  );
}


function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-lg font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}


function AnalyticsCard({
  label,
  value,
  description,
  negative = false,
}: {
  label: string;
  value: string;
  description: string;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${
          negative
            ? "text-red-600"
            : "text-slate-900"
        }`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-400">
        {description}
      </p>

    </div>
  );
}


function RankingCard({
  title,
  icon,
  value,
  description,
  evidence,
  evidenceCount,
}: {
  title: string;
  icon: React.ReactNode;
  value: string;
  description: string;
  evidence: string;
  evidenceCount: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <p className="text-sm font-semibold text-slate-500">
          {title}
        </p>

        {icon}

      </div>


      <p className="mt-4 text-2xl font-bold text-slate-900">
        {value}
      </p>


      <p className="mt-1 text-sm text-slate-600">
        {description}
      </p>


      <div className="mt-4 flex items-center justify-between">

        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEvidenceClassName(
            evidenceCount,
          )}`}
        >
          Evidence quality: {evidence}
        </span>

        {evidenceCount > 0 && (
          <span className="text-xs font-medium text-slate-400">
            {evidenceCount} signals
          </span>
        )}

      </div>

    </div>
  );
}


function DirectionCard({
  direction,
  stats,
}: {
  direction: "UP" | "DOWN";
  stats: {
    signals: number;
    correct: number;
    incorrect: number;
    accuracy: number;
    averageChange: number;
    cumulativeChange: number;
  };
}) {
  const isUp = direction === "UP";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-3">

          <div
            className={`rounded-lg p-2 ${
              isUp
                ? "bg-emerald-50"
                : "bg-red-50"
            }`}
          >
            {isUp ? (
              <ArrowUpRight className="h-5 w-5 text-emerald-600" />
            ) : (
              <ArrowDownRight className="h-5 w-5 text-red-600" />
            )}
          </div>


          <div>

            <p className="font-bold text-slate-900">
              {direction} signals
            </p>

            <p className="text-xs text-slate-500">
              {stats.signals} evaluated directional signals
            </p>

          </div>

        </div>


        <div
          className={`text-xl font-bold ${
            isUp
              ? "text-emerald-600"
              : "text-red-600"
          }`}
        >
          {formatPercent(
            stats.accuracy,
          )}
        </div>

      </div>


      <div className="mt-3">

        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEvidenceClassName(
            stats.signals,
          )}`}
        >
          Evidence quality:{" "}
          {getEvidenceLabel(
            stats.signals,
          )}
        </span>

      </div>


      <div className="mt-5 grid grid-cols-2 gap-4">

        <SmallStat
          label="Correct"
          value={stats.correct}
        />

        <SmallStat
          label="Incorrect"
          value={stats.incorrect}
        />

        <SmallStat
          label="Avg change"
          value={formatChange(
            stats.averageChange,
          )}
        />

        <SmallStat
          label="Cumulative"
          value={formatChange(
            stats.cumulativeChange,
          )}
        />

      </div>

    </div>
  );
}


function SmallStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">

      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}


function OutcomeBadge({
  outcome,
}: {
  outcome:
    | "CORRECT"
    | "INCORRECT"
    | "NEUTRAL";
}) {
  if (outcome === "CORRECT") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">

        <CheckCircle2 className="h-3.5 w-3.5" />

        Correct

      </span>
    );
  }


  if (outcome === "INCORRECT") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">

        <XCircle className="h-3.5 w-3.5" />

        Incorrect

      </span>
    );
  }


  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">

      <Clock3 className="h-3.5 w-3.5" />

      Neutral

    </span>
  );
}


function OutcomeCard({
  label,
  value,
  total,
  icon,
  iconClassName = "text-slate-500",
}: {
  label: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  iconClassName?: string;
}) {
  const percentage =
    total > 0
      ? (value / total) * 100
      : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>

        </div>


        <div className={iconClassName}>
          {icon}
        </div>

      </div>


      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">

        <div
          className="h-full rounded-full bg-slate-400 transition-all"
          style={{
            width: `${Math.min(
              percentage,
              100,
            )}%`,
          }}
        />

      </div>


      <p className="mt-2 text-xs text-slate-500">
        {formatPercent(
          percentage,
        )}{" "}
        of evaluated signals
      </p>

    </div>
  );
}


function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="px-5 py-10 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}