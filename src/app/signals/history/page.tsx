"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Brain,
  ChevronLeft,
  Clock3,
  Database,
  Gauge,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
  getSignalHistory,
  type SignalHistoryItem,
} from "@/lib/signalpilot-api";

import SignalPilotNavigation from "@/components/SignalPilotNavigation";
import ReturnToTop from "@/components/ReturnToTop";


const MARKETS = [
  "ALL",
  "EUR/USD",
  "GBP/USD",
  "XAU/USD",
  "USD/JPY",
];

const TIMEFRAMES = [
  "ALL",
  "5m",
  "15m",
  "1h",
  "4h",
  "1D",
];

const DIRECTIONS = [
  "ALL",
  "UP",
  "DOWN",
  "NEUTRAL",
];

const CONFIDENCE_RANGES = [
  "ALL",
  "0-59%",
  "60-69%",
  "70-79%",
  "80-89%",
  "90%+",
];


export default function SignalHistoryPage() {
  const router = useRouter();

  const [signals, setSignals] = useState<
    SignalHistoryItem[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [market, setMarket] = useState("ALL");
  const [timeframe, setTimeframe] = useState("ALL");
  const [direction, setDirection] = useState("ALL");
  const [confidenceRange, setConfidenceRange] =
    useState("ALL");

  async function loadHistory() {
    try {
      setLoading(true);
      setError("");

      const result = await getSignalHistory(100);

      setSignals(result.signals);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load signal history.",
      );
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    loadHistory();
  }, []);


  function handleBack() {
    router.back();
  }


  const filteredSignals = useMemo(() => {
    return signals.filter((signal) => {
      const marketMatches =
        market === "ALL" ||
        signal.symbol === market;

      const timeframeMatches =
        timeframe === "ALL" ||
        signal.timeframe === timeframe;

      const directionMatches =
        direction === "ALL" ||
        signal.direction === direction;

      let confidenceMatches = true;

      if (confidenceRange === "0-59%") {
        confidenceMatches =
          signal.confidence < 60;
      }

      if (confidenceRange === "60-69%") {
        confidenceMatches =
          signal.confidence >= 60 &&
          signal.confidence < 70;
      }

      if (confidenceRange === "70-79%") {
        confidenceMatches =
          signal.confidence >= 70 &&
          signal.confidence < 80;
      }

      if (confidenceRange === "80-89%") {
        confidenceMatches =
          signal.confidence >= 80 &&
          signal.confidence < 90;
      }

      if (confidenceRange === "90%+") {
        confidenceMatches =
          signal.confidence >= 90;
      }

      return (
        marketMatches &&
        timeframeMatches &&
        directionMatches &&
        confidenceMatches
      );
    });
  }, [
    signals,
    market,
    timeframe,
    direction,
    confidenceRange,
  ]);


  const analytics = useMemo(() => {
    const total = filteredSignals.length;

    const up = filteredSignals.filter(
      (signal) => signal.direction === "UP",
    ).length;

    const down = filteredSignals.filter(
      (signal) => signal.direction === "DOWN",
    ).length;

    const neutral = filteredSignals.filter(
      (signal) => signal.direction === "NEUTRAL",
    ).length;

    const averageConfidence =
      total > 0
        ? filteredSignals.reduce(
            (sum, signal) =>
              sum + signal.confidence,
            0,
          ) / total
        : 0;

    const averageTrendScore =
      total > 0
        ? filteredSignals.reduce(
            (sum, signal) =>
              sum + signal.trend_score,
            0,
          ) / total
        : 0;

    const averageMomentumScore =
      total > 0
        ? filteredSignals.reduce(
            (sum, signal) =>
              sum + signal.momentum_score,
            0,
          ) / total
        : 0;

    const averageVolatilityScore =
      total > 0
        ? filteredSignals.reduce(
            (sum, signal) =>
              sum + signal.volatility_score,
            0,
          ) / total
        : 0;

    const bullishRatio =
      total > 0
        ? (up / total) * 100
        : 0;

    const bearishRatio =
      total > 0
        ? (down / total) * 100
        : 0;

    return {
      total,
      up,
      down,
      neutral,
      averageConfidence,
      averageTrendScore,
      averageMomentumScore,
      averageVolatilityScore,
      bullishRatio,
      bearishRatio,
    };
  }, [filteredSignals]);


  const marketBreakdown = useMemo(() => {
    return MARKETS
      .filter((item) => item !== "ALL")
      .map((item) => {
        const marketSignals =
          filteredSignals.filter(
            (signal) =>
              signal.symbol === item,
          );

        const total = marketSignals.length;

        const up = marketSignals.filter(
          (signal) =>
            signal.direction === "UP",
        ).length;

        const down = marketSignals.filter(
          (signal) =>
            signal.direction === "DOWN",
        ).length;

        const neutral = marketSignals.filter(
          (signal) =>
            signal.direction === "NEUTRAL",
        ).length;

        const confidence =
          total > 0
            ? marketSignals.reduce(
                (sum, signal) =>
                  sum + signal.confidence,
                0,
              ) / total
            : 0;

        return {
          symbol: item,
          total,
          up,
          down,
          neutral,
          confidence,
        };
      });
  }, [filteredSignals]);


  const directionBreakdown = useMemo(() => {
    const directions = [
      "UP",
      "DOWN",
      "NEUTRAL",
    ] as const;

    return directions.map((item) => {
      const items = filteredSignals.filter(
        (signal) =>
          signal.direction === item,
      );

      const total = items.length;

      const confidence =
        total > 0
          ? items.reduce(
              (sum, signal) =>
                sum + signal.confidence,
              0,
            ) / total
          : 0;

      const trendScore =
        total > 0
          ? items.reduce(
              (sum, signal) =>
                sum + signal.trend_score,
              0,
            ) / total
          : 0;

      const momentumScore =
        total > 0
          ? items.reduce(
              (sum, signal) =>
                sum + signal.momentum_score,
              0,
            ) / total
          : 0;

      return {
        direction: item,
        total,
        confidence,
        trendScore,
        momentumScore,
      };
    });
  }, [filteredSignals]);


  const confidenceBreakdown = useMemo(() => {
    return CONFIDENCE_RANGES
      .filter((item) => item !== "ALL")
      .map((range) => {
        let items = filteredSignals;

        if (range === "0-59%") {
          items = filteredSignals.filter(
            (signal) =>
              signal.confidence < 60,
          );
        }

        if (range === "60-69%") {
          items = filteredSignals.filter(
            (signal) =>
              signal.confidence >= 60 &&
              signal.confidence < 70,
          );
        }

        if (range === "70-79%") {
          items = filteredSignals.filter(
            (signal) =>
              signal.confidence >= 70 &&
              signal.confidence < 80,
          );
        }

        if (range === "80-89%") {
          items = filteredSignals.filter(
            (signal) =>
              signal.confidence >= 80 &&
              signal.confidence < 90,
          );
        }

        if (range === "90%+") {
          items = filteredSignals.filter(
            (signal) =>
              signal.confidence >= 90,
          );
        }

        const total = items.length;

        const averageConfidence =
          total > 0
            ? items.reduce(
                (sum, signal) =>
                  sum + signal.confidence,
                0,
              ) / total
            : 0;

        return {
          range,
          total,
          averageConfidence,
        };
      });
  }, [filteredSignals]);


  const latestSignals = useMemo(() => {
    return [...filteredSignals]
      .sort(
        (a, b) =>
          new Date(
            b.created_at,
          ).getTime() -
          new Date(
            a.created_at,
          ).getTime(),
      )
      .slice(0, 20);
  }, [filteredSignals]);


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      <SignalPilotNavigation />

      <ReturnToTop />

      <main className="min-h-screen px-5 py-8 sm:px-8 lg:ml-64">

        <div className="mx-auto max-w-7xl">

          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

            <div>

              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
                <Database size={18} />
                SignalPilot AI
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Signal History
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Explore the historical signals generated by
                the SignalPilot quantitative engine, including
                directional balance, confidence behaviour,
                market distribution and technical conditions.
              </p>

            </div>


            <div className="flex flex-wrap gap-2">

              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
                Back
              </button>

              <button
                type="button"
                onClick={loadHistory}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />

                Refresh history
              </button>

            </div>

          </div>


          {/* Summary */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <SummaryCard
              icon={<Database size={20} />}
              label="Recorded signals"
              value={analytics.total}
            />

            <SummaryCard
              icon={<ArrowUp size={20} />}
              label="Bullish signals"
              value={analytics.up}
            />

            <SummaryCard
              icon={<ArrowDown size={20} />}
              label="Bearish signals"
              value={analytics.down}
            />

            <SummaryCard
              icon={<Gauge size={20} />}
              label="Average confidence"
              value={
                analytics.total
                  ? `${analytics.averageConfidence.toFixed(1)}%`
                  : "—"
              }
            />

          </div>


          {/* Direction overview */}
          {!loading &&
            !error &&
            filteredSignals.length > 0 && (
              <section className="mb-6 grid gap-4 md:grid-cols-3">

                <InsightCard
                  icon={<TrendingUp size={19} />}
                  title="Bullish balance"
                  value={`${analytics.bullishRatio.toFixed(1)}%`}
                  description={`${analytics.up} of ${analytics.total} recorded signals were UP.`}
                />

                <InsightCard
                  icon={<TrendingDown size={19} />}
                  title="Bearish balance"
                  value={`${analytics.bearishRatio.toFixed(1)}%`}
                  description={`${analytics.down} of ${analytics.total} recorded signals were DOWN.`}
                />

                <InsightCard
                  icon={<Brain size={19} />}
                  title="Quantitative stance"
                  value={
                    analytics.averageTrendScore > 0.15
                      ? "Bullish"
                      : analytics.averageTrendScore < -0.15
                        ? "Bearish"
                        : "Mixed"
                  }
                  description={`Average trend score ${analytics.averageTrendScore.toFixed(2)} across the selected history.`}
                />

              </section>
            )}


          {/* Filters */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-center gap-2">

              <BarChart3
                size={18}
                className="text-blue-600"
              />

              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Historical filters
                </h2>

                <p className="text-xs text-slate-500">
                  Narrow the recorded signals to analyse a specific market,
                  timeframe, direction or confidence range.
                </p>
              </div>

            </div>


            <div className="grid gap-5 xl:grid-cols-4">

              <FilterGroup
                label="Market"
                options={MARKETS}
                value={market}
                onChange={setMarket}
              />

              <FilterGroup
                label="Timeframe"
                options={TIMEFRAMES}
                value={timeframe}
                onChange={setTimeframe}
              />

              <FilterGroup
                label="Direction"
                options={DIRECTIONS}
                value={direction}
                onChange={setDirection}
              />

              <FilterGroup
                label="Confidence"
                options={CONFIDENCE_RANGES}
                value={confidenceRange}
                onChange={setConfidenceRange}
              />

            </div>

          </section>


          {/* Loading */}
          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

              <RefreshCw
                size={28}
                className="mx-auto mb-4 animate-spin text-blue-600"
              />

              <h2 className="font-semibold text-slate-900">
                Loading signal history
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Retrieving recorded SignalPilot signals.
              </p>

            </div>
          )}


          {/* Error */}
          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">

              <h2 className="font-semibold text-red-900">
                Unable to load history
              </h2>

              <p className="mt-2 text-sm text-red-700">
                {error}
              </p>

            </div>
          )}


          {/* Empty */}
          {!loading &&
            !error &&
            filteredSignals.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

                <Database
                  size={32}
                  className="mx-auto mb-4 text-slate-400"
                />

                <h2 className="font-semibold text-slate-900">
                  No signals found
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  No recorded signals match the selected filters.
                </p>

              </div>
            )}


          {!loading &&
            !error &&
            filteredSignals.length > 0 && (
              <>

                {/* Research overview */}
                <section className="mb-6 grid gap-4 lg:grid-cols-3">

                  <AnalyticsCard
                    icon={<Target size={19} />}
                    title="Average trend score"
                    value={analytics.averageTrendScore.toFixed(2)}
                    description="Average directional trend score across the selected signals."
                  />

                  <AnalyticsCard
                    icon={<Activity size={19} />}
                    title="Average momentum score"
                    value={analytics.averageMomentumScore.toFixed(2)}
                    description="Average momentum score across the selected signals."
                  />

                  <AnalyticsCard
                    icon={<ShieldAlert size={19} />}
                    title="Average volatility score"
                    value={analytics.averageVolatilityScore.toFixed(2)}
                    description="Average volatility score across the selected signals."
                  />

                </section>


                {/* Market breakdown */}
                <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="mb-5">

                    <h2 className="text-lg font-semibold text-slate-900">
                      Signal distribution by market
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Shows how the recorded signal engine has behaved
                      across the supported markets.
                    </p>

                  </div>


                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                    {marketBreakdown.map(
                      (item) => (
                        <MarketBreakdownCard
                          key={item.symbol}
                          symbol={item.symbol}
                          total={item.total}
                          up={item.up}
                          down={item.down}
                          neutral={item.neutral}
                          confidence={item.confidence}
                        />
                      ),
                    )}

                  </div>

                </section>


                {/* Direction and confidence analysis */}
                <section className="mb-6 grid gap-6 lg:grid-cols-2">

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                    <div className="mb-5">

                      <h2 className="text-lg font-semibold text-slate-900">
                        Direction analysis
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Compare signal volume and average confidence by direction.
                      </p>

                    </div>


                    <div className="space-y-3">

                      {directionBreakdown.map(
                        (item) => (
                          <DirectionBreakdownRow
                            key={item.direction}
                            direction={item.direction}
                            total={item.total}
                            confidence={item.confidence}
                            trendScore={item.trendScore}
                            momentumScore={item.momentumScore}
                          />
                        ),
                      )}

                    </div>

                  </div>


                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                    <div className="mb-5">

                      <h2 className="text-lg font-semibold text-slate-900">
                        Confidence distribution
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Shows where the recorded signals are concentrated by confidence.
                      </p>

                    </div>


                    <div className="space-y-3">

                      {confidenceBreakdown.map(
                        (item) => (
                          <ConfidenceBreakdownRow
                            key={item.range}
                            range={item.range}
                            total={item.total}
                            averageConfidence={
                              item.averageConfidence
                            }
                            overallTotal={
                              analytics.total
                            }
                          />
                        ),
                      )}

                    </div>

                  </div>

                </section>


                {/* Important distinction */}
                <section className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">

                  <div className="flex items-start gap-3">

                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <Brain size={17} />
                    </div>

                    <div>

                      <h2 className="font-semibold text-blue-900">
                        What Signal History tells you
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-blue-800">
                        Signal History records what the quantitative
                        engine generated at each point in time. It helps
                        you study signal frequency, directional balance,
                        confidence behaviour and the technical conditions
                        behind previous signals.
                      </p>

                      <p className="mt-2 text-sm leading-6 text-blue-800">
                        It does not yet calculate whether each recorded
                        signal was subsequently correct or incorrect.
                        Those outcome-based measurements belong in
                        Performance and Strategy Lab.
                      </p>

                    </div>

                  </div>

                </section>


                {/* Recent signals */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                  <div className="border-b border-slate-200 px-6 py-5">

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                      <div>

                        <h2 className="text-lg font-semibold text-slate-900">
                          Recent recorded signals
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Showing the latest {latestSignals.length} signals
                          matching the current filters.
                        </p>

                      </div>

                      <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-400">

                        <Clock3 size={14} />

                        Historical records

                      </div>

                    </div>

                  </div>


                  <div className="overflow-x-auto">

                    <table className="w-full min-w-[1200px] text-left">

                      <thead className="bg-slate-50">

                        <tr className="border-b border-slate-200">

                          <TableHeader>
                            Market
                          </TableHeader>

                          <TableHeader>
                            Time
                          </TableHeader>

                          <TableHeader>
                            Direction
                          </TableHeader>

                          <TableHeader>
                            Confidence
                          </TableHeader>

                          <TableHeader>
                            Price
                          </TableHeader>

                          <TableHeader>
                            Trend
                          </TableHeader>

                          <TableHeader>
                            Momentum
                          </TableHeader>

                          <TableHeader>
                            RSI
                          </TableHeader>

                          <TableHeader>
                            Risk
                          </TableHeader>

                          <TableHeader>
                            ID
                          </TableHeader>

                        </tr>

                      </thead>


                      <tbody>

                        {latestSignals.map(
                          (signal) => (
                            <SignalRow
                              key={signal.id}
                              signal={signal}
                            />
                          ),
                        )}

                      </tbody>

                    </table>

                  </div>

                </section>


                {/* Signal detail cards */}
                <section className="mt-6">

                  <div className="mb-4">

                    <h2 className="text-lg font-semibold text-slate-900">
                      Latest signal intelligence
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Technical context behind the most recent recorded signals.
                    </p>

                  </div>


                  <div className="grid gap-4 lg:grid-cols-2">

                    {latestSignals
                      .slice(0, 6)
                      .map((signal) => (
                        <SignalDetailCard
                          key={`detail-${signal.id}`}
                          signal={signal}
                        />
                      ))}

                  </div>

                </section>


                {/* Methodology */}
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="flex items-start gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <Database size={18} />
                    </div>

                    <div>

                      <h2 className="font-semibold text-slate-900">
                        Signal History methodology
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Each record is created when SignalPilot generates
                        a signal from market candle data. The record stores
                        the market, timeframe, signal direction, confidence,
                        trend, momentum, volatility, technical indicators,
                        risk assessment and explanation available at that moment.
                      </p>

                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        Historical signal records should therefore be treated
                        as an audit trail of the model's previous decisions,
                        not as proof of future trading performance.
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


function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <span className="text-sm font-medium text-slate-500">
          {label}
        </span>

        <div className="text-blue-600">
          {icon}
        </div>

      </div>

      <div className="mt-4 text-2xl font-bold text-slate-900">
        {value}
      </div>

    </div>
  );
}


function InsightCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center gap-2 text-blue-600">
        {icon}

        <span className="text-sm font-semibold text-slate-700">
          {title}
        </span>
      </div>

      <div className="mt-4 text-2xl font-bold text-slate-900">
        {value}
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>

    </div>
  );
}


function AnalyticsCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center gap-2">

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {icon}
        </div>

        <span className="text-sm font-semibold text-slate-700">
          {title}
        </span>

      </div>

      <div className="mt-4 text-2xl font-bold text-slate-900">
        {value}
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>

    </div>
  );
}


function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>

      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </h3>

      <div className="flex flex-wrap gap-2">

        {options.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
              value === item
                ? "bg-blue-600 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item}
          </button>
        ))}

      </div>

    </div>
  );
}


function MarketBreakdownCard({
  symbol,
  total,
  up,
  down,
  neutral,
  confidence,
}: {
  symbol: string;
  total: number;
  up: number;
  down: number;
  neutral: number;
  confidence: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

      <div className="flex items-center justify-between">

        <span className="font-semibold text-slate-900">
          {symbol}
        </span>

        <span className="text-xs font-medium text-slate-400">
          {total} signals
        </span>

      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">

        <MiniStat
          label="UP"
          value={up}
          className="text-emerald-600"
        />

        <MiniStat
          label="DOWN"
          value={down}
          className="text-red-600"
        />

        <MiniStat
          label="NEUTRAL"
          value={neutral}
          className="text-slate-500"
        />

      </div>

      <div className="mt-4 border-t border-slate-200 pt-3">

        <div className="flex items-center justify-between text-xs">

          <span className="text-slate-500">
            Avg confidence
          </span>

          <span className="font-semibold text-slate-800">
            {total
              ? `${confidence.toFixed(1)}%`
              : "—"}
          </span>

        </div>

      </div>

    </div>
  );
}


