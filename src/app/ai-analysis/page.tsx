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
    return value.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    );
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
) {
  if (!isValidNumber(value)) {
    return "N/A";
  }

  return `${value.toFixed(1)}%`;
}


function getDirectionClasses(
  direction: string,
) {
  if (direction === "UP") {
    return {
      badge:
        "bg-emerald-50 text-emerald-700",
      icon:
        "bg-emerald-50 text-emerald-600",
      text:
        "text-emerald-600",
    };
  }

  if (direction === "DOWN") {
    return {
      badge:
        "bg-red-50 text-red-700",
      icon:
        "bg-red-50 text-red-600",
      text:
        "text-red-600",
    };
  }

  return {
    badge:
      "bg-slate-100 text-slate-600",
    icon:
      "bg-slate-100 text-slate-500",
    text:
      "text-slate-600",
  };
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


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      <SignalPilotNavigation />


      <main className="lg:pl-64">

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

          {/* Page Header */}
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
                  quantitative evidence, uncertainty and risk.
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


          {/* Controls */}
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


          {/* Error */}
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


          {/* Loading */}
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


          {/* Analysis */}
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
                  />

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
                        current quantitative market inputs and
                        the AI interpretation layer. It is intended
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