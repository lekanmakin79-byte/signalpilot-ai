"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  ChevronLeft,
  Gauge,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
  getSignal,
  type SignalResponse,
} from "@/lib/signalpilot-api";

import SignalPilotNavigation from "@/components/SignalPilotNavigation";
import ReturnToTop from "@/components/ReturnToTop";


const MARKETS = [
  "EUR/USD",
  "GBP/USD",
  "XAU/USD",
  "USD/JPY",
];

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


function formatPrice(
  price: unknown,
): string {
  if (!isValidNumber(price)) {
    return "—";
  }

  if (price >= 1000) {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (price >= 10) {
    return price.toFixed(3);
  }

  return price.toFixed(5);
}


function formatPercentage(
  value: unknown,
): string {
  if (!isValidNumber(value)) {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}


function clampConfidence(
  value: unknown,
): number {
  if (!isValidNumber(value)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, value),
  );
}


export default function SignalsPage() {
  const router = useRouter();

  const [market, setMarket] =
    useState("EUR/USD");

  const [timeframe, setTimeframe] =
    useState("5m");

  const [data, setData] =
    useState<SignalResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  async function loadSignal() {
    try {
      setLoading(true);
      setError("");

      const result = await getSignal(
        market,
        timeframe,
        100,
      );

      setData(result);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load signal data.",
      );

      setData(null);
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    loadSignal();
  }, [market, timeframe]);


  const signal = data?.signal;

  const direction =
    signal?.direction ?? "NEUTRAL";

  const directionLabel =
    direction === "UP"
      ? "Bullish"
      : direction === "DOWN"
        ? "Bearish"
        : "Neutral";

  const directionColor =
    direction === "UP"
      ? "text-emerald-600"
      : direction === "DOWN"
        ? "text-red-600"
        : "text-slate-600";

  const DirectionIcon =
    direction === "UP"
      ? TrendingUp
      : direction === "DOWN"
        ? TrendingDown
        : Activity;

  const confidence = clampConfidence(
    signal?.confidence,
  );


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
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
                <Brain size={18} />
                SignalPilot AI
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Signal Intelligence
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Quantitative market signals generated from live
                market data, technical indicators and SignalPilot&apos;s
                confidence engine.
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
                onClick={loadSignal}
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

                Refresh signal
              </button>

            </div>

          </div>


          {/* Market selector */}
          <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-4">

              <h2 className="text-sm font-semibold text-slate-900">
                Market
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Select the market to analyse.
              </p>

            </div>


            <div className="flex flex-wrap gap-2">

              {MARKETS.map((item) => (

                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setMarket(item)
                  }
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    market === item
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item}
                </button>

              ))}

            </div>

          </section>


          {/* Timeframe selector */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-4">

              <h2 className="text-sm font-semibold text-slate-900">
                Analysis timeframe
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Change the timeframe used by the quantitative engine.
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
                Analysing {market}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                SignalPilot is calculating the current quantitative
                market signal.
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
                    Unable to load signal
                  </h2>

                  <p className="mt-1 text-sm text-red-700">
                    {error}
                  </p>

                </div>

              </div>

            </div>
          )}


          {/* Signal */}
          {!loading && !error && signal && (
            <>

              {/* Main signal cards */}
              <div className="grid gap-5 lg:grid-cols-4">

                {/* Direction */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between">

                    <span className="text-sm font-medium text-slate-500">
                      Technical bias
                    </span>

                    <DirectionIcon
                      size={20}
                      className={directionColor}
                    />

                  </div>


                  <div
                    className={`mt-4 text-3xl font-bold ${directionColor}`}
                  >
                    {directionLabel}
                  </div>


                  <p className="mt-2 text-xs text-slate-500">
                    {signal.symbol} · {signal.timeframe}
                  </p>

                </div>


                {/* Confidence */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between">

                    <span className="text-sm font-medium text-slate-500">
                      Model confidence
                    </span>

                    <Gauge
                      size={20}
                      className="text-blue-600"
                    />

                  </div>


                  <div className="mt-4 text-3xl font-bold text-slate-900">
                    {formatPercentage(
                      signal.confidence,
                    )}
                  </div>


                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">

                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{
                        width: `${confidence}%`,
                      }}
                    />

                  </div>


                  <p className="mt-2 text-xs text-slate-500">
                    Model-confidence score, not a calibrated
                    probability of success.
                  </p>

                </div>


                {/* Price */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between">

                    <span className="text-sm font-medium text-slate-500">
                      Current price
                    </span>

                    <BarChart3
                      size={20}
                      className="text-slate-500"
                    />

                  </div>


                  <div className="mt-4 text-3xl font-bold text-slate-900">
                    {formatPrice(signal.price)}
                  </div>


                  <p className="mt-2 text-xs text-slate-500">
                    Based on the latest market candle.
                  </p>

                </div>


                {/* Risk */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between">

                    <span className="text-sm font-medium text-slate-500">
                      Risk assessment
                    </span>

                    <ShieldAlert
                      size={20}
                      className="text-amber-600"
                    />

                  </div>


                  <div className="mt-4 text-3xl font-bold text-slate-900">
                    {signal.risk?.risk_level ??
                      "—"}
                  </div>


                  <p className="mt-2 text-xs text-slate-500">
                    Based on confidence, volatility and
                    analytical alignment.
                  </p>

                </div>

              </div>


              {/* Market structure */}
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="mb-5">

                  <h2 className="text-lg font-semibold text-slate-900">
                    Market Structure
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Core quantitative conditions behind the signal.
                  </p>

                </div>


                <div className="grid gap-4 sm:grid-cols-3">

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Trend
                    </p>

                    <p className="mt-2 font-semibold text-slate-900">
                      {signal.trend || "—"}
                    </p>

                  </div>


                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Momentum
                    </p>

                    <p className="mt-2 font-semibold text-slate-900">
                      {signal.momentum || "—"}
                    </p>

                  </div>


                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Volatility
                    </p>

                    <p className="mt-2 font-semibold text-slate-900">
                      {signal.volatility || "—"}
                    </p>

                  </div>

                </div>

              </section>


              {/* Indicators */}
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="mb-5">

                  <h2 className="text-lg font-semibold text-slate-900">
                    Technical Indicators
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Indicators calculated from the supplied market
                    candles.
                  </p>

                </div>


                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

                  <Indicator
                    label="EMA 20"
                    value={signal.indicators?.ema20}
                  />

                  <Indicator
                    label="EMA 50"
                    value={signal.indicators?.ema50}
                  />

                  <Indicator
                    label="RSI 14"
                    value={signal.indicators?.rsi14}
                  />

                  <Indicator
                    label="ATR 14"
                    value={signal.indicators?.atr14}
                  />

                  <Indicator
                    label="MACD"
                    value={signal.indicators?.macd?.macd}
                    digits={8}
                  />

                </div>


                <div className="mt-4 grid gap-4 sm:grid-cols-2">

                  <Indicator
                    label="MACD Signal"
                    value={signal.indicators?.macd?.signal}
                    digits={8}
                  />

                  <Indicator
                    label="MACD Histogram"
                    value={signal.indicators?.macd?.histogram}
                    digits={8}
                  />

                </div>

              </section>


              {/* Confidence components */}
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="mb-5">

                  <h2 className="text-lg font-semibold text-slate-900">
                    Confidence Components
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    The components contributing to the current
                    directional assessment.
                  </p>

                </div>


                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  <ScoreCard
                    label="Trend score"
                    value={signal.scores?.trend}
                  />

                  <ScoreCard
                    label="Momentum score"
                    value={signal.scores?.momentum}
                  />

                  <ScoreCard
                    label="Volatility score"
                    value={signal.scores?.volatility}
                  />

                  <ScoreCard
                    label="Directional score"
                    value={signal.scores?.directional}
                  />

                </div>

              </section>


              {/* Explanation */}
              <section className="mt-6 grid gap-6 lg:grid-cols-2">

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="mb-4 flex items-center gap-2">

                    <Brain
                      size={20}
                      className="text-blue-600"
                    />

                    <h2 className="font-semibold text-slate-900">
                      Signal Explanation
                    </h2>

                  </div>


                  <p className="text-sm leading-6 text-slate-600">
                    {signal.explanation ||
                      "No signal explanation is available."}
                  </p>

                </div>


                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="mb-4 flex items-center gap-2">

                    <AlertTriangle
                      size={20}
                      className="text-amber-600"
                    />

                    <h2 className="font-semibold text-slate-900">
                      Risk Intelligence
                    </h2>

                  </div>


                  <div className="space-y-3">

                    {Array.isArray(
                      signal.risk?.factors,
                    ) &&
                    signal.risk.factors.length > 0 ? (
                      signal.risk.factors.map(
                        (factor, index) => (
                          <div
                            key={`${factor}-${index}`}
                            className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600"
                          >
                            {factor}
                          </div>
                        ),
                      )
                    ) : (
                      <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                        No additional risk factors reported.
                      </div>
                    )}

                  </div>

                </div>

              </section>


              {/* Data information */}
              <div className="mt-6 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500 shadow-sm sm:flex-row sm:items-center sm:justify-between">

                <span>
                  Analysis based on {signal.data_points} market
                  data points.
                </span>

                <span>
                  SignalPilot quantitative engine · {signal.timeframe}
                </span>

              </div>


              {/* Disclaimer */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-100 p-4 text-xs leading-5 text-slate-500">
                SignalPilot AI provides quantitative market
                intelligence for analytical and educational purposes.
                Model-confidence scores are not guarantees and are
                not necessarily calibrated probabilities of future
                market outcomes. Market conditions can change rapidly.
              </div>

            </>
          )}

        </div>
      </main>
    </>
  );
}


function Indicator({
  label,
  value,
  digits = 5,
}: {
  label: string;
  value: number | null | undefined;
  digits?: number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">

      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 font-semibold text-slate-900">
        {isValidNumber(value)
          ? value.toFixed(digits)
          : "—"}
      </p>

    </div>
  );
}


function ScoreCard({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-slate-900">
        {isValidNumber(value)
          ? value.toFixed(3)
          : "—"}
      </p>

    </div>
  );
}