function MiniStat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="rounded-lg bg-white p-2 text-center">

      <div className={`text-sm font-bold ${className}`}>
        {value}
      </div>

      <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
        {label}
      </div>

    </div>
  );
}


function DirectionBreakdownRow({
  direction,
  total,
  confidence,
  trendScore,
  momentumScore,
}: {
  direction: "UP" | "DOWN" | "NEUTRAL";
  total: number;
  confidence: number;
  trendScore: number;
  momentumScore: number;
}) {
  const label =
    direction === "UP"
      ? "Bullish"
      : direction === "DOWN"
        ? "Bearish"
        : "Neutral";

  const icon =
    direction === "UP"
      ? <ArrowUp size={16} />
      : direction === "DOWN"
        ? <ArrowDown size={16} />
        : <Activity size={16} />;

  const iconClass =
    direction === "UP"
      ? "bg-emerald-50 text-emerald-600"
      : direction === "DOWN"
        ? "bg-red-50 text-red-600"
        : "bg-slate-100 text-slate-500";

  return (
    <div className="rounded-xl border border-slate-200 p-4">

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-3">

          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}>
            {icon}
          </div>

          <div>

            <p className="text-sm font-semibold text-slate-900">
              {label}
            </p>

            <p className="text-xs text-slate-400">
              {total} recorded signals
            </p>

          </div>

        </div>

        <span className="text-sm font-bold text-slate-900">
          {total
            ? `${confidence.toFixed(1)}%`
            : "—"}
        </span>

      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">

        <div>
          <span className="text-slate-400">
            Trend score
          </span>

          <p className="mt-1 font-semibold text-slate-700">
            {trendScore.toFixed(2)}
          </p>
        </div>

        <div>
          <span className="text-slate-400">
            Momentum score
          </span>

          <p className="mt-1 font-semibold text-slate-700">
            {momentumScore.toFixed(2)}
          </p>
        </div>

      </div>

    </div>
  );
}


