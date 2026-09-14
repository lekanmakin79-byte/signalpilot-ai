"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronLeft,
  Gauge,
  Info,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { useEffect, useState } from "react";

import SignalPilotNavigation from "@/components/SignalPilotNavigation";
import ReturnToTop from "@/components/ReturnToTop";

import {
  getAIAnalysis,
  type AIAnalysisResponse,
  type FundamentalFactor,
} from "@/lib/signalpilot-api";

const MARKET_OPTIONS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "XAU/USD",
];

const TIMEFRAME_OPTIONS = [
  "5m",
  "15m",
  "1h",
  "4h",
  "1d",
];

function isValidNumber(
  value: number | null | undefined,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function formatPrice(
  value: number | null | undefined,
  symbol: string,
) {
  if (!isValidNumber(value)) {
    return "N/A";
  }

  if (symbol === "XAU/USD") {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (symbol === "USD/JPY") {
    return value.toFixed(3);
  }

  return value.toFixed(5);
}

function formatIndicator(
  value: number | null | undefined,
  decimals = 5,
) {
  if (!isValidNumber(value)) {
    return "N/A";
  }

  return value.toFixed(decimals);
}

function formatRSI(
  value: number | null | undefined,
) {
  if (!isValidNumber(value)) {
    return "N/A";
  }

  return value.toFixed(2);
}

function formatPercentage(
  value: number | null | undefined,
  decimals = 2,
) {
  if (!isValidNumber(value)) {
    return "N/A";
  }

  return `${value.toFixed(decimals)}%`;
}

function formatRatio(
  value: number | null | undefined,
) {
  if (!isValidNumber(value)) {
    return "N/A";
  }

  return `${(value * 100).toFixed(1)}%`;
}

function getDirectionClasses(
  direction: string,
) {
  if (direction === "UP") {
    return {
      badge: "bg-emerald-50 text-emerald-700",
      icon: "bg-emerald-50 text-emerald-600",
      text: "text-emerald-600",
    };
  }

  if (direction === "DOWN") {
    return {
      badge: "bg-red-50 text-red-700",
      icon: "bg-red-50 text-red-600",
      text: "text-red-600",
    };
  }

  return {
    badge: "bg-slate-100 text-slate-600",
    icon: "bg-slate-100 text-slate-500",
    text: "text-slate-600",
  };
}

function getQualityClasses(
  grade: string,
) {
  if (grade === "EXCEPTIONAL") {
    return {
      badge: "bg-emerald-50 text-emerald-700",
      bar: "bg-emerald-500",
      value: "text-emerald-700",
    };
  }

  if (grade === "STRONG") {
    return {
      badge: "bg-blue-50 text-blue-700",
      bar: "bg-blue-500",
      value: "text-blue-700",
    };
  }

  if (grade === "GOOD") {
    return {
      badge: "bg-cyan-50 text-cyan-700",
      bar: "bg-cyan-500",
      value: "text-cyan-700",
    };
  }

  if (grade === "MODERATE") {
    return {
      badge: "bg-amber-50 text-amber-700",
      bar: "bg-amber-500",
      value: "text-amber-700",
    };
  }

  return {
    badge: "bg-slate-100 text-slate-600",
    bar: "bg-slate-500",
    value: "text-slate-700",
  };
}

function getFundamentalBiasClasses(
  bias: string,
) {
  if (bias === "POSITIVE") {
    return {
      badge: "bg-emerald-50 text-emerald-700",
      value: "text-emerald-700",
    };
  }

  if (bias === "NEGATIVE") {
    return {
      badge: "bg-red-50 text-red-700",
      value: "text-red-700",
    };
  }

  return {
    badge: "bg-slate-100 text-slate-600",
    value: "text-slate-700",
  };
}

function getFactorDirectionClasses(
  direction: string,
) {
  if (direction === "positive") {
    return {
      badge: "bg-emerald-50 text-emerald-700",
      text: "text-emerald-700",
    };
  }

  if (direction === "negative") {
    return {
      badge: "bg-red-50 text-red-700",
      text: "text-red-700",
    };
  }

  return {
    badge: "bg-slate-100 text-slate-600",
    text: "text-slate-600",
  };
}

function getRiskClasses(
  risk: string,
) {
  if (risk === "LOWER") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (risk === "MODERATE") {
    return "bg-amber-50 text-amber-700";
  }

  if (risk === "ELEVATED") {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}

function getScoreBarWidth(
  value: number | null | undefined,
) {
  if (!isValidNumber(value)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, value),
  );
}

function formatFundamentalFactorValue(
  factor: FundamentalFactor,
) {
  if (!isValidNumber(factor.value)) {
    return "N/A";
  }

  if (
    factor.unit ===
    "percentage_points"
  ) {
    return `${factor.value.toFixed(3)} pp`;
  }

  if (factor.unit === "percent") {
    return `${factor.value.toFixed(3)}%`;
  }

  return factor.value.toFixed(4);
}

export default function AIAnalysisPage() {
  const [symbol, setSymbol] =
    useState("EUR/USD");

  const [timeframe, setTimeframe] =
    useState("5m");

  const [data, setData] =
    useState<AIAnalysisResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  async function loadAnalysis() {
    try {
      setLoading(true);
      setError(null);

      const response =
        await getAIAnalysis(
          symbol,
          timeframe,
          100,
        );

      setData(response);
    } catch (err) {
      console.error(
        "SignalPilot AI Analysis error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load AI analysis.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalysis();
  }, [symbol, timeframe]);

  const analysis =
    data?.analysis;

  const ai =
    data?.ai;

  const direction =
    analysis?.direction ?? "NEUTRAL";

  const directionClasses =
    getDirectionClasses(direction);

  const confidence =
    isValidNumber(
      analysis?.confidence,
    )
      ? Math.max(
          0,
          Math.min(
            100,
            analysis.confidence,
          ),
        )
      : 0;

  const quality =
    analysis?.quality;

  const ranking =
    analysis?.ranking;

  const opportunity =
    analysis?.opportunity;

  const fundamental =
    analysis?.fundamental;

  const analytics =
    analysis?.data_analytics;

  const qualityClasses =
    getQualityClasses(
      quality?.quality_grade ?? "WEAK",
    );

  const fundamentalBiasClasses =
    getFundamentalBiasClasses(
      fundamental?.bias ?? "NEUTRAL",
    );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SignalPilotNavigation />

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

          <section className="mb-7">
            <div className="mb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            </div>

            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                    <Brain className="h-5 w-5" />
                  </div>

                  <span className="text-sm font-semibold text-blue-600">
                    SignalPilot AI
                  </span>
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  AI Analysis
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  A dedicated AI interpretation layer that
                  explains the current market conditions,
                  quantitative evidence, signal quality,
                  fundamental context, data analytics,
                  market ranking, opportunity strength,
                  uncertainty and risk.
                </p>
              </div>

              <button
                type="button"
                onClick={loadAnalysis}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loading
                      ? "animate-spin"
                      : ""
                  }`}
                />
                Refresh Analysis
              </button>
            </div>
          </section>

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="ai-market"
                  className="mb-2 block text-xs font-semibold text-slate-600"
                >
                  Market
                </label>

                <select
                  id="ai-market"
                  value={symbol}
                  onChange={(event) =>
                    setSymbol(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {MARKET_OPTIONS.map(
                    (market) => (
                      <option
                        key={market}
                        value={market}
                      >
                        {market}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="ai-timeframe"
                  className="mb-2 block text-xs font-semibold text-slate-600"
                >
                  Analysis timeframe
                </label>

                <select
                  id="ai-timeframe"
                  value={timeframe}
                  onChange={(event) =>
                    setTimeframe(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {TIMEFRAME_OPTIONS.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
          </section>

          {error && (
            <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <div>
                  <p className="font-semibold text-red-800">
                    AI analysis unavailable
                  </p>

                  <p className="mt-1 text-sm leading-5 text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            </section>
          )}

          {loading && (
            <section className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({
                  length: 4,
                }).map(
                  (_, index) => (
                    <div
                      key={index}
                      className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
                    />
                  ),
                )}
              </div>

              <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            </section>
          )}

          {!loading &&
            analysis &&
            ai && (
              <div className="space-y-6">

                {/* Overview */}
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    icon={
                      <TrendingUp className="h-5 w-5" />
                    }
                    label="Current price"
                    value={formatPrice(
                      analysis.price,
                      analysis.symbol,
                    )}
                    detail={`${analysis.symbol} · ${analysis.interval}`}
                  />

                  <MetricCard
                    icon={
                      direction === "UP" ? (
                        <ArrowUpRight className="h-5 w-5" />
                      ) : direction === "DOWN" ? (
                        <ArrowDownRight className="h-5 w-5" />
                      ) : (
                        <Target className="h-5 w-5" />
                      )
                    }
                    label="AI market direction"
                    value={direction}
                    detail="Quantitative signal direction"
                    valueClass={
                      directionClasses.text
                    }
                  />

                  <MetricCard
                    icon={
                      <Gauge className="h-5 w-5" />
                    }
                    label="Model confidence"
                    value={`${confidence.toFixed(1)}%`}
                    detail={`${analysis.data_points} candles analysed`}
                  />

                  <MetricCard
                    icon={
                      <ShieldCheck className="h-5 w-5" />
                    }
                    label="Risk level"
                    value={
                      analysis.risk.risk_level
                    }
                    detail="Current analytical risk assessment"
                    valueClass={
                      analysis.risk.risk_level === "LOWER"
                        ? "text-emerald-600"
                        : analysis.risk.risk_level === "ELEVATED"
                          ? "text-red-600"
                          : "text-amber-600"
                    }
                  />
                </section>

                {/* Market Intelligence */}
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Target className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="font-bold text-slate-900">
                          Market Intelligence
                        </h2>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Quantitative quality, comparative ranking
                          and opportunity context for the selected market.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-3">

                    <IntelligenceCard
                      title="Signal Quality"
                      icon={
                        <CheckCircle2 className="h-5 w-5" />
                      }
                      description="Strength and consistency of the current quantitative evidence."
                    >
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className={`text-3xl font-bold ${qualityClasses.value}`}>
                            {isValidNumber(
                              quality?.quality_score,
                            )
                              ? quality.quality_score.toFixed(1)
                              : "N/A"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Quality Score
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${qualityClasses.badge}`}
                        >
                          {quality?.quality_grade ?? "N/A"}
                        </span>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${qualityClasses.bar}`}
                          style={{
                            width: `${getScoreBarWidth(
                              quality?.quality_score,
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="mt-5 space-y-3">
                        <IntelligenceMetric
                          label="Directional strength"
                          value={quality?.components.directional_strength}
                        />

                        <IntelligenceMetric
                          label="Indicator agreement"
                          value={quality?.components.indicator_agreement}
                        />

                        <IntelligenceMetric
                          label="Volatility quality"
                          value={quality?.components.volatility_quality}
                        />

                        <IntelligenceMetric
                          label="Risk quality"
                          value={quality?.components.risk_quality}
                        />
                      </div>
                    </IntelligenceCard>

                    <IntelligenceCard
                      title="Market Ranking"
                      icon={
                        <BarChart3 className="h-5 w-5" />
                      }
                      description="Relative position against the other supported markets."
                    >
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-3xl font-bold text-blue-700">
                            {isValidNumber(
                              ranking?.score,
                            )
                              ? ranking.score.toFixed(1)
                              : "N/A"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Ranking Score
                          </p>
                        </div>

                        <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          Rank {ranking?.rank ?? "N/A"} / 4
                        </div>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{
                            width: `${getScoreBarWidth(
                              ranking?.score,
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <div className="flex items-start gap-2">
                          <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                          <p className="text-xs leading-5 text-blue-800">
                            This score is comparative. It shows
                            how the selected market currently ranks
                            against the four supported markets.
                          </p>
                        </div>
                      </div>
                    </IntelligenceCard>

                    <IntelligenceCard
                      title="Opportunity"
                      icon={
                        <Target className="h-5 w-5" />
                      }
                      description="Relative strength of the current quantitative opportunity."
                    >
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-3xl font-bold text-slate-900">
                            {isValidNumber(
                              opportunity?.score,
                            )
                              ? opportunity.score.toFixed(1)
                              : "N/A"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Opportunity Score
                          </p>
                        </div>

                        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          Rank {opportunity?.rank ?? "N/A"} / 4
                        </div>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-700"
                          style={{
                            width: `${getScoreBarWidth(
                              opportunity?.score,
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start gap-2">
                          <Target className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />

                          <p className="text-xs leading-5 text-slate-600">
                            Combines ranking, quality, confidence
                            and analytical risk. It is a comparative
                            evidence score, not a probability of success.
                          </p>
                        </div>
                      </div>
                    </IntelligenceCard>
                  </div>

                  <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
                    <div className="flex items-start gap-2">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                      <p className="text-xs leading-5 text-slate-500">
                        Quality, ranking and opportunity scores describe
                        current quantitative evidence. They are not
                        probabilities, predictions or guarantees of future
                        market performance.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Fundamental Analysis */}
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <BarChart3 className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="font-bold text-slate-900">
                          Fundamental Analysis
                        </h2>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Market-specific economic factors derived from
                          verified central-bank and economic data providers.
                        </p>
                      </div>
                    </div>
                  </div>

                  {!fundamental?.available ? (
                    <div className="p-5 sm:p-6">
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                          <div>
                            <p className="font-semibold text-amber-800">
                              Fundamental data unavailable
                            </p>

                            <p className="mt-1 text-sm leading-5 text-amber-700">
                              {fundamental?.message ??
                                "No verified fundamental-data provider returned usable observations for this market."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
                        <MetricCard
                          icon={
                            <Gauge className="h-5 w-5" />
                          }
                          label="Fundamental score"
                          value={
                            isValidNumber(
                              fundamental.score,
                            )
                              ? fundamental.score.toFixed(2)
                              : "N/A"
                          }
                          detail="Weighted analytical factor score"
                          valueClass={
                            fundamentalBiasClasses.value
                          }
                        />

                        <MetricCard
                          icon={
                            fundamental.bias === "POSITIVE" ? (
                              <TrendingUp className="h-5 w-5" />
                            ) : fundamental.bias === "NEGATIVE" ? (
                              <TrendingDown className="h-5 w-5" />
                            ) : (
                              <Target className="h-5 w-5" />
                            )
                          }
                          label="Fundamental bias"
                          value={
                            fundamental.bias
                          }
                          detail="Current factor direction"
                          valueClass={
                            fundamentalBiasClasses.value
                          }
                        />

                        <MetricCard
                          icon={
                            <CheckCircle2 className="h-5 w-5" />
                          }
                          label="Economic factors"
                          value={String(
                            fundamental.factor_count,
                          )}
                          detail="Verified factors included"
                        />
                      </div>

                      <div className="border-t border-slate-200 p-5 sm:p-6">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-slate-800">
                              Fundamental factors
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                           Analytical direction and magnitude of each available factor.
                           Positive or negative describes the factor signal, not a guaranteed
                           price movement.
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${fundamentalBiasClasses.badge}`}
                          >
                            {fundamental.bias}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {fundamental.factors.map(
                            (factor, index) => {
                              const factorClasses =
                                getFactorDirectionClasses(
                                  factor.direction,
                                );

                              return (
                                <FundamentalFactorRow
                                  key={`${factor.name}-${index}`}
                                  factor={factor}
                                  badgeClass={
                                    factorClasses.badge
                                  }
                                />
                              );
                            },
                          )}
                        </div>
                      </div>

                      <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-slate-400" />

                            <span className="text-xs text-slate-500">
                              Providers:{" "}
                              {fundamental.providers?.length
                                ? fundamental.providers.join(
                                    ", ",
                                  )
                                : "N/A"}
                            </span>
                          </div>

                          <span className="text-xs text-slate-400">
                            Sources:{" "}
                            {fundamental.source_count ?? "N/A"}
                          </span>
                        </div>

                        <p className="mt-3 text-xs leading-5 text-slate-500">
                          {fundamental.disclaimer}
                        </p>
                      </div>
                    </>
                  )}
                </section>

                {/* Data Analytics */}
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                        <BarChart3 className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="font-bold text-slate-900">
                          Data Analytics
                        </h2>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Descriptive, diagnostic, predictive and
                          prescriptive analytics derived from the
                          selected market's candle data.
                        </p>
                      </div>
                    </div>
                  </div>

                  {analytics && (
                    <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-2">

                      {/* Descriptive */}
                      <AnalyticsCard
                        title="Descriptive Analytics"
                        icon={
                          <BarChart3 className="h-5 w-5" />
                        }
                        description="What the market data currently shows."
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <AnalyticsMetric
                            label="Current price"
                            value={formatPrice(
                              analytics.descriptive.current_price,
                              analysis.symbol,
                            )}
                          />

                          <AnalyticsMetric
                            label="Starting price"
                            value={formatPrice(
                              analytics.descriptive.starting_price,
                              analysis.symbol,
                            )}
                          />

                          <AnalyticsMetric
                            label="High"
                            value={formatPrice(
                              analytics.descriptive.high,
                              analysis.symbol,
                            )}
                          />

                          <AnalyticsMetric
                            label="Low"
                            value={formatPrice(
                              analytics.descriptive.low,
                              analysis.symbol,
                            )}
                          />

                          <AnalyticsMetric
                            label="Price change"
                            value={formatPercentage(
                              analytics.descriptive.price_change_percent,
                            )}
                          />

                          <AnalyticsMetric
                            label="Average return"
                            value={formatPercentage(
                              analytics.descriptive.average_return_percent,
                              4,
                            )}
                          />

                          <AnalyticsMetric
                            label="Median return"
                            value={formatPercentage(
                              analytics.descriptive.median_return_percent,
                              4,
                            )}
                          />

                          <AnalyticsMetric
                            label="Return volatility"
                            value={formatPercentage(
                              analytics.descriptive.return_volatility_percent,
                              4,
                            )}
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <AnalyticsMetric
                            label="Positive"
                            value={String(
                              analytics.descriptive.positive_periods,
                            )}
                          />

                          <AnalyticsMetric
                            label="Negative"
                            value={String(
                              analytics.descriptive.negative_periods,
                            )}
                          />

                          <AnalyticsMetric
                            label="Flat"
                            value={String(
                              analytics.descriptive.flat_periods,
                            )}
                          />
                        </div>
                      </AnalyticsCard>

                      {/* Diagnostic */}
                      <AnalyticsCard
                        title="Diagnostic Analytics"
                        icon={
                          <Target className="h-5 w-5" />
                        }
                        description="What the observed market behaviour suggests about its recent structure."
                      >
                        {!analytics.diagnostic.available ? (
                          <UnavailableAnalytics
                            reason={
                              analytics.diagnostic.reason
                            }
                          />
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <AnalyticsMetric
                              label="Dominant direction"
                              value={
                                analytics.diagnostic
                                  .dominant_direction ??
                                "N/A"
                              }
                            />

                            <AnalyticsMetric
                              label="Positive periods"
                              value={formatRatio(
                                analytics.diagnostic
                                  .positive_period_ratio,
                              )}
                            />

                            <AnalyticsMetric
                              label="Negative periods"
                              value={formatRatio(
                                analytics.diagnostic
                                  .negative_period_ratio,
                              )}
                            />

                            <AnalyticsMetric
                              label="First-half return"
                              value={formatPercentage(
                                analytics.diagnostic
                                  .average_return_first_half_percent,
                                4,
                              )}
                            />

                            <AnalyticsMetric
                              label="Second-half return"
                              value={formatPercentage(
                                analytics.diagnostic
                                  .average_return_second_half_percent,
                                4,
                              )}
                            />

                            <AnalyticsMetric
                              label="Regime change"
                              value={formatPercentage(
                                analytics.diagnostic
                                  .return_regime_change_percent,
                                4,
                              )}
                            />

                            <AnalyticsMetric
                              label="Maximum drawdown"
                              value={formatPercentage(
                                analytics.diagnostic
                                  .maximum_drawdown_percent,
                                4,
                              )}
                            />
                          </div>
                        )}
                      </AnalyticsCard>

                      {/* Predictive */}
                      <AnalyticsCard
                        title="Predictive Analytics"
                        icon={
                          <TrendingUp className="h-5 w-5" />
                        }
                        description="A statistical baseline derived from recent returns, not a guaranteed forecast."
                      >
                        {!analytics.predictive.available ? (
                          <UnavailableAnalytics
                            reason={
                              analytics.predictive.reason
                            }
                          />
                        ) : (
                          <>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <AnalyticsMetric
                                label="Assessment"
                                value={
                                  analytics.predictive
                                    .directional_assessment ??
                                  "N/A"
                                }
                              />

                              <AnalyticsMetric
                                label="Lookback periods"
                                value={String(
                                  analytics.predictive
                                    .lookback_periods ??
                                    "N/A",
                                )}
                              />

                              <AnalyticsMetric
                                label="Recent average return"
                                value={formatPercentage(
                                  analytics.predictive
                                    .recent_average_return_percent,
                                  4,
                                )}
                              />

                              <AnalyticsMetric
                                label="Recent volatility"
                                value={formatPercentage(
                                  analytics.predictive
                                    .recent_return_volatility_percent,
                                  4,
                                )}
                              />

                              <AnalyticsMetric
                                label="Estimated next change"
                                value={formatPercentage(
                                  analytics.predictive
                                    .estimated_next_period_change_percent,
                                  4,
                                )}
                              />

                              <AnalyticsMetric
                                label="Confidence type"
                                value={
                                  analytics.predictive
                                    .confidence ??
                                  "N/A"
                                }
                              />
                            </div>

                            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                                <p className="text-xs leading-5 text-amber-800">
                                  {analytics.predictive.disclaimer}
                                </p>
                              </div>
                            </div>
                          </>
                        )}
                      </AnalyticsCard>

                      {/* Prescriptive */}
                      <AnalyticsCard
                        title="Prescriptive Analytics"
                        icon={
                          <ShieldCheck className="h-5 w-5" />
                        }
                        description="Evidence-based analytical considerations based on recent market variability."
                      >
                        {!analytics.prescriptive.available ? (
                          <UnavailableAnalytics
                            reason={
                              analytics.prescriptive.reason
                            }
                          />
                        ) : (
                          <>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <AnalyticsMetric
                                label="Environment"
                                value={
                                  analytics.prescriptive
                                    .environment ??
                                  "N/A"
                                }
                              />

                              <AnalyticsMetric
                                label="Recent average return"
                                value={formatPercentage(
                                  analytics.prescriptive
                                    .recent_average_return_percent,
                                  4,
                                )}
                              />

                              <AnalyticsMetric
                                label="Recent volatility"
                                value={formatPercentage(
                                  analytics.prescriptive
                                    .recent_volatility_percent,
                                  4,
                                )}
                              />
                            </div>

                            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                              <p className="text-xs font-bold text-blue-800">
                                Analytical consideration
                              </p>

                              <p className="mt-2 text-sm leading-5 text-blue-700">
                                {analytics.prescriptive
                                  .analytical_recommendation ??
                                  "No analytical recommendation is available."}
                              </p>
                            </div>

                            <p className="mt-4 text-xs leading-5 text-slate-500">
                              {analytics.prescriptive.disclaimer}
                            </p>
                          </>
                        )}
                      </AnalyticsCard>
                    </div>
                  )}

                  <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
                    <div className="flex items-start gap-2">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                      <p className="text-xs leading-5 text-slate-500">
                        Data analytics describe and analyse observed
                        market data. Predictive analytics provide a
                        statistical baseline rather than a guaranteed
                        forecast, while prescriptive analytics provide
                        analytical considerations rather than financial advice.
                      </p>
                    </div>
                  </div>
                </section>

                {/* AI Summary */}
                <section className="rounded-2xl border border-blue-100 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Brain className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="font-bold text-slate-900">
                          AI Market Interpretation
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                          AI-generated interpretation of the
                          quantitative market evidence.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="grid gap-6 xl:grid-cols-2">
                      <InsightCard
                        title="AI summary"
                        icon={
                          <Brain className="h-4 w-4" />
                        }
                        content={ai.summary}
                      />

                      <InsightCard
                        title="Market view"
                        icon={
                          direction === "UP" ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : direction === "DOWN" ? (
                            <TrendingDown className="h-4 w-4" />
                          ) : (
                            <Target className="h-4 w-4" />
                          )
                        }
                        content={ai.market_view}
                      />
                    </div>
                  </div>
                </section>

                {/* Evidence */}
                <section className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="font-bold text-slate-900">
                          AI Evidence
                        </h2>

                        <p className="text-xs text-slate-500">
                          Key factors identified by the model.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {ai.evidence.map(
                        (item, index) => (
                          <div
                            key={`${index}-${item}`}
                            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                            <p className="text-sm leading-5 text-slate-600">
                              {item}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="font-bold text-slate-900">
                          Uncertainty
                        </h2>

                        <p className="text-xs text-slate-500">
                          Important limitations around the current view.
                        </p>
                      </div>
                    </div>

                    <p className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                      {ai.uncertainty}
                    </p>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

                        <p className="text-xs leading-5 text-slate-500">
                          AI analysis is an interpretation of
                          market data and should not be treated
                          as a guarantee of future price movement.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Risk / Confidence */}
                <section className="grid gap-6 lg:grid-cols-3">
                  <InfoCard
                    title="Risk commentary"
                    icon={
                      <ShieldCheck className="h-5 w-5" />
                    }
                    content={ai.risk_commentary}
                  />

                  <InfoCard
                    title="Confidence note"
                    icon={
                      <Gauge className="h-5 w-5" />
                    }
                    content={ai.confidence_note}
                  />

                  <InfoCard
                    title="Educational note"
                    icon={
                      <Info className="h-5 w-5" />
                    }
                    content={ai.educational_note}
                  />
                </section>

                {/* Technical Evidence */}
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <BarChart3 className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="font-bold text-slate-900">
                          Technical Evidence
                        </h2>

                        <p className="text-xs text-slate-500">
                          Quantitative inputs supporting the AI interpretation.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        Market structure
                      </h3>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <TechnicalBox
                          label="Trend"
                          value={analysis.trend}
                        />

                        <TechnicalBox
                          label="Momentum"
                          value={analysis.momentum}
                        />

                        <TechnicalBox
                          label="Volatility"
                          value={analysis.volatility}
                        />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        Model scores
                      </h3>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <ScoreBox
                          label="Trend score"
                          value={analysis.scores.trend}
                        />

                        <ScoreBox
                          label="Momentum score"
                          value={analysis.scores.momentum}
                        />

                        <ScoreBox
                          label="Volatility score"
                          value={analysis.scores.volatility}
                        />

                        <ScoreBox
                          label="Directional score"
                          value={analysis.scores.directional}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 p-5 sm:p-6">
                    <h3 className="text-sm font-bold text-slate-800">
                      Technical indicators
                    </h3>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                      <IndicatorBox
                        label="EMA 20"
                        value={formatIndicator(
                          analysis.indicators.ema20,
                        )}
                      />

                      <IndicatorBox
                        label="EMA 50"
                        value={formatIndicator(
                          analysis.indicators.ema50,
                        )}
                      />

                      <IndicatorBox
                        label="RSI 14"
                        value={formatRSI(
                          analysis.indicators.rsi14,
                        )}
                      />

                      <IndicatorBox
                        label="MACD"
                        value={formatIndicator(
                          analysis.indicators.macd.macd,
                          8,
                        )}
                      />

                      <IndicatorBox
                        label="ATR 14"
                        value={formatIndicator(
                          analysis.indicators.atr14,
                          6,
                        )}
                      />
                    </div>
                  </div>
                </section>

                {/* Risk Factors */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <ShieldCheck className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="font-bold text-slate-900">
                        Analytical Risk Factors
                      </h2>

                      <p className="text-xs text-slate-500">
                        Factors currently considered by the risk assessment.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {analysis.risk.factors.map(
                      (factor, index) => (
                        <div
                          key={`${index}-${factor}`}
                          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                          <p className="text-sm leading-5 text-slate-600">
                            {factor}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </section>

                {/* Final Assessment */}
                <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <Brain className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                    <div>
                      <h2 className="font-bold text-blue-900">
                        Overall AI Assessment
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-blue-800">
                        {ai.summary}
                      </p>

                      <p className="mt-3 text-xs leading-5 text-blue-700">
                        This assessment is generated from the
                        current quantitative market inputs,
                        signal quality, comparative ranking,
                        fundamental analysis, four-layer data
                        analytics, opportunity context and the AI
                        interpretation layer. It is intended
                        for research and educational purposes.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            )}
        </div>
      </main>

      <ReturnToTop />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  valueClass = "text-slate-900",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        {icon}
      </div>

      <p className="mt-5 text-sm text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-bold tracking-tight ${valueClass}`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {detail}
      </p>
    </div>
  );
}

function InsightCard({
  title,
  icon,
  content,
}: {
  title: string;
  icon: React.ReactNode;
  content: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-2 text-blue-600">
        {icon}

        <h3 className="text-sm font-bold text-slate-800">
          {title}
        </h3>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">
        {content}
      </p>
    </div>
  );
}

function InfoCard({
  title,
  icon,
  content,
}: {
  title: string;
  icon: React.ReactNode;
  content: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>

        <h3 className="font-bold text-slate-900">
          {title}
        </h3>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">
        {content}
      </p>
    </div>
  );
}

function IntelligenceCard({
  title,
  icon,
  description,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-2 text-blue-600">
        {icon}

        <h3 className="text-sm font-bold text-slate-800">
          {title}
        </h3>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>

      <div className="mt-5">
        {children}
      </div>
    </div>
  );
}

function IntelligenceMetric({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-slate-500">
        {label}
      </span>

      <span className="text-xs font-bold text-slate-700">
        {isValidNumber(value)
          ? `${value.toFixed(1)}%`
          : "N/A"}
      </span>
    </div>
  );
}

function FundamentalFactorRow({
  factor,
  badgeClass,
}: {
  factor: FundamentalFactor;
  badgeClass: string;
}) {
  const hasChangeValues =
    isValidNumber(
      factor.current_value,
    ) &&
    isValidNumber(
      factor.previous_value,
    );

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-slate-800">
              {factor.name.replaceAll(
                "_",
                " ",
              )}
            </p>

            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${badgeClass}`}
            >
              {factor.direction}
            </span>

            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase text-slate-500">
              {factor.importance}
            </span>
          </div>

          {hasChangeValues && (
  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
    <span>
      Current:{" "}
      <span className="font-semibold text-slate-700">
        {factor.current_value?.toFixed(4)}
      </span>
    </span>

    <span>
      Previous:{" "}
      <span className="font-semibold text-slate-700">
        {factor.previous_value?.toFixed(4)}
      </span>
    </span>
  </div>
)}

          {factor.base_currency &&
            factor.quote_currency && (
              <p className="mt-1 text-xs text-slate-400">
                {factor.base_currency}
                {" / "}
                {factor.quote_currency}
              </p>
            )}
        </div>

        <div className="shrink-0">
          <p className="text-lg font-bold text-slate-800">
            {formatFundamentalFactorValue(
              factor,
            )}
          </p>

          <p className="text-right text-[11px] text-slate-400">
            {factor.unit ===
            "percentage_points"
              ? "percentage points"
              : factor.unit ===
                  "percent"
                ? "percent change"
                : "factor value"}
          </p>
        </div>
      </div>
    </div>
  );
}

function AnalyticsCard({
  title,
  icon,
  description,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-2 text-blue-600">
        {icon}

        <h3 className="text-sm font-bold text-slate-800">
          {title}
        </h3>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>

      <div className="mt-5">
        {children}
      </div>
    </div>
  );
}

function AnalyticsMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function UnavailableAnalytics({
  reason,
}: {
  reason?: string;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

        <p className="text-xs leading-5 text-amber-800">
          {reason ??
            "Insufficient data is available for this analytics layer."}
        </p>
      </div>
    </div>
  );
}

function TechnicalBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function ScoreBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">
          {label}
        </p>

        <span className="text-sm font-bold text-slate-800">
          {value.toFixed(3)}
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-500"
          style={{
            width: `${Math.min(
              100,
              Math.abs(value) * 100,
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

function IndicatorBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}