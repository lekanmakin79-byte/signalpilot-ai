"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  ChevronLeft,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
  getSignalRanking,
  type RankedSignal,
  type SignalRankingResponse,
} from "@/lib/signalpilot-api";

import SignalPilotNavigation from "@/components/SignalPilotNavigation";
import ReturnToTop from "@/components/ReturnToTop";


const TIMEFRAMES = [
  "5m",
  "15m",
  "1h",
  "4h",
  "1D",
];


function isValidNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}


function formatPercentage(
  value: unknown,
): string {
  if (!isValidNumber(value)) {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}


function formatScore(
  value: unknown,
): string {
  if (!isValidNumber(value)) {
    return "—";
  }

  return value.toFixed(1);
}


function getDirectionLabel(
  direction: RankedSignal["direction"],
): string {
  if (direction === "UP") {
    return "Bullish";
  }

  if (direction === "DOWN") {
    return "Bearish";
  }

  return "Neutral";
}


function getDirectionClasses(
  direction: RankedSignal["direction"],
): string {
  if (direction === "UP") {
    return "text-emerald-600";
  }

  if (direction === "DOWN") {
    return "text-red-600";
  }

  return "text-slate-600";
}


function getQualityClasses(
  grade: RankedSignal["quality"]["quality_grade"],
): string {
  if (grade === "EXCEPTIONAL") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (grade === "STRONG") {
    return "bg-blue-100 text-blue-700";
  }

  if (grade === "GOOD") {
    return "bg-cyan-100 text-cyan-700";
  }

  if (grade === "MODERATE") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}


function getRankClasses(
  rank: number,
): string {
  if (rank === 1) {
    return "bg-blue-600 text-white";
  }

  if (rank === 2) {
    return "bg-blue-50 text-blue-700";
  }

  if (rank === 3) {
    return "bg-slate-100 text-slate-700";
  }

  return "bg-slate-50 text-slate-500";
}


export default function SignalRankingPage() {
  const router = useRouter();

  const [timeframe, setTimeframe] =
    useState("5m");

  const [data, setData] =
    useState<SignalRankingResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  async function loadRanking() {
    try {
      setLoading(true);
      setError("");

      const result =
        await getSignalRanking(
          timeframe,
          100,
        );

      setData(result);

    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load signal ranking.",
      );

      setData(null);

    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    loadRanking();
  }, [timeframe]);


  function handleBack() {
    router.back();
  }


  const signals =
    data?.signals ?? [];

  const topSignal =
    signals.length > 0
      ? signals[0]
      : null;


  return (
    <>
      <SignalPilotNavigation />

      <ReturnToTop />

      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:ml-64 lg:px-8">
        <div className="mx-auto max-w-7xl">

          {/* Header */}
          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div>

              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
                <Trophy size={18} />
                SignalPilot AI
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Signal Ranking
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Compare current market signals using quantitative
                signal quality, model confidence and directional
                strength.
              </p>

            </div>


            <div className="flex flex-wrap items-center gap-3">

              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
                Back
              </button>


              <button
                type="button"
                onClick={loadRanking}
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

                Refresh ranking
              </button>

            </div>

          </div>


          {/* Timeframe */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-4">

              <h2 className="text-sm font-semibold text-slate-900">
                Ranking timeframe
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Select the market timeframe used to generate and
                compare the signals.
              </p>

            </div>


            <div className="flex flex-wrap gap-2">

              {TIMEFRAMES.map((item) => (

                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setTimeframe(item)
                  }
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    timeframe === item
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item}
                </button>

              ))}

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
                Ranking market signals
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                SignalPilot is analysing the supported markets and
                comparing their quantitative evidence.
              </p>

            </div>
          )}


          {/* Error */}
          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">

              <div className="flex items-start gap-3">

                <AlertTriangle
                  className="mt-0.5 text-red-600"
                  size={20}
                />

                <div>

                  <h2 className="font-semibold text-red-900">
                    Unable to load signal ranking
                  </h2>

                  <p className="mt-1 text-sm text-red-700">
                    {error}
                  </p>

                </div>

              </div>

            </div>
          )}


          {/* Ranking content */}
          {!loading && !error && data && (
            <>

              {/* Top signal */}
              {topSignal && (
                <section className="mb-6 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">

                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                    <div>

                      <div className="flex items-center gap-2">

                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                          <Trophy size={18} />
                        </div>

                        <div>

                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                            Current top-ranked signal
                          </p>

                          <h2 className="mt-1 text-2xl font-bold text-slate-900">
                            {topSignal.symbol}
                          </h2>

                        </div>

                      </div>


                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                        {getDirectionLabel(
                          topSignal.direction,
                        )} signal with a ranking score of{" "}
                        <strong className="text-slate-700">
                          {formatScore(
                            topSignal.ranking.score,
                          )}
                        </strong>
                        .
                      </p>

                    </div>


                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

                      <MiniMetric
                        label="Rank"
                        value={`#${topSignal.ranking.rank}`}
                      />

                      <MiniMetric
                        label="Quality"
                        value={formatScore(
                          topSignal.quality.quality_score,
                        )}
                      />

                      <MiniMetric
                        label="Confidence"
                        value={formatPercentage(
                          topSignal.confidence,
                        )}
                      />

                    </div>

                  </div>

                </section>
              )}


              {/* Ranking table */}
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-200 p-6">

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

                    <div>

                      <h2 className="text-lg font-semibold text-slate-900">
                        Market Ranking
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {data.count} markets ranked for the{" "}
                        {data.interval} timeframe using{" "}
                        {data.data_points} data points.
                      </p>

                    </div>

                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
                      Higher ranking score = stronger comparative evidence
                    </div>

                  </div>

                </div>


                {/* Desktop table */}
                <div className="hidden overflow-x-auto lg:block">

                  <table className="w-full min-w-[900px]">

                    <thead>

                      <tr className="border-b border-slate-200 bg-slate-50/70 text-left">

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Rank
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Market
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Direction
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Ranking
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Quality
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Confidence
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Structure
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Risk
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {signals.map((signal) => (

                        <tr
                          key={signal.symbol}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                        >

                          <td className="px-5 py-5">

                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${getRankClasses(
                                signal.ranking.rank,
                              )}`}
                            >
                              {signal.ranking.rank}
                            </div>

                          </td>


                          <td className="px-5 py-5">

                            <p className="font-semibold text-slate-900">
                              {signal.symbol}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {signal.timeframe}
                            </p>

                          </td>


                          <td className="px-5 py-5">

                            <DirectionDisplay
                              direction={
                                signal.direction
                              }
                            />

                          </td>


                          <td className="px-5 py-5">

                            <p className="text-xl font-bold text-slate-900">
                              {formatScore(
                                signal.ranking.score,
                              )}
                            </p>

                            <ScoreBar
                              value={
                                signal.ranking.score
                              }
                            />

                          </td>


                          <td className="px-5 py-5">

                            <div className="flex items-center gap-2">

                              <span className="font-semibold text-slate-900">
                                {formatScore(
                                  signal.quality.quality_score,
                                )}
                              </span>

                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getQualityClasses(
                                  signal.quality.quality_grade,
                                )}`}
                              >
                                {signal.quality.quality_grade}
                              </span>

                            </div>

                          </td>


                          <td className="px-5 py-5">

                            <p className="font-semibold text-slate-900">
                              {formatPercentage(
                                signal.confidence,
                              )}
                            </p>

                          </td>


                          <td className="px-5 py-5">

                            <div className="space-y-1 text-xs">

                              <p className="text-slate-600">
                                <span className="font-semibold text-slate-400">
                                  Trend:
                                </span>{" "}
                                {signal.trend}
                              </p>

                              <p className="text-slate-600">
                                <span className="font-semibold text-slate-400">
                                  Momentum:
                                </span>{" "}
                                {signal.momentum}
                              </p>

                              <p className="text-slate-600">
                                <span className="font-semibold text-slate-400">
                                  Volatility:
                                </span>{" "}
                                {signal.volatility}
                              </p>

                            </div>

                          </td>


                          <td className="px-5 py-5">

                            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                              {signal.risk?.risk_level ??
                                "Unknown"}
                            </span>

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>


                {/* Mobile/tablet cards */}
                <div className="space-y-4 p-4 lg:hidden">

                  {signals.map((signal) => (

                    <RankingCard
                      key={signal.symbol}
                      signal={signal}
                    />

                  ))}

                </div>

              </section>


              {/* Ranking methodology */}
              <section className="mt-6 grid gap-6 lg:grid-cols-2">

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="mb-5 flex items-center gap-2">

                    <BarChart3
                      size={20}
                      className="text-blue-600"
                    />

                    <h2 className="font-semibold text-slate-900">
                      Ranking Methodology
                    </h2>

                  </div>


                  <div className="space-y-3">

                    <WeightRow
                      label="Signal Quality"
                      value="60%"
                    />

                    <WeightRow
                      label="Model Confidence"
                      value="25%"
                    />

                    <WeightRow
                      label="Directional Strength"
                      value="15%"
                    />

                  </div>

                  <p className="mt-5 text-xs leading-5 text-slate-500">
                    Ranking is comparative. It helps identify which
                    currently generated signals have stronger
                    quantitative evidence relative to the other
                    supported markets.
                  </p>

                </div>


                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="mb-5 flex items-center gap-2">

                    <Brain
                      size={20}
                      className="text-blue-600"
                    />

                    <h2 className="font-semibold text-slate-900">
                      Signal Quality
                    </h2>

                  </div>


                  <div className="grid gap-3 sm:grid-cols-2">

                    <QualityComponent
                      label="Directional strength"
                      value="35%"
                    />

                    <QualityComponent
                      label="Confidence"
                      value="30%"
                    />

                    <QualityComponent
                      label="Indicator agreement"
                      value="15%"
                    />

                    <QualityComponent
                      label="Volatility quality"
                      value="10%"
                    />

                    <QualityComponent
                      label="Risk quality"
                      value="10%"
                    />

                  </div>

                </div>

              </section>


              {/* Disclaimer */}
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-100 p-4 text-xs leading-5 text-slate-500">

                <div className="flex items-start gap-2">

                  <ShieldAlert
                    size={16}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />

                  <p>
                    Signal Quality Score and Ranking Score measure
                    the strength and consistency of quantitative
                    evidence. They are not probabilities of trade
                    success and do not guarantee future market
                    outcomes. Market conditions can change rapidly.
                  </p>

                </div>

              </div>


              {/* Data information */}
              <div className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500 shadow-sm sm:flex-row sm:items-center sm:justify-between">

                <span>
                  Ranking based on {data.data_points} market data
                  points per supported market.
                </span>

                <span>
                  SignalPilot quantitative ranking engine ·{" "}
                  {data.interval}
                </span>

              </div>

            </>
          )}

        </div>
      </main>
    </>
  );
}


