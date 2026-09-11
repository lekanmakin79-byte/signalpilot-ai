"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  Brain,
  ChevronLeft,
  Gauge,
  LineChart,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

import {
  getAIAnalysis,
  getMarketQuotes,
  type AIAnalysisResponse,
  type MarketQuote,
} from "@/lib/signalpilot-api";

import SignalPilotNavigation from "@/components/SignalPilotNavigation";
import ReturnToTop from "@/components/ReturnToTop";

import { useRouter } from "next/navigation";


const MARKETS = [
  "EUR/USD",
  "GBP/USD",
  "XAU/USD",
  "USD/JPY",
];

const TIMEFRAMES = [
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1D", value: "1d" },
];


export default function MarketsPage() {
  const router = useRouter();

  const [selectedMarket, setSelectedMarket] =
    useState("EUR/USD");

  const [selectedTimeframe, setSelectedTimeframe] =
    useState("5m");

  const [markets, setMarkets] =
    useState<MarketQuote[]>([]);

  const [data, setData] =
    useState<AIAnalysisResponse | null>(null);

  const [loadingMarkets, setLoadingMarkets] =
    useState(true);

  const [loadingAnalysis, setLoadingAnalysis] =
    useState(true);

  const [marketError, setMarketError] =
    useState<string | null>(null);

  const [analysisError, setAnalysisError] =
    useState<string | null>(null);


  async function loadMarkets() {
    try {
      setLoadingMarkets(true);
      setMarketError(null);

      const result = await getMarketQuotes();

      setMarkets(
        Array.isArray(result.markets)
          ? result.markets
          : [],
      );
    } catch (err) {
      console.error(
        "Failed to load market quotes:",
        err,
      );

      setMarketError(
        "Unable to load live market data. Please try again.",
      );
    } finally {
      setLoadingMarkets(false);
    }
  }


  async function loadAnalysis(
    market = selectedMarket,
    timeframe = selectedTimeframe,
  ) {
    try {
      setLoadingAnalysis(true);
      setAnalysisError(null);

      const result = await getAIAnalysis(
        market,
        timeframe,
        100,
      );

      setData(result);
    } catch (err) {
      console.error(
        "Failed to load market analysis:",
        err,
      );

      setAnalysisError(
        "Unable to load market analysis. Please try again.",
      );
    } finally {
      setLoadingAnalysis(false);
    }
  }


  useEffect(() => {
    loadMarkets();
    loadAnalysis();

    // Initial page load only.
    // Market/timeframe changes are handled by their buttons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const analysis = data?.analysis;
  const ai = data?.ai;


  const selectedQuote = useMemo(() => {
    return markets.find(
      (market) => market.symbol === selectedMarket,
    );
  }, [markets, selectedMarket]);


  const directionLabel = useMemo(() => {
    if (!analysis) {
      return "—";
    }

    if (analysis.direction === "UP") {
      return "Bullish";
    }

    if (analysis.direction === "DOWN") {
      return "Bearish";
    }

    return "Neutral";
  }, [analysis]);


  /*
   * Defensive numeric helpers.
   *
   * API values can occasionally be missing, null, or
   * arrive in an unexpected form. These helpers prevent
   * one malformed value from crashing the entire page.
   */

  function isValidNumber(
    value: unknown,
  ): value is number {
    return (
      typeof value === "number" &&
      Number.isFinite(value)
    );
  }


  function formatPrice(
    price: unknown,
  ) {
    if (!isValidNumber(price)) {
      return "—";
    }

    if (price >= 1000) {
      return price.toLocaleString(
        undefined,
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      );
    }

    if (price >= 10) {
      return price.toFixed(3);
    }

    return price.toFixed(5);
  }


  function formatIndicator(
    value: unknown,
  ) {
    if (!isValidNumber(value)) {
      return "—";
    }

    return value.toFixed(5);
  }


  function formatRSI(
    value: unknown,
  ) {
    if (!isValidNumber(value)) {
      return "—";
    }

    return value.toFixed(2);
  }


  function formatMACD(
    value: unknown,
  ) {
    if (!isValidNumber(value)) {
      return "—";
    }

    return value.toExponential(3);
  }


  function formatPercentage(
    value: unknown,
    decimals = 1,
  ) {
    if (!isValidNumber(value)) {
      return "—";
    }

    return `${value.toFixed(decimals)}%`;
  }


  function formatChange(
    value: unknown,
  ) {
    if (!isValidNumber(value)) {
      return "—";
    }

    const prefix =
      value > 0
        ? "+"
        : "";

    return `${prefix}${value.toFixed(4)}%`;
  }


  function selectMarket(
    market: string,
  ) {
    setSelectedMarket(market);

    loadAnalysis(
      market,
      selectedTimeframe,
    );
  }


  function selectTimeframe(
    timeframe: string,
  ) {
    setSelectedTimeframe(timeframe);

    loadAnalysis(
      selectedMarket,
      timeframe,
    );
  }


  function handleBack() {
    router.back();
  }


  return (
    <>
      <SignalPilotNavigation />

      <ReturnToTop />

      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:ml-64 lg:px-8">
        <div className="mx-auto max-w-7xl">

          {/* Header */}
          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                <LineChart className="h-4 w-4" />
                Market Intelligence
              </div>

              <h1 className="text-3xl font-bold tracking-tight">
                Markets
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Monitor live market conditions and analyse
                technical structure, confidence, risk and
                AI-assisted market intelligence.
              </p>
            </div>


            <div className="flex flex-wrap items-center gap-3">

              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>

              <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Live market data
              </div>

            </div>
          </div>


          {/* Live market overview */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-center justify-between">

              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-slate-600" />

                  <h2 className="font-semibold">
                    Live Markets
                  </h2>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Current prices and market direction from
                  SignalPilot market data.
                </p>
              </div>


              <button
                type="button"
                onClick={loadMarkets}
                disabled={loadingMarkets}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMarkets
                  ? "Refreshing..."
                  : "Refresh"}
              </button>

            </div>


            {marketError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">

                <div className="flex items-start gap-3">

                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                  <div>
                    <p className="font-medium text-red-900">
                      Market data unavailable
                    </p>

                    <p className="mt-1 text-sm text-red-700">
                      {marketError}
                    </p>
                  </div>

                </div>

              </div>
            )}


            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              {MARKETS.map((market) => {

                const quote = markets.find(
                  (item) => item.symbol === market,
                );

                const active =
                  market === selectedMarket;

                const direction =
                  quote?.direction || "FLAT";


                return (
                  <button
                    key={market}
                    type="button"
                    onClick={() =>
                      selectMarket(market)
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50"
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <span className="font-semibold">
                        {market}
                      </span>

                      {active && (
                        <Activity className="h-4 w-4" />
                      )}

                    </div>


                    {quote ? (
                      <>
                        <div className="mt-4 flex items-end justify-between gap-3">

                          <div>

                            <div
                              className={`text-xl font-bold ${
                                active
                                  ? "text-white"
                                  : "text-slate-900"
                              }`}
                            >
                              {formatPrice(
                                quote.price,
                              )}
                            </div>

                            <div
                              className={`mt-1 text-xs ${
                                active
                                  ? "text-slate-300"
                                  : "text-slate-500"
                              }`}
                            >
                              {formatChange(
                                quote.change_percent,
                              )}
                            </div>

                          </div>


                          <div
                            className={`flex items-center gap-1 text-xs font-semibold ${
                              direction === "UP"
                                ? "text-emerald-600"
                                : direction === "DOWN"
                                  ? "text-red-600"
                                  : "text-slate-500"
                            } ${
                              active
                                ? direction === "UP"
                                  ? "text-emerald-300"
                                  : direction === "DOWN"
                                    ? "text-red-300"
                                    : "text-slate-300"
                                : ""
                            }`}
                          >

                            {direction === "UP" ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : direction === "DOWN" ? (
                              <ArrowDownRight className="h-4 w-4" />
                            ) : (
                              <Activity className="h-4 w-4" />
                            )}

                            {direction}

                          </div>

                        </div>


                        <div
                          className={`mt-4 flex items-center gap-2 text-xs ${
                            active
                              ? "text-emerald-300"
                              : "text-emerald-600"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          LIVE
                        </div>
                      </>
                    ) : (
                      <div
                        className={`mt-4 text-sm ${
                          active
                            ? "text-slate-300"
                            : "text-slate-500"
                        }`}
                      >
                        {loadingMarkets
                          ? "Loading..."
                          : "Market unavailable"}
                      </div>
                    )}

                  </button>
                );
              })}

            </div>

          </section>


          {/* Market selector */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-4">

              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-slate-600" />

                <h2 className="font-semibold">
                  Selected market
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Choose the market for detailed quantitative
                and AI-assisted analysis.
              </p>

            </div>


            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              {MARKETS.map((market) => {

                const active =
                  market === selectedMarket;

                return (
                  <button
                    key={market}
                    type="button"
                    onClick={() =>
                      selectMarket(market)
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50"
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <span className="font-semibold">
                        {market}
                      </span>

                      {active && (
                        <Activity className="h-4 w-4" />
                      )}

                    </div>

                    <div
                      className={`mt-2 text-xs ${
                        active
                          ? "text-slate-300"
                          : "text-slate-500"
                      }`}
                    >
                      Detailed analysis
                    </div>

                  </button>
                );
              })}

            </div>

          </section>


          {/* Timeframe */}
          <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="font-semibold">
                Analysis timeframe
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Choose the timeframe used for the technical
                and AI analysis.
              </p>
            </div>


            <div className="flex flex-wrap gap-2">

              {TIMEFRAMES.map((timeframe) => {

                const active =
                  timeframe.value === selectedTimeframe;

                return (
                  <button
                    key={timeframe.value}
                    type="button"
                    onClick={() =>
                      selectTimeframe(
                        timeframe.value,
                      )
                    }
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {timeframe.label}
                  </button>
                );
              })}

            </div>

          </section>


          {/* Analysis loading */}
          {loadingAnalysis && (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />

              <p className="font-medium">
                Analysing {selectedMarket}...
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Fetching candle data and generating AI-assisted
                market intelligence.
              </p>

            </div>
          )}


          {/* Analysis error */}
          {!loadingAnalysis && analysisError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">

              <div className="flex items-start gap-3">

                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />

                <div>

                  <h2 className="font-semibold text-red-900">
                    Analysis unavailable
                  </h2>

                  <p className="mt-1 text-sm text-red-700">
                    {analysisError}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      loadAnalysis()
                    }
                    className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Try again
                  </button>

                </div>

              </div>

            </div>
          )}


          {/* Analysis */}
          {!loadingAnalysis &&
            !analysisError &&
            analysis &&
            ai && (
              <div className="space-y-6">

                {/* Selected market status */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <div className="flex items-center gap-3">

                        <div className="rounded-lg bg-slate-100 p-2">
                          <LineChart className="h-5 w-5 text-slate-700" />
                        </div>

                        <div>

                          <h2 className="font-semibold">
                            {analysis.symbol}
                          </h2>

                          <p className="text-sm text-slate-500">
                            {analysis.interval} quantitative
                            market assessment
                          </p>

                        </div>

                      </div>

                    </div>


                    <div className="flex items-center gap-3">

                      <div
                        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${
                          analysis.direction === "UP"
                            ? "bg-emerald-50 text-emerald-700"
                            : analysis.direction === "DOWN"
                              ? "bg-red-50 text-red-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >

                        {analysis.direction === "UP" ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : analysis.direction === "DOWN" ? (
                          <ArrowDown className="h-4 w-4" />
                        ) : (
                          <Activity className="h-4 w-4" />
                        )}

                        {analysis.direction}

                      </div>

                      {selectedQuote && (
                        <span className="text-xs font-medium text-emerald-600">
                          LIVE
                        </span>
                      )}

                    </div>

                  </div>

                </section>


                {/* Price / signal overview */}
                <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">
                        Current price
                      </span>

                      <LineChart className="h-5 w-5 text-slate-400" />
                    </div>

                    <div className="mt-3 text-2xl font-bold">
                      {formatPrice(
                        analysis.price,
                      )}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {analysis.symbol} · {analysis.interval}
                    </div>

                  </div>


                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                    <div className="flex items-center justify-between">

                      <span className="text-sm text-slate-500">
                        Technical bias
                      </span>

                      {analysis.direction === "UP" ? (
                        <ArrowUp className="h-5 w-5 text-emerald-600" />
                      ) : analysis.direction === "DOWN" ? (
                        <ArrowDown className="h-5 w-5 text-red-600" />
                      ) : (
                        <Activity className="h-5 w-5 text-slate-400" />
                      )}

                    </div>

                    <div className="mt-3 text-2xl font-bold">
                      {directionLabel}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Current quantitative assessment
                    </div>

                  </div>


                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                    <div className="flex items-center justify-between">

                      <span className="text-sm text-slate-500">
                        Model confidence
                      </span>

                      <Gauge className="h-5 w-5 text-slate-400" />

                    </div>

                    <div className="mt-3 text-2xl font-bold">
                      {formatPercentage(
                        analysis.confidence,
                        1,
                      )}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Model-confidence score
                    </div>

                  </div>


                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                    <div className="flex items-center justify-between">

                      <span className="text-sm text-slate-500">
                        Risk assessment
                      </span>

                      <ShieldAlert className="h-5 w-5 text-slate-400" />

                    </div>

                    <div className="mt-3 text-2xl font-bold">
                      {analysis.risk.risk_level}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Based on current analytical conditions
                    </div>

                  </div>

                </section>


                {/* Technical structure */}
                <section className="grid gap-6 lg:grid-cols-2">

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                    <div className="mb-6 flex items-center gap-3">

                      <div className="rounded-lg bg-slate-100 p-2">
                        <TrendingUp className="h-5 w-5 text-slate-700" />
                      </div>

                      <div>

                        <h2 className="font-semibold">
                          Technical Structure
                        </h2>

                        <p className="text-sm text-slate-500">
                          Quantitative market conditions
                        </p>

                      </div>

                    </div>


                    <div className="space-y-4">

                      <MetricRow
                        label="Trend"
                        value={analysis.trend}
                      />

                      <MetricRow
                        label="Momentum"
                        value={analysis.momentum}
                      />

                      <MetricRow
                        label="Volatility"
                        value={analysis.volatility}
                      />

                      <MetricRow
                        label="Data points"
                        value={
                          isValidNumber(
                            analysis.data_points,
                          )
                            ? analysis.data_points.toString()
                            : "—"
                        }
                      />

                    </div>

                  </div>


                  {/* Indicators */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                    <div className="mb-6 flex items-center gap-3">

                      <div className="rounded-lg bg-slate-100 p-2">
                        <Activity className="h-5 w-5 text-slate-700" />
                      </div>

                      <div>

                        <h2 className="font-semibold">
                          Technical Indicators
                        </h2>

                        <p className="text-sm text-slate-500">
                          Current calculated indicators
                        </p>

                      </div>

                    </div>


                    <div className="grid grid-cols-2 gap-4">

                      <IndicatorCard
                        label="EMA 20"
                        value={formatIndicator(
                          analysis.indicators.ema20,
                        )}
                      />

                      <IndicatorCard
                        label="EMA 50"
                        value={formatIndicator(
                          analysis.indicators.ema50,
                        )}
                      />

                      <IndicatorCard
                        label="RSI 14"
                        value={formatRSI(
                          analysis.indicators.rsi14,
                        )}
                      />

                      <IndicatorCard
                        label="ATR 14"
                        value={formatIndicator(
                          analysis.indicators.atr14,
                        )}
                      />

                      <IndicatorCard
                        label="MACD"
                        value={formatMACD(
                          analysis.indicators.macd.macd,
                        )}
                      />

                      <IndicatorCard
                        label="MACD Signal"
                        value={formatMACD(
                          analysis.indicators.macd.signal,
                        )}
                      />

                    </div>

                  </div>

                </section>


                {/* Scores */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="mb-6">

                    <h2 className="font-semibold">
                      Confidence Components
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      How the current model assessment is composed.
                    </p>

                  </div>


                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    <ScoreCard
                      label="Trend score"
                      value={analysis.scores.trend}
                    />

                    <ScoreCard
                      label="Momentum score"
                      value={analysis.scores.momentum}
                    />

                    <ScoreCard
                      label="Volatility score"
                      value={analysis.scores.volatility}
                    />

                    <ScoreCard
                      label="Directional score"
                      value={analysis.scores.directional}
                    />

                  </div>

                </section>


                {/* AI Intelligence */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="mb-6 flex items-center justify-between">

                    <div className="flex items-center gap-3">

                      <div className="rounded-lg bg-slate-900 p-2">
                        <Brain className="h-5 w-5 text-white" />
                      </div>

                      <div>

                        <h2 className="font-semibold">
                          AI Market Intelligence
                        </h2>

                        <p className="text-sm text-slate-500">
                          Groq-powered interpretation of the
                          quantitative analysis
                        </p>

                      </div>

                    </div>


                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      AI ACTIVE
                    </span>

                  </div>


                  <div className="grid gap-6 lg:grid-cols-2">

                    <div>

                      <h3 className="mb-2 text-sm font-semibold text-slate-500">
                        Current assessment
                      </h3>

                      <p className="text-lg font-medium leading-7">
                        {ai.summary}
                      </p>

                    </div>


                    <div>

                      <h3 className="mb-2 text-sm font-semibold text-slate-500">
                        Market view
                      </h3>

                      <p className="leading-7 text-slate-700">
                        {ai.market_view}
                      </p>

                    </div>

                  </div>


                  {/* Evidence */}
                  <div className="mt-8 border-t border-slate-100 pt-6">

                    <h3 className="mb-4 font-semibold">
                      Key evidence
                    </h3>

                    <div className="space-y-3">

                      {Array.isArray(ai.evidence) &&
                        ai.evidence.map(
                          (item, index) => (
                            <div
                              key={index}
                              className="flex gap-3"
                            >

                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />

                              <p className="text-sm leading-6 text-slate-600">
                                {item}
                              </p>

                            </div>
                          ),
                        )}

                    </div>

                  </div>


                  {/* Uncertainty / risk */}
                  <div className="mt-8 grid gap-4 lg:grid-cols-2">

                    <div className="rounded-xl bg-amber-50 p-5">

                      <div className="mb-2 flex items-center gap-2">

                        <AlertTriangle className="h-4 w-4 text-amber-700" />

                        <h3 className="font-semibold text-amber-900">
                          Uncertainty
                        </h3>

                      </div>

                      <p className="text-sm leading-6 text-amber-900/80">
                        {ai.uncertainty}
                      </p>

                    </div>


                    <div className="rounded-xl bg-slate-100 p-5">

                      <div className="mb-2 flex items-center gap-2">

                        <ShieldAlert className="h-4 w-4 text-slate-700" />

                        <h3 className="font-semibold text-slate-900">
                          Risk intelligence
                        </h3>

                      </div>

                      <p className="text-sm leading-6 text-slate-700">
                        {ai.risk_commentary}
                      </p>

                    </div>

                  </div>


                  {/* Confidence note */}
                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">

                    <h3 className="mb-2 text-sm font-semibold">
                      Model confidence
                    </h3>

                    <p className="text-sm leading-6 text-slate-600">
                      {ai.confidence_note}
                    </p>

                  </div>


                  <div className="mt-4 text-xs leading-5 text-slate-400">
                    {ai.educational_note}
                  </div>

                </section>

              </div>
            )}

        </div>
      </main>
    </>
  );
}


function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">

      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-sm font-semibold">
        {value}
      </span>

    </div>
  );
}


function IndicatorCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div className="mt-1 font-semibold">
        {value}
      </div>

    </div>
  );
}


function ScoreCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const safeValue =
    typeof value === "number" &&
    Number.isFinite(value)
      ? value.toFixed(3)
      : "—";

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-xl font-bold">
        {safeValue}
      </div>

    </div>
  );
}