function ConfidenceBreakdownRow({
  range,
  total,
  averageConfidence,
  overallTotal,
}: {
  range: string;
  total: number;
  averageConfidence: number;
  overallTotal: number;
}) {
  const percentage =
    overallTotal > 0
      ? (total / overallTotal) * 100
      : 0;

  return (
    <div>

      <div className="mb-1 flex items-center justify-between text-xs">

        <span className="font-medium text-slate-600">
          {range}
        </span>

        <span className="text-slate-400">
          {total} signals
        </span>

      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">

        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{
            width: `${Math.min(
              percentage,
              100,
            )}%`,
          }}
        />

      </div>

      <div className="mt-1 flex justify-between text-[11px] text-slate-400">

        <span>
          {percentage.toFixed(1)}% of filtered history
        </span>

        <span>
          Avg {total
            ? `${averageConfidence.toFixed(1)}%`
            : "—"}
        </span>

      </div>

    </div>
  );
}


function SignalRow({
  signal,
}: {
  signal: SignalHistoryItem;
}) {
  const direction =
    signal.direction === "UP"
      ? "Bullish"
      : signal.direction === "DOWN"
        ? "Bearish"
        : "Neutral";

  const directionClass =
    signal.direction === "UP"
      ? "bg-emerald-50 text-emerald-700"
      : signal.direction === "DOWN"
        ? "bg-red-50 text-red-700"
        : "bg-slate-100 text-slate-600";

  const date = new Date(
    signal.created_at,
  );


  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">

      <td className="px-6 py-4">

        <div className="font-semibold text-slate-900">
          {signal.symbol}
        </div>

        <div className="mt-1 text-xs text-slate-400">
          {signal.timeframe}
        </div>

      </td>


      <td className="px-6 py-4">

        <div className="flex items-center gap-2 text-sm text-slate-600">

          <Clock3 size={14} />

          {date.toLocaleString()}

        </div>

      </td>


      <td className="px-6 py-4">

        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${directionClass}`}
        >
          {direction}
        </span>

      </td>


      <td className="px-6 py-4">

        <span className="font-semibold text-slate-900">
          {signal.confidence.toFixed(1)}%
        </span>

      </td>


      <td className="px-6 py-4 font-medium text-slate-700">
        {formatPrice(
          signal.price,
          signal.symbol,
        )}
      </td>


      <td className="px-6 py-4 text-xs font-medium text-slate-600">
        {signal.trend}
      </td>


      <td className="px-6 py-4 text-xs font-medium text-slate-600">
        {signal.momentum}
      </td>


      <td className="px-6 py-4 text-xs font-medium text-slate-600">
        {signal.rsi14 !== null
          ? signal.rsi14.toFixed(1)
          : "—"}
      </td>


      <td className="px-6 py-4">

        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">

          <ShieldAlert size={14} />

          {signal.risk_level}

        </span>

      </td>


      <td className="px-6 py-4 text-xs font-mono text-slate-400">
        #{signal.id}
      </td>

    </tr>
  );
}


function SignalDetailCard({
  signal,
}: {
  signal: SignalHistoryItem;
}) {
  const direction =
    signal.direction === "UP"
      ? "Bullish"
      : signal.direction === "DOWN"
        ? "Bearish"
        : "Neutral";

  const directionClass =
    signal.direction === "UP"
      ? "bg-emerald-50 text-emerald-700"
      : signal.direction === "DOWN"
        ? "bg-red-50 text-red-700"
        : "bg-slate-100 text-slate-600";


  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between gap-4">

        <div>

          <div className="flex items-center gap-2">

            <span className="font-bold text-slate-900">
              {signal.symbol}
            </span>

            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
              {signal.timeframe}
            </span>

          </div>

          <p className="mt-1 text-xs text-slate-400">
            Signal #{signal.id}
          </p>

        </div>


        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${directionClass}`}
        >
          {direction}
        </span>

      </div>


      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">

        <DetailMetric
          label="Confidence"
          value={`${signal.confidence.toFixed(1)}%`}
        />

        <DetailMetric
          label="Price"
          value={formatPrice(
            signal.price,
            signal.symbol,
          )}
        />

        <DetailMetric
          label="RSI"
          value={
            signal.rsi14 !== null
              ? signal.rsi14.toFixed(1)
              : "—"
          }
        />

        <DetailMetric
          label="Risk"
          value={signal.risk_level}
        />

      </div>


      <div className="mt-4 grid grid-cols-2 gap-3">

        <ScoreMetric
          label="Trend"
          value={signal.trend_score}
        />

        <ScoreMetric
          label="Momentum"
          value={signal.momentum_score}
        />

        <ScoreMetric
          label="Volatility"
          value={signal.volatility_score}
        />

        <ScoreMetric
          label="Directional"
          value={signal.directional_score}
        />

      </div>


      <div className="mt-5 border-t border-slate-100 pt-4">

        <div className="grid gap-3 sm:grid-cols-2">

          <div>

            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Technical context
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-600">
              EMA20{" "}
              {formatOptional(
                signal.ema20,
                signal.symbol,
              )}
              {" · "}
              EMA50{" "}
              {formatOptional(
                signal.ema50,
                signal.symbol,
              )}
              {" · "}
              ATR{" "}
              {formatOptional(
                signal.atr14,
                signal.symbol,
              )}
            </p>

          </div>


          <div>

            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              MACD
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-600">
              {formatOptional(
                signal.macd,
                signal.symbol,
              )}
              {" · signal "}
              {formatOptional(
                signal.macd_signal,
                signal.symbol,
              )}
              {" · histogram "}
              {formatOptional(
                signal.macd_histogram,
                signal.symbol,
              )}
            </p>

          </div>

        </div>


        <div className="mt-4 rounded-xl bg-slate-50 p-3">

          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Engine explanation
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-600">
            {signal.explanation}
          </p>

        </div>

      </div>

    </div>
  );
}


function DetailMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">

      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-slate-800">
        {value}
      </p>

    </div>
  );
}


function ScoreMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>

      <div className="flex items-center justify-between text-[11px]">

        <span className="text-slate-400">
          {label}
        </span>

        <span className="font-semibold text-slate-700">
          {value.toFixed(2)}
        </span>

      </div>

      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">

        <div
          className="h-full rounded-full bg-blue-500"
          style={{
            width: `${Math.min(
              Math.abs(value) * 100,
              100,
            )}%`,
          }}
        />

      </div>

    </div>
  );
}


function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </th>
  );
}


function formatPrice(
  value: number,
  symbol: string,
) {
  if (symbol === "USD/JPY") {
    return value.toFixed(3);
  }

  if (symbol === "XAU/USD") {
    return value.toFixed(2);
  }

  return value.toFixed(5);
}


function formatOptional(
  value: number | null,
  symbol: string,
) {
  if (value === null) {
    return "—";
  }

  if (
    symbol === "EUR/USD" ||
    symbol === "GBP/USD"
  ) {
    return value.toFixed(5);
  }

  return value.toFixed(5);
}