function DirectionDisplay({
  direction,
}: {
  direction: RankedSignal["direction"];
}) {
  const Icon =
    direction === "UP"
      ? TrendingUp
      : direction === "DOWN"
        ? TrendingDown
        : Activity;

  const classes =
    getDirectionClasses(direction);

  return (
    <div className="flex items-center gap-2">

      <Icon
        size={18}
        className={classes}
      />

      <span
        className={`text-sm font-semibold ${classes}`}
      >
        {getDirectionLabel(direction)}
      </span>

    </div>
  );
}


function ScoreBar({
  value,
}: {
  value: number;
}) {
  const width = Math.min(
    100,
    Math.max(0, value),
  );

  return (
    <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">

      <div
        className="h-full rounded-full bg-blue-600 transition-all"
        style={{
          width: `${width}%`,
        }}
      />

    </div>
  );
}


function RankingCard({
  signal,
}: {
  signal: RankedSignal;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between gap-4">

        <div className="flex items-center gap-3">

          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${getRankClasses(
              signal.ranking.rank,
            )}`}
          >
            {signal.ranking.rank}
          </div>

          <div>

            <p className="font-bold text-slate-900">
              {signal.symbol}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {signal.timeframe}
            </p>

          </div>

        </div>


        <DirectionDisplay
          direction={signal.direction}
        />

      </div>


      <div className="mt-5 grid grid-cols-2 gap-3">

        <MobileMetric
          label="Ranking score"
          value={formatScore(
            signal.ranking.score,
          )}
        />

        <MobileMetric
          label="Quality"
          value={formatScore(
            signal.quality.quality_score,
          )}
        />

        <MobileMetric
          label="Confidence"
          value={formatPercentage(
            signal.confidence,
          )}
        />

        <MobileMetric
          label="Risk"
          value={
            signal.risk?.risk_level ??
            "Unknown"
          }
        />

      </div>


      <div className="mt-4 rounded-xl bg-slate-50 p-4">

        <div className="mb-2 flex items-center justify-between">

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Quality grade
          </p>

          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getQualityClasses(
              signal.quality.quality_grade,
            )}`}
          >
            {signal.quality.quality_grade}
          </span>

        </div>


        <div className="grid gap-2 text-xs sm:grid-cols-3">

          <p className="text-slate-600">
            <span className="font-semibold text-slate-400">
              Trend:
            </span>{" "}
            {signal.trend}
          </p>

          <p className="text-slate-600">
            <span className="font-semibold text-slate-400">
              Momentum:
            </span>{" "}
            {signal.momentum}
          </p>

          <p className="text-slate-600">
            <span className="font-semibold text-slate-400">
              Volatility:
            </span>{" "}
            {signal.volatility}
          </p>

        </div>

      </div>

    </div>
  );
}


function MobileMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">

      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}


function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">

      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}


function WeightRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">

      <span className="text-sm text-slate-600">
        {label}
      </span>

      <span className="text-sm font-bold text-slate-900">
        {value}
      </span>

    </div>
  );
}


function QualityComponent({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">

      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}