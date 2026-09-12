"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock3,
  LineChart,
  Play,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp,
  XCircle,
  Minus,
  ChevronLeft,
} from "lucide-react";

import {
  runStrategyLabBacktest,
  type StrategyLabResponse,
  type StrategyLabResult,
  type StrategyLabSummary,
} from "@/lib/signalpilot-api";

import SignalPilotNavigation from "@/components/SignalPilotNavigation";
import ReturnToTop from "@/components/ReturnToTop";


const MARKET_OPTIONS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "XAU/USD",
];


const TIMEFRAME_OPTIONS = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
  "1d",
];


const CANDLE_OPTIONS = [
  52,
  100,
  250,
  500,
];


const CONFIDENCE_THRESHOLDS = [
  0,
  50,
  60,
  70,
  80,
  90,
];


const CONFIDENCE_BANDS = [
  {
    label: "0–49%",
    min: 0,
    max: 50,
  },
  {
    label: "50–59%",
    min: 50,
    max: 60,
  },
  {
    label: "60–69%",
    min: 60,
    max: 70,
  },
  {
    label: "70–79%",
    min: 70,
    max: 80,
  },
  {
    label: "80–89%",
    min: 80,
    max: 90,
  },
  {
    label: "90%+",
    min: 90,
    max: Infinity,
  },
];


type ThresholdResult = {
  threshold: number;
  summary: StrategyLabSummary;
};


type DirectionPerformance = {
  direction: "UP" | "DOWN";
  signals: number;
  correct: number;
  incorrect: number;
  neutral: number;
  hitRate: number;
  cumulativeChange: number;
  averageChange: number;
};


type ConfidenceBandPerformance = {
  label: string;
  signals: number;
  correct: number;
  incorrect: number;
  neutral: number;
  hitRate: number;
  cumulativeChange: number;
  averageChange: number;
};


type PerformanceAnalytics = {
  directionalSignals: number;
  correct: number;
  incorrect: number;
  neutral: number;
  hitRate: number;
  averageTrade: number;
  averageWin: number | null;
  averageLoss: number | null;
  winLossRatio: number | null;
  profitFactor: number | null;
  totalWinningChange: number;
  totalLosingChange: number;
  bestTrade: number;
  worstTrade: number;
  up: DirectionPerformance;
  down: DirectionPerformance;
  confidenceBands: ConfidenceBandPerformance[];
};


