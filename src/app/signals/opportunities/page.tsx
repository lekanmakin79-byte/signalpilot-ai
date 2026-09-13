"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  ChevronLeft,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import SignalPilotNavigation from "@/components/SignalPilotNavigation";
import ReturnToTop from "@/components/ReturnToTop";
import {
  getSignalOpportunities,
  OpportunitySignal,
} from "@/lib/signalpilot-api";

const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1D"] as const;

type Timeframe = (typeof TIMEFRAMES)[number];

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatPercentage(value: number | null | undefined): string {
  if (!isValidNumber(value)) {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}

function formatScore(value: number | null | undefined): string {
  if (!isValidNumber(value)) {
    return "—";
  }

  return value.toFixed(1);
}

function getDirectionLabel(
  direction: OpportunitySignal["direction"],
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
  direction: OpportunitySignal["direction"],
): string {
  if (direction === "UP") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (direction === "DOWN") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-slate-50 text-slate-600 border-slate-200";
}

function getQualityClasses(
  grade: OpportunitySignal["quality"]["quality_grade"],
): string {
  switch (grade) {
    case "EXCEPTIONAL":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "STRONG":
      return "bg-green-50 text-green-700 border-green-200";

    case "GOOD":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "MODERATE":
      return "bg-amber-50 text-amber-700 border-amber-200";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

function getRiskClasses(riskLevel: string): string {
  switch (riskLevel.toUpperCase()) {
    case "LOWER":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "MODERATE":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "ELEVATED":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

function getOpportunityClasses(score: number): string {
  if (score >= 90) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (score >= 80) {
    return "bg-green-50 text-green-700 border-green-200";
  }

  if (score >= 70) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (score >= 60) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-slate-50 text-slate-600 border-slate-200";
}

function getOpportunityLabel(score: number): string {
  if (score >= 90) {
    return "Exceptional";
  }

  if (score >= 80) {
    return "Strong";
  }

  if (score >= 70) {
    return "Good";
  }

  if (score >= 60) {
    return "Moderate";
  }

  return "Weak";
}

function getTrendClasses(trend: string): string {
  const normalized = trend.toUpperCase();

  if (normalized.includes("BULLISH")) {
    return "text-emerald-700";
  }

  if (normalized.includes("BEARISH")) {
    return "text-red-700";
  }

  return "text-slate-600";
}

function getMomentumClasses(momentum: string): string {
  const normalized = momentum.toUpperCase();

  if (normalized.includes("POSITIVE")) {
    return "text-emerald-700";
  }

  if (normalized.includes("NEGATIVE")) {
    return "text-red-700";
  }

  return "text-slate-600";
}

function DirectionDisplay({
  direction,
}: {
  direction: OpportunitySignal["direction"];
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${getDirectionClasses(
        direction,
      )}`}
    >
      {direction === "UP" ? (
        <TrendingUp className="h-3 w-3" />
      ) : direction === "DOWN" ? (
        <TrendingDown className="h-3 w-3" />
      ) : (
        <Activity className="h-3 w-3" />
      )}

      {getDirectionLabel(direction)}
    </span>
  );
}

function ScoreBar({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  const safeValue = isValidNumber(value)
    ? Math.max(0, Math.min(100, value))
    : 0;

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
        {label ? (
          <span className="truncate text-slate-500">{label}</span>
        ) : (
          <span />
        )}

        <span className="shrink-0 font-semibold text-slate-700">
          {formatScore(safeValue)}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-700 transition-all"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function OpportunityCard({
  opportunity,
}: {
  opportunity: OpportunitySignal;
}) {
  const opportunityScore = opportunity.opportunity.score;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {opportunity.opportunity.rank}
            </span>

            <div className="min-w-0">
              <h3 className="font-bold text-slate-900">
                {opportunity.symbol}
              </h3>

              <p className="text-xs text-slate-500">
                {opportunity.timeframe}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <DirectionDisplay direction={opportunity.direction} />
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div
            className={`inline-flex flex-col items-center rounded-xl border px-3 py-2 ${getOpportunityClasses(
              opportunityScore,
            )}`}
          >
            <span className="text-[9px] font-semibold uppercase tracking-wide">
              Opportunity
            </span>

            <span className="text-2xl font-bold leading-none">
              {formatScore(opportunityScore)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ScoreBar
          value={opportunityScore}
          label={getOpportunityLabel(opportunityScore)}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
        <Metric
          label="Quality"
          value={`${formatScore(
            opportunity.quality.quality_score,
          )} · ${opportunity.quality.quality_grade}`}
        />

        <Metric
          label="Confidence"
          value={formatPercentage(opportunity.confidence)}
        />

        <Metric
          label="Ranking"
          value={`#${opportunity.ranking.rank} · ${formatScore(
            opportunity.ranking.score,
          )}`}
        />

        <Metric
          label="Risk"
          value={opportunity.risk.risk_level}
        />

        <Metric
          label="Trend"
          value={opportunity.trend}
        />

        <Metric
          label="Momentum"
          value={opportunity.momentum}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 text-xs">
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-slate-600">
          Volatility: {opportunity.volatility}
        </span>

        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-slate-600">
          Price:{" "}
          {isValidNumber(opportunity.price)
            ? opportunity.price.toFixed(
                opportunity.price >= 100 ? 2 : 5,
              )
            : "—"}
        </span>
      </div>
    </div>
  );
}

export default function SignalOpportunitiesPage() {
  const router = useRouter();

  const [timeframe, setTimeframe] =
    useState<Timeframe>("5m");

  const [opportunities, setOpportunities] = useState<
    OpportunitySignal[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadOpportunities(
    selectedTimeframe: Timeframe,
    isRefresh = false,
  ) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await getSignalOpportunities(
        selectedTimeframe,
        100,
      );

      if (!response.success) {
        throw new Error(
          "The Opportunity Scanner did not return valid data.",
        );
      }

      setOpportunities(response.opportunities);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load market opportunities.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadOpportunities(timeframe);
  }, [timeframe]);

  const topOpportunity = opportunities[0];

  const exceptionalCount = opportunities.filter(
    (item) => item.opportunity.score >= 90,
  ).length;

  const strongCount = opportunities.filter(
    (item) => item.opportunity.score >= 80,
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SignalPilotNavigation />

      <main className="w-full px-4 py-5 sm:px-6 lg:ml-64 lg:w-[calc(100%-16rem)] lg:px-7 lg:py-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                <Target className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Top Opportunities
                </h1>

                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  AI Market Scanner for the strongest
                  current quantitative opportunities
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              loadOpportunities(timeframe, true)
            }
            disabled={refreshing || loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh scanner"}
          </button>
        </div>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-600" />

            <h2 className="text-sm font-semibold text-slate-800">
              Analysis timeframe
            </h2>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {TIMEFRAMES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTimeframe(item)}
                className={`rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                  timeframe === item
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <RefreshCw className="mx-auto h-7 w-7 animate-spin text-slate-400" />

            <p className="mt-3 text-sm font-medium text-slate-600">
              Scanning supported markets...
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Generating signals, measuring quality and
              ranking current opportunities.
            </p>
          </section>
        ) : error ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h2 className="font-semibold text-red-800">
                  Opportunity Scanner unavailable
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    loadOpportunities(timeframe, true)
                  }
                  className="mt-4 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                >
                  Try again
                </button>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Markets scanned
                  </p>

                  <Activity className="h-4 w-4 text-slate-400" />
                </div>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {opportunities.length}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Current {timeframe} signals
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Top score
                  </p>

                  <Target className="h-4 w-4 text-slate-400" />
                </div>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {topOpportunity
                    ? formatScore(
                        topOpportunity.opportunity.score,
                      )
                    : "—"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {topOpportunity
                    ? topOpportunity.symbol
                    : "No opportunity"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Exceptional
                  </p>

                  <Brain className="h-4 w-4 text-slate-400" />
                </div>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {exceptionalCount}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Opportunity score ≥ 90
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Strong+
                  </p>

                  <ShieldAlert className="h-4 w-4 text-slate-400" />
                </div>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {strongCount}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Opportunity score ≥ 80
                </p>
              </div>
            </section>

            {topOpportunity && (
              <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white">
                        #1 Opportunity
                      </span>

                      <DirectionDisplay
                        direction={topOpportunity.direction}
                      />

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getQualityClasses(
                          topOpportunity.quality
                            .quality_grade,
                        )}`}
                      >
                        {topOpportunity.quality.quality_grade}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h2 className="text-2xl font-bold text-slate-900">
                        {topOpportunity.symbol}
                      </h2>

                      <p className="text-sm text-slate-500">
                        {topOpportunity.timeframe} ·{" "}
                        {topOpportunity.trend} ·{" "}
                        {topOpportunity.momentum}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 lg:justify-end">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Opportunity Score
                      </p>

                      <p className="mt-1 text-3xl font-bold text-slate-900">
                        {formatScore(
                          topOpportunity.opportunity.score,
                        )}
                      </p>
                    </div>

                    <div className="h-11 w-px bg-slate-200" />

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Quality
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {formatScore(
                          topOpportunity.quality
                            .quality_score,
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
                  <Metric
                    label="Confidence"
                    value={formatPercentage(
                      topOpportunity.confidence,
                    )}
                  />

                  <Metric
                    label="Ranking Score"
                    value={formatScore(
                      topOpportunity.ranking.score,
                    )}
                  />

                  <Metric
                    label="Risk"
                    value={topOpportunity.risk.risk_level}
                  />

                  <Metric
                    label="Volatility"
                    value={topOpportunity.volatility}
                  />
                </div>
              </section>
            )}

            <section className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      <th className="w-[7%] px-3 py-3">
                        Rank
                      </th>

                      <th className="w-[12%] px-3 py-3">
                        Market
                      </th>

                      <th className="w-[17%] px-3 py-3">
                        Opportunity
                      </th>

                      <th className="w-[11%] px-3 py-3">
                        Quality
                      </th>

                      <th className="w-[10%] px-3 py-3">
                        Confidence
                      </th>

                      <th className="w-[12%] px-3 py-3">
                        Direction
                      </th>

                      <th className="w-[12%] px-3 py-3">
                        Trend
                      </th>

                      <th className="w-[12%] px-3 py-3">
                        Momentum
                      </th>

                      <th className="w-[7%] px-3 py-3">
                        Risk
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {opportunities.map((opportunity) => (
                      <tr
                        key={`${opportunity.symbol}-${opportunity.timeframe}`}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-3 py-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                            {opportunity.opportunity.rank}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {opportunity.symbol}
                            </p>

                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {opportunity.timeframe}
                            </p>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="min-w-0">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span
                                className={`truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getOpportunityClasses(
                                  opportunity
                                    .opportunity
                                    .score,
                                )}`}
                              >
                                {getOpportunityLabel(
                                  opportunity
                                    .opportunity
                                    .score,
                                )}
                              </span>

                              <span className="shrink-0 text-xs font-bold text-slate-900">
                                {formatScore(
                                  opportunity
                                    .opportunity
                                    .score,
                                )}
                              </span>
                            </div>

                            <ScoreBar
                              value={
                                opportunity.opportunity
                                  .score
                              }
                            />
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="min-w-0">
                            <span
                              className={`inline-flex max-w-full truncate rounded-full border px-2 py-1 text-[10px] font-semibold ${getQualityClasses(
                                opportunity.quality
                                  .quality_grade,
                              )}`}
                            >
                              {
                                opportunity.quality
                                  .quality_grade
                              }
                            </span>

                            <p className="mt-1 text-[10px] text-slate-500">
                              {formatScore(
                                opportunity.quality
                                  .quality_score,
                              )}
                            </p>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <p className="text-xs font-semibold text-slate-800">
                            {formatPercentage(
                              opportunity.confidence,
                            )}
                          </p>
                        </td>

                        <td className="px-3 py-3">
                          <DirectionDisplay
                            direction={
                              opportunity.direction
                            }
                          />
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className={`block truncate text-[11px] font-semibold ${getTrendClasses(
                              opportunity.trend,
                            )}`}
                            title={opportunity.trend}
                          >
                            {opportunity.trend}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className={`block truncate text-[11px] font-semibold ${getMomentumClasses(
                              opportunity.momentum,
                            )}`}
                            title={opportunity.momentum}
                          >
                            {opportunity.momentum}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${getRiskClasses(
                              opportunity.risk
                                .risk_level,
                            )}`}
                          >
                            {
                              opportunity.risk
                                .risk_level
                            }
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-4 lg:hidden">
              {opportunities.map((opportunity) => (
                <OpportunityCard
                  key={`${opportunity.symbol}-${opportunity.timeframe}`}
                  opportunity={opportunity}
                />
              ))}
            </section>

            <section className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-slate-600" />

                  <h2 className="font-semibold text-slate-900">
                    How Opportunity Score works
                  </h2>
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  The Opportunity Scanner combines the
                  comparative ranking, signal quality,
                  confidence and risk characteristics of
                  each currently generated market signal.
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                    <span className="text-sm text-slate-600">
                      Ranking Score
                    </span>

                    <span className="font-bold text-slate-900">
                      45%
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                    <span className="text-sm text-slate-600">
                      Quality Score
                    </span>

                    <span className="font-bold text-slate-900">
                      30%
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                    <span className="text-sm text-slate-600">
                      Confidence
                    </span>

                    <span className="font-bold text-slate-900">
                      15%
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                    <span className="text-sm text-slate-600">
                      Risk Quality
                    </span>

                    <span className="font-bold text-slate-900">
                      10%
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                  <div className="min-w-0">
                    <h2 className="font-semibold text-amber-900">
                      Important interpretation
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-amber-800">
                      Opportunity Score measures the
                      relative strength of the available
                      quantitative evidence across the
                      supported markets. It is{" "}
                      <strong>
                        not a probability of trade success
                      </strong>{" "}
                      and does not guarantee a future market
                      outcome.
                    </p>

                    <p className="mt-3 text-sm leading-6 text-amber-800">
                      A higher score means that the current
                      combination of ranking, quality,
                      confidence and risk characteristics is
                      comparatively stronger than
                      lower-ranked opportunities.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-slate-600" />

                <h2 className="font-semibold text-slate-900">
                  Scanner methodology
                </h2>
              </div>

              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="font-semibold text-slate-800">
                    1. Generate signals
                  </p>

                  <p className="mt-1 leading-6 text-slate-500">
                    Current quantitative signals are
                    generated for every supported market.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-slate-800">
                    2. Measure quality
                  </p>

                  <p className="mt-1 leading-6 text-slate-500">
                    Directional strength, confidence,
                    indicator agreement, volatility and
                    risk are evaluated.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-slate-800">
                    3. Compare markets
                  </p>

                  <p className="mt-1 leading-6 text-slate-500">
                    Signals are comparatively ranked using
                    quality, confidence and directional
                    strength.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-slate-800">
                    4. Scan opportunities
                  </p>

                  <p className="mt-1 leading-6 text-slate-500">
                    The scanner combines the evidence into a
                    final opportunity ranking.
                  </p>
                </div>
              </div>
            </section>

            <div className="mt-5 flex flex-col gap-1 border-t border-slate-200 pt-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>
                SignalPilot AI · {opportunities.length}{" "}
                markets scanned · {timeframe}
              </span>

              <span>
                Current quantitative analysis only
              </span>
            </div>
          </>
        )}
      </main>

      <ReturnToTop />
    </div>
  );
}