export default function StrategyLabPage() {
  const router = useRouter();

  const [symbol, setSymbol] =
    useState("EUR/USD");

  const [timeframe, setTimeframe] =
    useState("5m");

  const [limit, setLimit] =
    useState(100);

  const [minimumConfidence, setMinimumConfidence] =
    useState(0);

  const [data, setData] =
    useState<StrategyLabResponse | null>(null);

  const [thresholdResults, setThresholdResults] =
    useState<ThresholdResult[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [analysisLoading, setAnalysisLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [analysisError, setAnalysisError] =
    useState<string | null>(null);


  async function handleBacktest() {
    try {
      setLoading(true);
      setError(null);
      setAnalysisError(null);
      setThresholdResults([]);

      const response =
        await runStrategyLabBacktest(
          symbol,
          timeframe,
          limit,
          minimumConfidence,
        );

      setData(response);

    } catch (err) {
      console.error(
        "SignalPilot Strategy Lab error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to run the backtest.",
      );
    } finally {
      setLoading(false);
    }
  }


  async function handleThresholdAnalysis() {
    try {
      setAnalysisLoading(true);
      setAnalysisError(null);

      const responses: ThresholdResult[] = [];

      for (const threshold of CONFIDENCE_THRESHOLDS) {
        const response =
          await runStrategyLabBacktest(
            symbol,
            timeframe,
            limit,
            threshold,
          );

        responses.push({
          threshold,
          summary: response.backtest,
        });
      }

      setThresholdResults(responses);

    } catch (err) {
      console.error(
        "SignalPilot confidence analysis error:",
        err,
      );

      setAnalysisError(
        err instanceof Error
          ? err.message
          : "Unable to run confidence analysis.",
      );
    } finally {
      setAnalysisLoading(false);
    }
  }


  function handleReset() {
    setSymbol("EUR/USD");
    setTimeframe("5m");
    setLimit(100);
    setMinimumConfidence(0);
    setData(null);
    setThresholdResults([]);
    setError(null);
    setAnalysisError(null);
  }


  function handleBack() {
    router.back();
  }


  const summary =
    data?.backtest;


  const bestThreshold =
    thresholdResults.length > 0
      ? thresholdResults.reduce(
          (best, current) => {
            if (
              current.summary.hit_rate >
              best.summary.hit_rate
            ) {
              return current;
            }

            if (
              current.summary.hit_rate ===
                best.summary.hit_rate &&
              current.summary.signals_evaluated >
                best.summary.signals_evaluated
            ) {
              return current;
            }

            return best;
          },
        )
      : null;


  const analytics =
    data
      ? calculatePerformanceAnalytics(
          data.results,
        )
      : null;


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      <SignalPilotNavigation />

      <ReturnToTop />


      <main className="min-h-screen px-5 py-8 sm:px-8 lg:ml-64">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <section className="mb-8">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <div className="mb-3 flex items-center gap-2">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                  <BarChart3 className="h-5 w-5" />
                </div>

                <span className="text-sm font-semibold text-blue-600">
                  SignalPilot
                </span>

              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Strategy Lab
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Test SignalPilot's historical signals against
                subsequent market price movement using the
                same signal engine used by the platform.
              </p>

            </div>


            <div className="flex flex-col gap-2 sm:flex-row">

              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>


              {data && (
                <button
                  onClick={handleReset}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset
                </button>
              )}

            </div>

          </div>

        </section>


        {/* Configuration */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="mb-5 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Target className="h-5 w-5" />
            </div>

            <div>

              <h2 className="font-bold text-slate-900">
                Backtest configuration
              </h2>

              <p className="text-xs text-slate-500">
                Choose the historical test parameters.
              </p>

            </div>

          </div>


          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            {/* Market */}
            <div>

              <label
                htmlFor="strategy-market"
                className="mb-2 block text-xs font-semibold text-slate-600"
              >
                Market
              </label>

              <select
                id="strategy-market"
                value={symbol}
                onChange={(event) =>
                  setSymbol(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {MARKET_OPTIONS.map((market) => (
                  <option
                    key={market}
                    value={market}
                  >
                    {market}
                  </option>
                ))}
              </select>

            </div>


            {/* Timeframe */}
            <div>

              <label
                htmlFor="strategy-timeframe"
                className="mb-2 block text-xs font-semibold text-slate-600"
              >
                Timeframe
              </label>

              <select
                id="strategy-timeframe"
                value={timeframe}
                onChange={(event) =>
                  setTimeframe(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {TIMEFRAME_OPTIONS.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>

            </div>


            {/* Candles */}
            <div>

              <label
                htmlFor="strategy-candles"
                className="mb-2 block text-xs font-semibold text-slate-600"
              >
                Historical candles
              </label>

              <select
                id="strategy-candles"
                value={limit}
                onChange={(event) =>
                  setLimit(
                    Number(event.target.value),
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {CANDLE_OPTIONS.map((count) => (
                  <option
                    key={count}
                    value={count}
                  >
                    {count} candles
                  </option>
                ))}
              </select>

            </div>


            {/* Confidence */}
            <div>

              <label
                htmlFor="strategy-confidence"
                className="mb-2 block text-xs font-semibold text-slate-600"
              >
                Minimum confidence
              </label>

              <select
                id="strategy-confidence"
                value={minimumConfidence}
                onChange={(event) =>
                  setMinimumConfidence(
                    Number(event.target.value),
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value={0}>
                  0% — All signals
                </option>

                <option value={50}>
                  50%+
                </option>

                <option value={60}>
                  60%+
                </option>

                <option value={70}>
                  70%+
                </option>

                <option value={80}>
                  80%+
                </option>

                <option value={90}>
                  90%+
                </option>

              </select>

            </div>

          </div>


          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-start gap-2 text-xs leading-5 text-slate-500">

              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

              <span>
                Each signal is evaluated against the next
                available candle. This is a historical
                research tool, not a guarantee of future
                trading performance.
              </span>

            </div>


            <button
              onClick={handleBacktest}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Running backtest...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Backtest
                </>
              )}
            </button>

          </div>

        </section>


        {/* Error */}
        {error && (
          <section className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5">

            <div className="flex items-start gap-3">

              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>

                <p className="font-semibold text-red-800">
                  Backtest failed
                </p>

                <p className="mt-1 text-sm leading-5 text-red-700">
                  {error}
                </p>

              </div>

            </div>

          </section>
        )}


        {/* Empty state */}
        {!data && !loading && !error && (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <LineChart className="h-7 w-7" />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Ready to test a strategy
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Configure the market, timeframe, historical
              candle count and confidence threshold, then
              run a backtest to see how SignalPilot's
              historical signals performed.
            </p>

          </section>
        )}


        {/* Loading */}
        {loading && (
          <section className="space-y-4">

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              {Array.from({ length: 4 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
                  />
                ),
              )}

            </div>

          </section>
        )}


        {/* Results */}
        {summary && !loading && (
          <>

            {/* Result header */}
            <section className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h2 className="text-xl font-bold text-slate-900">
                  Backtest results
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {summary.symbol} · {summary.timeframe} ·{" "}
                  {summary.candles_used} candles
                </p>

              </div>


              <div className="flex items-center gap-2 text-xs text-slate-500">

                <Clock3 className="h-4 w-4" />

                {summary.signals_evaluated} signals evaluated

              </div>

            </section>


            {/* Main metrics */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <MetricCard
                icon={
                  <Target className="h-5 w-5" />
                }
                label="Hit rate"
                value={`${summary.hit_rate.toFixed(2)}%`}
                detail={`${summary.correct} correct / ${summary.correct + summary.incorrect} directional`}
                emphasis
              />


              <MetricCard
                icon={
                  <CheckCircle2 className="h-5 w-5" />
                }
                label="Correct"
                value={String(summary.correct)}
                detail="Successful signals"
              />


              <MetricCard
                icon={
                  <XCircle className="h-5 w-5" />
                }
                label="Incorrect"
                value={String(summary.incorrect)}
                detail="Unsuccessful signals"
              />


              <MetricCard
                icon={
                  <Minus className="h-5 w-5" />
                }
                label="Neutral"
                value={String(summary.neutral)}
                detail="No directional outcome"
              />

            </section>


            {/* Signal processing */}
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <MetricCard
                icon={
                  <Activity className="h-5 w-5" />
                }
                label="Signals generated"
                value={String(summary.signals_generated)}
                detail={`${summary.possible_evaluations} possible evaluations`}
              />


              <MetricCard
                icon={
                  <ShieldCheck className="h-5 w-5" />
                }
                label="Signals filtered"
                value={String(summary.signals_filtered)}
                detail={`Below ${summary.minimum_confidence}% confidence`}
              />


              <MetricCard
                icon={
                  <BarChart3 className="h-5 w-5" />
                }
                label="Signals evaluated"
                value={String(summary.signals_evaluated)}
                detail="Included in results"
              />


              <MetricCard
                icon={
                  <Brain className="h-5 w-5" />
                }
                label="Average confidence"
                value={`${summary.average_confidence.toFixed(2)}%`}
                detail="Evaluated signals"
              />

            </section>


            {/* Performance */}
            <section className="mt-6 grid gap-6 xl:grid-cols-2">

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>

                  <div>

                    <h3 className="font-bold text-slate-900">
                      Direction distribution
                    </h3>

                    <p className="text-xs text-slate-500">
                      Signals included in the backtest
                    </p>

                  </div>

                </div>


                <div className="mt-6 space-y-4">

                  <DistributionRow
                    label="UP"
                    value={summary.up_signals}
                    total={summary.signals_evaluated}
                    type="up"
                  />

                  <DistributionRow
                    label="DOWN"
                    value={summary.down_signals}
                    total={summary.signals_evaluated}
                    type="down"
                  />

                  <DistributionRow
                    label="NEUTRAL"
                    value={summary.neutral_signals}
                    total={summary.signals_evaluated}
                    type="neutral"
                  />

                </div>

              </div>


              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>

                  <div>

                    <h3 className="font-bold text-slate-900">
                      Return & risk
                    </h3>

                    <p className="text-xs text-slate-500">
                      Hypothetical directional performance
                    </p>

                  </div>

                </div>


                <div className="mt-5 grid grid-cols-2 gap-3">

                  <ResultBox
                    label="Cumulative return"
                    value={formatPercent(
                      summary.cumulative_directional_change_percent,
                    )}
                  />

                  <ResultBox
                    label="Compounded return"
                    value={formatPercent(
                      summary.compounded_directional_return_percent,
                    )}
                  />

                  <ResultBox
                    label="Maximum drawdown"
                    value={formatPercent(
                      -summary.maximum_drawdown_percent,
                    )}
                  />

                  <ResultBox
                    label="Average price change"
                    value={formatPercent(
                      summary.average_price_change_percent,
                    )}
                  />

                  <ResultBox
                    label="Best trade"
                    value={formatPercent(
                      summary.best_trade_percent,
                    )}
                  />

                  <ResultBox
                    label="Worst trade"
                    value={formatPercent(
                      summary.worst_trade_percent,
                    )}
                  />

                </div>

              </div>

            </section>


            {/* Performance Analytics */}
            {analytics && (
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-200 px-5 py-5 sm:px-6">

                  <div className="flex items-start gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <BarChart3 className="h-5 w-5" />
                    </div>

                    <div>

                      <h3 className="font-bold text-slate-900">
                        Performance Analytics
                      </h3>

                      <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                        Deeper analysis of directional accuracy,
                        hypothetical trade outcomes, direction bias
                        and performance across confidence bands.
                      </p>

                    </div>

                  </div>

                </div>


                {/* Analytics headline metrics */}
                <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-6 sm:p-6">

                  <AnalyticsMetric
                    label="Directional accuracy"
                    value={`${analytics.hitRate.toFixed(2)}%`}
                    detail={`${analytics.correct} wins / ${analytics.directionalSignals} directional`}
                  />

                  <AnalyticsMetric
  label="Average change"
  value={formatPercent(
    analytics.averageTrade,
  )}
  detail="Per directional signal"
  valueTone={
    analytics.averageTrade > 0
      ? "positive"
      : analytics.averageTrade < 0
        ? "negative"
        : "neutral"
  }
/>

                  <AnalyticsMetric
                    label="Average winning move"
                    value={
                      analytics.averageWin === null
                        ? "N/A"
                        : formatPercent(
                            analytics.averageWin,
                          )
                    }
                    detail="Correct signals"
                    valueTone="positive"
                  />

                  <AnalyticsMetric
                    label="Average losing move"
                    value={
                      analytics.averageLoss === null
                        ? "N/A"
                        : formatPercent(
                            analytics.averageLoss,
                          )
                    }
                    detail="Incorrect signals"
                    valueTone="negative"
                  />

                  <AnalyticsMetric
                    label="Win / loss ratio"
                    value={
                      analytics.winLossRatio === null
                        ? "N/A"
                        : analytics.winLossRatio.toFixed(2)
                    }
                    detail="Average win ÷ average loss"
                  />

                  <AnalyticsMetric
                    label="Profit factor"
                    value={
                      analytics.profitFactor === null
                        ? "N/A"
                        : analytics.profitFactor.toFixed(2)
                    }
                    detail="Positive change ÷ negative change"
                  />

                </div>


                {/* Direction analysis */}
                <div className="border-t border-slate-200 px-5 py-5 sm:px-6">

                  <div className="mb-5">

                    <h4 className="font-bold text-slate-900">
                      Performance by direction
                    </h4>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Compare how UP and DOWN signals performed
                      independently within this historical sample.
                    </p>

                  </div>


                  <div className="grid gap-4 md:grid-cols-2">

                    <DirectionAnalyticsCard
                      performance={analytics.up}
                    />

                    <DirectionAnalyticsCard
                      performance={analytics.down}
                    />

                  </div>

                </div>


                {/* Confidence band analysis */}
                <div className="border-t border-slate-200">

                  <div className="px-5 py-5 sm:px-6">

                    <div className="flex items-start gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Brain className="h-5 w-5" />
                      </div>

                      <div>

                        <h4 className="font-bold text-slate-900">
                          Performance by confidence band
                        </h4>

                        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                          Shows how individual confidence ranges
                          performed. This is different from the
                          threshold analysis because each row represents
                          only signals inside that confidence range.
                        </p>

                      </div>

                    </div>

                  </div>


                  <div className="overflow-x-auto">

                    <table className="min-w-full text-left">

                      <thead className="border-y border-slate-200 bg-slate-50">

                        <tr>

                          <TableHeader>
                            Confidence
                          </TableHeader>

                          <TableHeader>
                            Signals
                          </TableHeader>

                          <TableHeader>
                            Correct
                          </TableHeader>

                          <TableHeader>
                            Incorrect
                          </TableHeader>

                          <TableHeader>
                            Hit rate
                          </TableHeader>

                          <TableHeader>
                            Average change
                          </TableHeader>

                          <TableHeader>
                            Cumulative change
                          </TableHeader>

                        </tr>

                      </thead>


                      <tbody className="divide-y divide-slate-100">

                        {analytics.confidenceBands.map(
                          (band) => (
                            <ConfidenceBandRow
                              key={band.label}
                              band={band}
                            />
                          ),
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>


                {/* Analytics interpretation */}
                <div className="border-t border-slate-200 bg-slate-50 px-5 py-5 sm:px-6">

                  <div className="flex items-start gap-3">

                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                    <div>

                      <h4 className="text-sm font-semibold text-slate-800">
                        Research interpretation
                      </h4>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        These analytics describe the selected
                        historical sample only. Confidence bands
                        with few signals can produce unstable
                        results, and historical directional
                        performance does not guarantee future
                        trading performance.
                      </p>

                      {analytics.directionalSignals < 30 && (
                        <p className="mt-2 text-xs font-semibold leading-5 text-amber-700">
                          Small-sample warning: only{" "}
                          {analytics.directionalSignals} directional
                          signals were available for this analysis.
                          Consider testing a larger historical sample
                          before drawing conclusions.
                        </p>
                      )}

                    </div>

                  </div>

                </div>

              </section>
            )}


            {/* Confidence Threshold Analysis */}
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 px-5 py-5 sm:px-6">

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                  <div className="flex items-start gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <BarChart3 className="h-5 w-5" />
                    </div>

                    <div>

                      <h3 className="font-bold text-slate-900">
                        Confidence Threshold Analysis
                      </h3>

                      <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                        Compare how different minimum confidence
                        thresholds affect historical signal accuracy,
                        signal volume and hypothetical performance.
                      </p>

                    </div>

                  </div>


                  <button
                    onClick={handleThresholdAnalysis}
                    disabled={analysisLoading}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {analysisLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Analysing...
                      </>
                    ) : (
                      <>
                        <Activity className="h-4 w-4" />
                        Compare Thresholds
                      </>
                    )}
                  </button>

                </div>

              </div>


              {analysisError && (
                <div className="border-b border-red-100 bg-red-50 px-5 py-4 sm:px-6">

                  <div className="flex items-start gap-3">

                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                    <div>

                      <p className="text-sm font-semibold text-red-800">
                        Confidence analysis failed
                      </p>

                      <p className="mt-1 text-xs leading-5 text-red-700">
                        {analysisError}
                      </p>

                    </div>

                  </div>

                </div>
              )}


              {analysisLoading && (
                <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">

                  {CONFIDENCE_THRESHOLDS.map(
                    (threshold) => (
                      <div
                        key={threshold}
                        className="h-44 animate-pulse rounded-xl border border-slate-200 bg-slate-50"
                      />
                    ),
                  )}

                </div>
              )}


              {!analysisLoading &&
                thresholdResults.length === 0 &&
                !analysisError && (
                  <div className="px-5 py-8 text-center sm:px-6">

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <Target className="h-5 w-5" />
                    </div>

                    <p className="mt-4 text-sm font-semibold text-slate-800">
                      Compare confidence levels
                    </p>

                    <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-500">
                      Run the analysis to compare 0%, 50%, 60%,
                      70%, 80% and 90% confidence thresholds
                      using the same historical data.
                    </p>

                  </div>
                )}


              {!analysisLoading &&
                thresholdResults.length > 0 && (
                  <>

                    {bestThreshold && (
                      <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-4 sm:px-6">

                        <div className="flex items-start gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>

                          <div>

                            <p className="text-sm font-bold text-emerald-900">
                              Highest historical hit rate:{" "}
                              {bestThreshold.threshold}%+
                            </p>

                            <p className="mt-1 text-xs leading-5 text-emerald-700">
                              {bestThreshold.summary.hit_rate.toFixed(2)}%
                              hit rate from{" "}
                              {bestThreshold.summary.signals_evaluated}{" "}
                              evaluated signals. This identifies the
                              highest result in this test only; it does
                              not prove that the threshold will perform
                              better in future markets.
                            </p>

                          </div>

                        </div>

                      </div>
                    )}


                    <div className="overflow-x-auto">

                      <table className="min-w-full text-left">

                        <thead className="border-b border-slate-200 bg-slate-50">

                          <tr>

                            <TableHeader>
                              Threshold
                            </TableHeader>

                            <TableHeader>
                              Signals
                            </TableHeader>

                            <TableHeader>
                              Correct
                            </TableHeader>

                            <TableHeader>
                              Incorrect
                            </TableHeader>

                            <TableHeader>
                              Hit rate
                            </TableHeader>

                            <TableHeader>
                              Cumulative return
                            </TableHeader>

                            <TableHeader>
                              Max drawdown
                            </TableHeader>

                          </tr>

                        </thead>


                        <tbody className="divide-y divide-slate-100">

                          {thresholdResults.map(
                            (item) => (
                              <ThresholdTableRow
                                key={item.threshold}
                                item={item}
                                isBest={
                                  bestThreshold?.threshold ===
                                  item.threshold
                                }
                              />
                            ),
                          )}

                        </tbody>

                      </table>

                    </div>


                    <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">

                      <div className="flex items-start gap-2">

                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                        <p className="text-xs leading-5 text-slate-500">
                          Higher confidence does not automatically mean
                          better performance. Always consider both
                          accuracy and the number of evaluated signals.
                          A threshold with very few signals can produce
                          an unstable hit rate.
                        </p>

                      </div>

                    </div>

                  </>
                )}

            </section>


            {/* Detailed results */}
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 px-5 py-5">

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <h3 className="font-bold text-slate-900">
                      Signal-by-signal results
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Each signal compared with the next candle's closing price.
                    </p>

                  </div>

                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {data.results.length} results
                  </span>

                </div>

              </div>


              {data.results.length === 0 ? (

                <div className="p-8 text-center">

                  <p className="font-semibold text-slate-900">
                    No signals matched the selected filter.
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Try lowering the minimum confidence threshold.
                  </p>

                </div>

              ) : (

                <div className="overflow-x-auto">

                  <table className="min-w-full text-left">

                    <thead className="border-b border-slate-200 bg-slate-50">

                      <tr>

                        <TableHeader>
                          Timestamp
                        </TableHeader>

                        <TableHeader>
                          Signal
                        </TableHeader>

                        <TableHeader>
                          Confidence
                        </TableHeader>

                        <TableHeader>
                          Signal price
                        </TableHeader>

                        <TableHeader>
                          Next close
                        </TableHeader>

                        <TableHeader>
                          Price change
                        </TableHeader>

                        <TableHeader>
                          Outcome
                        </TableHeader>

                        <TableHeader>
                          Directional change
                        </TableHeader>

                      </tr>

                    </thead>


                    <tbody className="divide-y divide-slate-100">

                      {data.results.map(
                        (result) => (
                          <ResultTableRow
                            key={`${result.timestamp}-${result.signal_price}-${result.evaluation_price}`}
                            result={result}
                          />
                        ),
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </section>


            {/* Methodology note */}
            <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">

              <div className="flex items-start gap-3">

                <Brain className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                <div>

                  <h3 className="font-semibold text-blue-900">
                    How Strategy Lab works
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-blue-700">
                    SignalPilot walks through historical candles
                    one step at a time. At each evaluation point,
                    the signal engine only receives candles that
                    existed at that moment. The resulting signal
                    is then compared with the following candle's
                    closing price. This keeps the backtest
                    evaluation chronological and avoids using
                    future candles to generate the signal.
                  </p>

                  <p className="mt-3 text-xs leading-5 text-blue-600">
                    Results are hypothetical research metrics and
                    do not represent actual executed trades,
                    transaction costs, spreads or slippage.
                  </p>

                </div>

              </div>

            </section>

          </>
        )}

      </div>
      </main>

    </div>
  );
}


function calculatePerformanceAnalytics(
  results: StrategyLabResult[],
): PerformanceAnalytics {

  const directionalResults =
    results.filter(
      (result) =>
        result.direction !== "NEUTRAL" &&
        result.outcome !== "NEUTRAL",
    );


  const correctResults =
    directionalResults.filter(
      (result) =>
        result.outcome === "CORRECT",
    );


  const incorrectResults =
    directionalResults.filter(
      (result) =>
        result.outcome === "INCORRECT",
    );


  const neutralResults =
    results.filter(
      (result) =>
        result.outcome === "NEUTRAL",
    );


  const winningChanges =
    correctResults.map(
      (result) =>
        result.hypothetical_directional_change_percent,
    );


  const losingChanges =
    incorrectResults.map(
      (result) =>
        result.hypothetical_directional_change_percent,
    );


  const totalWinningChange =
    winningChanges.reduce(
      (sum, value) =>
        sum + value,
      0,
    );


  const totalLosingChange =
    losingChanges.reduce(
      (sum, value) =>
        sum + value,
      0,
    );


  const averageTrade =
    directionalResults.length > 0
      ? directionalResults.reduce(
          (sum, result) =>
            sum +
            result.hypothetical_directional_change_percent,
          0,
        ) / directionalResults.length
      : 0;


  const averageWin =
    winningChanges.length > 0
      ? totalWinningChange /
        winningChanges.length
      : null;


  const averageLoss =
    losingChanges.length > 0
      ? totalLosingChange /
        losingChanges.length
      : null;


  const winLossRatio =
    averageWin !== null &&
    averageLoss !== null &&
    Math.abs(averageLoss) > 0
      ? averageWin /
        Math.abs(averageLoss)
      : null;


  const profitFactor =
    totalLosingChange < 0
      ? totalWinningChange /
        Math.abs(totalLosingChange)
      : totalWinningChange > 0
        ? Infinity
        : null;


  const hitRate =
    directionalResults.length > 0
      ? (correctResults.length /
          directionalResults.length) *
        100
      : 0;


  const bestTrade =
    directionalResults.length > 0
      ? Math.max(
          ...directionalResults.map(
            (result) =>
              result.hypothetical_directional_change_percent,
          ),
        )
      : 0;


  const worstTrade =
    directionalResults.length > 0
      ? Math.min(
          ...directionalResults.map(
            (result) =>
              result.hypothetical_directional_change_percent,
          ),
        )
      : 0;


  return {
    directionalSignals:
      directionalResults.length,

    correct:
      correctResults.length,

    incorrect:
      incorrectResults.length,

    neutral:
      neutralResults.length,

    hitRate,

    averageTrade,

    averageWin,

    averageLoss,

    winLossRatio,

    profitFactor,

    totalWinningChange,

    totalLosingChange,

    bestTrade,

    worstTrade,

    up:
      calculateDirectionPerformance(
        results,
        "UP",
      ),

    down:
      calculateDirectionPerformance(
        results,
        "DOWN",
      ),

    confidenceBands:
      calculateConfidenceBands(
        results,
      ),
  };
}


function calculateDirectionPerformance(
  results: StrategyLabResult[],
  direction: "UP" | "DOWN",
): DirectionPerformance {

  const directionResults =
    results.filter(
      (result) =>
        result.direction === direction,
    );


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


  const neutral =
    directionResults.filter(
      (result) =>
        result.outcome === "NEUTRAL",
    ).length;


  const directionalOutcomeCount =
    correct + incorrect;


  const hitRate =
    directionalOutcomeCount > 0
      ? (correct /
          directionalOutcomeCount) *
        100
      : 0;


  const cumulativeChange =
    directionResults.reduce(
      (sum, result) =>
        sum +
        result.hypothetical_directional_change_percent,
      0,
    );


  const averageChange =
    directionResults.length > 0
      ? cumulativeChange /
        directionResults.length
      : 0;


  return {
    direction,
    signals: directionResults.length,
    correct,
    incorrect,
    neutral,
    hitRate,
    cumulativeChange,
    averageChange,
  };
}


function calculateConfidenceBands(
  results: StrategyLabResult[],
): ConfidenceBandPerformance[] {

  return CONFIDENCE_BANDS.map(
    (band) => {

      const bandResults =
        results.filter(
          (result) =>
            result.confidence >= band.min &&
            result.confidence < band.max,
        );


      const correct =
        bandResults.filter(
          (result) =>
            result.outcome === "CORRECT",
        ).length;


      const incorrect =
        bandResults.filter(
          (result) =>
            result.outcome === "INCORRECT",
        ).length;


      const neutral =
        bandResults.filter(
          (result) =>
            result.outcome === "NEUTRAL",
        ).length;


      const directionalOutcomeCount =
        correct + incorrect;


      const hitRate =
        directionalOutcomeCount > 0
          ? (correct /
              directionalOutcomeCount) *
            100
          : 0;


      const cumulativeChange =
        bandResults.reduce(
          (sum, result) =>
            sum +
            result.hypothetical_directional_change_percent,
          0,
        );


      const averageChange =
        bandResults.length > 0
          ? cumulativeChange /
            bandResults.length
          : 0;


      return {
        label: band.label,
        signals: bandResults.length,
        correct,
        incorrect,
        neutral,
        hitRate,
        cumulativeChange,
        averageChange,
      };
    },
  );
}


function AnalyticsMetric({
  label,
  value,
  detail,
  valueTone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  valueTone?: "positive" | "negative" | "neutral";
}) {

  const valueClass =
    valueTone === "positive"
      ? "text-emerald-600"
      : valueTone === "negative"
        ? "text-red-600"
        : "text-slate-900";


  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

      <p className="text-xs font-medium leading-5 text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-xl font-bold tracking-tight ${valueClass}`}
      >
        {value}
      </p>

      <p className="mt-1 text-[11px] leading-4 text-slate-400">
        {detail}
      </p>

    </div>
  );
}


function DirectionAnalyticsCard({
  performance,
}: {
  performance: DirectionPerformance;
}) {

  const isUp =
    performance.direction === "UP";


  const accentClass =
    isUp
      ? "bg-emerald-50 text-emerald-600"
      : "bg-red-50 text-red-600";


  const rateClass =
    performance.hitRate >= 50
      ? "text-emerald-600"
      : "text-red-600";


  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-3">

          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentClass}`}
          >
            {isUp ? (
              <ArrowUpRight className="h-5 w-5" />
            ) : (
              <ArrowDownRight className="h-5 w-5" />
            )}
          </div>

          <div>

            <p className="text-sm font-bold text-slate-900">
              {performance.direction} signals
            </p>

            <p className="text-xs text-slate-500">
              {performance.signals} signals
            </p>

          </div>

        </div>


        <div className="text-right">

          <p
            className={`text-xl font-bold ${rateClass}`}
          >
            {performance.hitRate.toFixed(2)}%
          </p>

          <p className="text-[11px] text-slate-400">
            accuracy
          </p>

        </div>

      </div>


      <div className="mt-5 grid grid-cols-2 gap-3">

        <SmallAnalyticsStat
          label="Correct"
          value={String(performance.correct)}
          valueClass="text-emerald-600"
        />

        <SmallAnalyticsStat
          label="Incorrect"
          value={String(performance.incorrect)}
          valueClass="text-red-600"
        />

        <SmallAnalyticsStat
          label="Average change"
          value={formatPercent(
            performance.averageChange,
          )}
          valueClass={getPerformanceTone(
            performance.averageChange,
          )}
        />

        <SmallAnalyticsStat
          label="Cumulative change"
          value={formatPercent(
            performance.cumulativeChange,
          )}
          valueClass={getPerformanceTone(
            performance.cumulativeChange,
          )}
        />

      </div>


      {performance.neutral > 0 && (
        <p className="mt-3 text-[11px] text-slate-400">
          {performance.neutral} neutral outcome
          {performance.neutral === 1 ? "" : "s"} excluded
          from accuracy.
        </p>
      )}

    </div>
  );
}


function SmallAnalyticsStat({
  label,
  value,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">

      <p className="text-[11px] text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-bold ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}


function ConfidenceBandRow({
  band,
}: {
  band: ConfidenceBandPerformance;
}) {

  const hasSignals =
    band.signals > 0;


  const hitRateClass =
    !hasSignals
      ? "text-slate-400"
      : band.hitRate >= 50
        ? "text-emerald-600"
        : "text-red-600";


  return (
    <tr className="transition hover:bg-slate-50">

      <td className="whitespace-nowrap px-4 py-4">

        <span
          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${
            hasSignals
              ? "bg-slate-100 text-slate-700"
              : "bg-slate-50 text-slate-400"
          }`}
        >
          {band.label}
        </span>

      </td>


      <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-700">
        {band.signals}
      </td>


      <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-emerald-600">
        {band.correct}
      </td>


      <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-red-600">
        {band.incorrect}
      </td>


      <td
        className={`whitespace-nowrap px-4 py-4 text-xs font-bold ${hitRateClass}`}
      >
        {hasSignals
          ? `${band.hitRate.toFixed(2)}%`
          : "N/A"}
      </td>


      <td
        className={`whitespace-nowrap px-4 py-4 text-xs font-bold ${
          hasSignals
            ? getPerformanceTone(
                band.averageChange,
              )
            : "text-slate-400"
        }`}
      >
        {hasSignals
          ? formatPercent(
              band.averageChange,
            )
          : "N/A"}
      </td>


      <td
        className={`whitespace-nowrap px-4 py-4 text-xs font-bold ${
          hasSignals
            ? getPerformanceTone(
                band.cumulativeChange,
              )
            : "text-slate-400"
        }`}
      >
        {hasSignals
          ? formatPercent(
              band.cumulativeChange,
            )
          : "N/A"}
      </td>

    </tr>
  );
}


function getPerformanceTone(
  value: number,
) {
  if (value > 0) {
    return "text-emerald-600";
  }

  if (value < 0) {
    return "text-red-600";
  }

  return "text-slate-700";
}


function MetricCard({
  icon,
  label,
  value,
  detail,
  emphasis = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        emphasis
          ? "border-blue-200"
          : "border-slate-200"
      }`}
    >

      <div className="flex items-start justify-between">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>

      </div>

      <p className="mt-5 text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {detail}
      </p>

    </div>
  );
}


function DistributionRow({
  label,
  value,
  total,
  type,
}: {
  label: string;
  value: number;
  total: number;
  type: "up" | "down" | "neutral";
}) {
  const percentage =
    total > 0
      ? (value / total) * 100
      : 0;

  const textClass =
    type === "up"
      ? "text-emerald-600"
      : type === "down"
        ? "text-red-600"
        : "text-slate-500";

  const barClass =
    type === "up"
      ? "bg-emerald-500"
      : type === "down"
        ? "bg-red-500"
        : "bg-slate-400";


  return (
    <div>

      <div className="mb-2 flex items-center justify-between">

        <span
          className={`text-sm font-semibold ${textClass}`}
        >
          {label}
        </span>

        <span className="text-xs text-slate-500">
          {value} · {percentage.toFixed(1)}%
        </span>

      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">

        <div
          className={`h-full rounded-full ${barClass}`}
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

    </div>
  );
}


function ResultBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const numericValue =
    Number.parseFloat(
      value.replace("%", ""),
    );

  const valueClass =
    numericValue > 0
      ? "text-emerald-600"
      : numericValue < 0
        ? "text-red-600"
        : "text-slate-700";


  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">

      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-bold ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}


function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}


function ThresholdTableRow({
  item,
  isBest,
}: {
  item: ThresholdResult;
  isBest: boolean;
}) {
  const summary =
    item.summary;

  return (
    <tr
      className={`transition hover:bg-slate-50 ${
        isBest
          ? "bg-emerald-50/40"
          : ""
      }`}
    >

      <td className="whitespace-nowrap px-4 py-4">

        <div className="flex items-center gap-2">

          <span
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${
              isBest
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {item.threshold}%+
          </span>

          {isBest && (
            <span className="text-[11px] font-semibold text-emerald-600">
              Highest hit rate
            </span>
          )}

        </div>

      </td>


      <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-700">
        {summary.signals_evaluated}
      </td>


      <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-emerald-600">
        {summary.correct}
      </td>


      <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-red-600">
        {summary.incorrect}
      </td>


      <td className="whitespace-nowrap px-4 py-4 text-xs font-bold text-slate-900">
        {summary.hit_rate.toFixed(2)}%
      </td>


      <td
        className={`whitespace-nowrap px-4 py-4 text-xs font-bold ${
          summary.cumulative_directional_change_percent > 0
            ? "text-emerald-600"
            : summary.cumulative_directional_change_percent < 0
              ? "text-red-600"
              : "text-slate-500"
        }`}
      >
        {formatPercent(
          summary.cumulative_directional_change_percent,
        )}
      </td>


      <td
        className={`whitespace-nowrap px-4 py-4 text-xs font-bold ${
          summary.maximum_drawdown_percent > 0
            ? "text-red-600"
            : "text-slate-500"
        }`}
      >
        {formatPercent(
          -summary.maximum_drawdown_percent,
        )}
      </td>

    </tr>
  );
}


function ResultTableRow({
  result,
}: {
  result: StrategyLabResult;
}) {
  const isUp =
    result.direction === "UP";

  const isDown =
    result.direction === "DOWN";


  const outcomeClass =
    result.outcome === "CORRECT"
      ? "bg-emerald-50 text-emerald-700"
      : result.outcome === "INCORRECT"
        ? "bg-red-50 text-red-700"
        : "bg-slate-100 text-slate-600";


  const directionalChange =
    result.hypothetical_directional_change_percent;


  return (
    <tr className="transition hover:bg-slate-50">

      <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
        {formatTimestamp(result.timestamp)}
      </td>


      <td className="whitespace-nowrap px-4 py-4">

        <div className="flex items-center gap-2">

          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              isUp
                ? "bg-emerald-50 text-emerald-600"
                : isDown
                  ? "bg-red-50 text-red-600"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {isUp ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : isDown ? (
              <ArrowDownRight className="h-4 w-4" />
            ) : (
              <Minus className="h-4 w-4" />
            )}
          </span>

          <span className="text-xs font-bold text-slate-700">
            {result.direction}
          </span>

        </div>

      </td>


      <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-700">
        {result.confidence.toFixed(1)}%
      </td>


      <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">
        {formatPrice(
          result.signal_price,
          result.symbol,
        )}
      </td>


      <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-700">
        {formatPrice(
          result.evaluation_price,
          result.symbol,
        )}
      </td>


      <td
        className={`whitespace-nowrap px-4 py-4 text-xs font-semibold ${
          result.price_change_percent > 0
            ? "text-emerald-600"
            : result.price_change_percent < 0
              ? "text-red-600"
              : "text-slate-500"
        }`}
      >
        {formatPercent(
          result.price_change_percent,
        )}
      </td>


      <td className="whitespace-nowrap px-4 py-4">

        <span
          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${outcomeClass}`}
        >
          {result.outcome}
        </span>

      </td>


      <td
        className={`whitespace-nowrap px-4 py-4 text-xs font-bold ${
          directionalChange > 0
            ? "text-emerald-600"
            : directionalChange < 0
              ? "text-red-600"
              : "text-slate-500"
        }`}
      >
        {formatPercent(
          directionalChange,
        )}
      </td>

    </tr>
  );
}


function formatPercent(
  value: number,
) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(4)}%`;
}


function formatTimestamp(
  value: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    "en-GB",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  );
}


function formatPrice(
  price: number,
  symbol: string,
) {
  if (symbol === "XAU/USD") {
    return price.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    );
  }

  if (symbol === "USD/JPY") {
    return price.toFixed(3);
  }

  return price.toFixed(5);
}
