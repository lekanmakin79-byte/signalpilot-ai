"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Brain,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Gauge,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
  Zap,
} from "lucide-react";

import {
  getAIAnalysis,
  getMarketQuotes,
  getPerformanceSummary,
  type AIAnalysisResponse,
  type MarketQuote,
  type PerformanceSummary,
} from "@/lib/signalpilot-api";

import SignalPilotNavigation from "@/components/SignalPilotNavigation";
import ReturnToTop from "@/components/ReturnToTop";


const MARKET_SYMBOLS = [
  "EUR/USD",
  "GBP/USD",
  "XAU/USD",
  "USD/JPY",
];


export default function DashboardPage() {
  const router = useRouter();

  const [markets, setMarkets] = useState<MarketQuote[]>([]);

  const [aiAnalysis, setAiAnalysis] =
    useState<AIAnalysisResponse | null>(null);

  const [performance, setPerformance] =
    useState<PerformanceSummary | null>(null);

  const [loadingMarkets, setLoadingMarkets] =
    useState(true);

  const [loadingAI, setLoadingAI] =
    useState(true);

  const [loadingPerformance, setLoadingPerformance] =
    useState(true);

  const [marketError, setMarketError] =
    useState<string | null>(null);

  const [aiError, setAIError] =
    useState<string | null>(null);

  const [performanceError, setPerformanceError] =
    useState<string | null>(null);

  const hasLoadedRef = useRef(false);


  useEffect(() => {
    if (hasLoadedRef.current) {
      return;
    }

    hasLoadedRef.current = true;


    const loadMarkets = async () => {
      setLoadingMarkets(true);
      setMarketError(null);

      try {
        const response = await getMarketQuotes();

        setMarkets(response.markets || []);
      } catch (error) {
        console.error(
          "Failed to load market quotes:",
          error,
        );

        setMarketError(
          error instanceof Error
            ? error.message
            : "Unable to load market data.",
        );
      } finally {
        setLoadingMarkets(false);
      }
    };


    const loadAI = async () => {
      setLoadingAI(true);
      setAIError(null);

      try {
        const response = await getAIAnalysis(
          "EUR/USD",
          "5m",
          100,
        );

        setAiAnalysis(response);
      } catch (error) {
        console.error(
          "Failed to load AI analysis:",
          error,
        );

        setAIError(
          error instanceof Error
            ? error.message
            : "Unable to load AI analysis.",
        );
      } finally {
        setLoadingAI(false);
      }
    };


    const loadPerformance = async () => {
      setLoadingPerformance(true);
      setPerformanceError(null);

      try {
        const response =
          await getPerformanceSummary();

        setPerformance(response.summary);
      } catch (error) {
        console.error(
          "Failed to load performance summary:",
          error,
        );

        setPerformanceError(
          error instanceof Error
            ? error.message
            : "Unable to load performance data.",
        );
      } finally {
        setLoadingPerformance(false);
      }
    };


    loadMarkets();
    loadAI();
    loadPerformance();
  }, []);


  const validMarkets = useMemo(
    () =>
      markets.filter(
        (market) => !market.error,
      ),
    [markets],
  );


  const highConfidence =
    aiAnalysis?.analysis.confidence ?? null;


  const dashboardDate =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        weekday: "long",
        month: "long",
        day: "numeric",
      },
    ).format(new Date());


  function handleBack() {
    router.back();
  }


  return (
    <>
      <SignalPilotNavigation />

      <ReturnToTop />


      <main className="min-h-screen bg-slate-50 text-slate-900 lg:ml-64">

        {/* Dashboard Header */}
        <header className="border-b border-slate-200 bg-white">

          <div className="flex items-center justify-between px-5 py-4 sm:px-8">

            <div className="flex items-center gap-3">

              <button
                type="button"
                onClick={handleBack}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-label="Go back"
              >
                <ChevronLeft className="h-4 w-4" />

                <span className="hidden sm:inline">
                  Back
                </span>
              </button>


              <div>

                <p className="text-sm text-slate-500">
                  {dashboardDate}
                </p>

                <h2 className="text-xl font-bold text-slate-900">
                  Market Intelligence
                </h2>

              </div>

            </div>


            <div className="flex items-center gap-3">

              <button
                type="button"
                onClick={() => router.push("/alerts")}
                aria-label="Open alerts"
                className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50"
              >

                <Bell className="h-5 w-5" />

                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600" />

              </button>


              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                SA
              </div>

            </div>

          </div>

        </header>


        <div className="space-y-8 p-5 sm:p-8">


          {/* Welcome */}
          <section>

            <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white shadow-sm sm:p-8">

              <div className="max-w-3xl">

                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur">

                  <Sparkles className="h-3.5 w-3.5" />

                  AI-powered market intelligence

                </div>


                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Good morning
                </h1>


                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                  Monitor markets, analyse momentum and
                  understand market conditions with
                  AI-assisted market intelligence.
                </p>


                <button
                  type="button"
                  onClick={() => router.push("/markets")}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  Explore markets

                  <ChevronRight className="h-4 w-4" />

                </button>

              </div>

            </div>

          </section>


          {/* Stats */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <StatCard
              icon={<LineChart className="h-5 w-5" />}
              label="Markets monitored"
              value={
                loadingMarkets
                  ? "..."
                  : String(
                      validMarkets.length,
                    )
              }
              detail="Live market data"
            />


            <StatCard
              icon={<Zap className="h-5 w-5" />}
              label="AI analysis"
              value={
                loadingAI
                  ? "..."
                  : aiAnalysis
                    ? "ACTIVE"
                    : "—"
              }
              detail="Groq AI"
            />


            <StatCard
              icon={<Gauge className="h-5 w-5" />}
              label="Current confidence"
              value={
                highConfidence !== null
                  ? `${highConfidence}%`
                  : "—"
              }
              detail="Model confidence"
            />


            <StatCard
              icon={<Target className="h-5 w-5" />}
              label="Data points"
              value={
                aiAnalysis
                  ? String(
                      aiAnalysis.analysis.data_points,
                    )
                  : "—"
              }
              detail="Latest analysis"
            />

          </section>


          {/* Market error */}
          {marketError && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {marketError}
            </section>
          )}


          {/* AI error */}
          {aiError && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              {aiError}
            </section>
          )}


          {/* Performance error */}
          {performanceError && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              {performanceError}
            </section>
          )}


          {/* Market Overview */}
          <section>

            <SectionHeading
              title="Market Overview"
              description="Live market conditions from SignalPilot"
              action="View all markets"
              onAction={() => router.push("/markets")}
            />


            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              {MARKET_SYMBOLS.map(
                (symbol) => {

                  const market =
                    markets.find(
                      (item) =>
                        item.symbol === symbol,
                    );


                  return (
                    <MarketCard
                      key={symbol}
                      market={market}
                      loading={loadingMarkets}
                    />
                  );
                },
              )}

            </div>

          </section>


          {/* Signals + AI insight */}
          <section className="grid gap-6 xl:grid-cols-3">


            <div className="xl:col-span-2">

              <SectionHeading
                title="AI Signal Intelligence"
                description="Current quantitative market assessment"
                action="View all signals"
                onAction={() => router.push("/signals")}
              />


              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">

                {loadingAI ? (

                  <div className="p-8 text-center text-sm text-slate-500">
                    Analysing EUR/USD with SignalPilot AI...
                  </div>

                ) : aiAnalysis ? (

                  <SignalRow
                    market={
                      aiAnalysis.analysis.symbol
                    }
                    timeframe={
                      aiAnalysis.analysis.interval
                    }
                    signal={
                      aiAnalysis.analysis.direction
                    }
                    confidence={`${aiAnalysis.analysis.confidence}%`}
                    trend={
                      formatLabel(
                        aiAnalysis.analysis.trend,
                      )
                    }
                    reason={
                      aiAnalysis.ai.summary
                    }
                  />

                ) : (

                  <div className="p-8 text-center text-sm text-slate-500">
                    No AI analysis available.
                  </div>

                )}

              </div>

            </div>


            <div>

              <SectionHeading
                title="AI Market Insight"
                description="Current EUR/USD conditions"
                action="Open AI analysis"
                onAction={() => router.push("/ai-analysis")}
              />


              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">


                <div className="mb-5 flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                    <Brain className="h-5 w-5" />

                  </div>


                  <div>

                    <p className="font-semibold text-slate-900">
                      AI interpretation
                    </p>

                    <p className="text-xs text-slate-500">
                      Groq-powered analysis
                    </p>

                  </div>

                </div>


                {loadingAI ? (

                  <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    Generating AI interpretation...
                  </div>

                ) : aiAnalysis ? (

                  <>

                    <div className="mb-5 rounded-xl bg-slate-50 p-4">

                      <div className="flex items-center justify-between">

                        <span className="text-sm text-slate-600">
                          Current direction
                        </span>


                        <span
                          className={`font-semibold ${
                            aiAnalysis.analysis.direction ===
                            "UP"
                              ? "text-emerald-600"
                              : aiAnalysis.analysis.direction ===
                                  "DOWN"
                                ? "text-red-600"
                                : "text-slate-600"
                          }`}
                        >
                          {formatLabel(
                            aiAnalysis.analysis.direction,
                          )}
                        </span>

                      </div>


                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">

                        <div
                          className={`h-full rounded-full ${
                            aiAnalysis.analysis.direction ===
                            "UP"
                              ? "bg-emerald-500"
                              : aiAnalysis.analysis.direction ===
                                  "DOWN"
                                ? "bg-red-500"
                                : "bg-slate-400"
                          }`}
                          style={{
                            width: `${Math.min(
                              aiAnalysis.analysis.confidence,
                              100,
                            )}%`,
                          }}
                        />

                      </div>


                      <div className="mt-2 flex justify-between text-xs text-slate-400">

                        <span>
                          Confidence
                        </span>

                        <span>
                          {aiAnalysis.analysis.confidence}%
                        </span>

                      </div>

                    </div>


                    <p className="text-sm leading-6 text-slate-600">
                      {aiAnalysis.ai.summary}
                    </p>


                    <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">

                      <p className="text-xs font-semibold text-blue-900">
                        Key evidence
                      </p>


                      <ul className="mt-2 space-y-2">

                        {aiAnalysis.ai.evidence
                          .slice(0, 3)
                          .map(
                            (
                              item,
                              index,
                            ) => (
                              <li
                                key={index}
                                className="text-xs leading-5 text-blue-700"
                              >
                                • {item}
                              </li>
                            ),
                          )}

                      </ul>

                    </div>


                    <div className="mt-5 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">

                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />

                      <span>
                        {aiAnalysis.ai.confidence_note}
                      </span>

                    </div>

                  </>

                ) : (

                  <p className="text-sm text-slate-500">
                    AI analysis is currently unavailable.
                  </p>

                )}

              </div>

            </div>

          </section>


          {/* Performance */}
          <section>

            <SectionHeading
              title="Signal Performance"
              description="Recorded performance from completed signal evaluations"
              action="Open performance"
              onAction={() => router.push("/performance")}
            />


            <div className="mt-4 grid gap-4 sm:grid-cols-3">

              <PerformanceCard
                label="Signals analysed"
                value={
                  loadingPerformance
                    ? "..."
                    : performance
                      ? String(
                          performance.evaluated_signals,
                        )
                      : "—"
                }
                icon={
                  <BarChart3 className="h-5 w-5" />
                }
              />


              <PerformanceCard
                label="Correct outcomes"
                value={
                  loadingPerformance
                    ? "..."
                    : performance
                      ? String(
                          performance.correct,
                        )
                      : "—"
                }
                icon={
                  <TrendingUp className="h-5 w-5" />
                }
              />


              <PerformanceCard
                label="Incorrect outcomes"
                value={
                  loadingPerformance
                    ? "..."
                    : performance
                      ? String(
                          performance.incorrect,
                        )
                      : "—"
                }
                icon={
                  <TrendingDown className="h-5 w-5" />
                }
              />

            </div>

          </section>


          {/* Footer note */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="font-semibold text-slate-900">
                  SignalPilot AI
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Market intelligence, analysis and signal
                  tracking in one platform.
                </p>

              </div>


              <div className="flex items-center gap-2 text-xs text-slate-500">

                <CircleDollarSign className="h-4 w-4" />

                Data-driven market analysis

              </div>

            </div>

          </section>

        </div>

      </main>
    </>
  );
}


function formatLabel(
  value: string,
) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}


function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>

        <span className="text-xs font-medium text-slate-500">
          {detail}
        </span>

      </div>


      <p className="mt-5 text-sm text-slate-500">
        {label}
      </p>


      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

    </div>
  );
}


function SectionHeading({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-end justify-between gap-4">

      <div>

        <h2 className="text-lg font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>

      </div>


      {action && (
        <button
          type="button"
          onClick={onAction}
          className="hidden items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 sm:flex"
        >

          {action}

          <ChevronRight className="h-4 w-4" />

        </button>
      )}

    </div>
  );
}


function MarketCard({
  market,
  loading,
}: {
  market?: MarketQuote;
  loading: boolean;
}) {

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="animate-pulse">

          <div className="h-4 w-20 rounded bg-slate-200" />

          <div className="mt-5 h-8 w-28 rounded bg-slate-200" />

          <div className="mt-5 h-4 w-24 rounded bg-slate-200" />

        </div>

      </div>
    );
  }


  if (!market || market.error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex items-center justify-between">

          <span className="font-semibold text-slate-900">
            {market?.symbol ?? "Market"}
          </span>

          <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            UNAVAILABLE
          </span>

        </div>


        <p className="mt-4 text-sm font-medium text-slate-700">
          Market data unavailable
        </p>


        <p className="mt-2 text-xs leading-5 text-slate-500">
          {market?.error ||
            "Unable to retrieve live data for this market."}
        </p>

      </div>
    );
  }


  const isUp =
    market.direction === "UP";


  const isFlat =
    market.direction === "FLAT";


  const change =
    `${market.change_percent >= 0 ? "+" : ""}${market.change_percent.toFixed(4)}%`;


  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

      <div className="flex items-center justify-between">

        <span className="font-semibold text-slate-900">
          {market.symbol}
        </span>


        <span
          className={`flex items-center gap-1 text-xs font-semibold ${
            isFlat
              ? "text-slate-500"
              : isUp
                ? "text-emerald-600"
                : "text-red-600"
          }`}
        >

          {isFlat ? (
            <LineChart className="h-4 w-4" />
          ) : isUp ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <ArrowDownRight className="h-4 w-4" />
          )}

          {change}

        </span>

      </div>


      <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        {formatPrice(
          market.price,
          market.symbol,
        )}
      </p>


      <div className="mt-4 flex items-center justify-between">

        <div>

          <p className="text-xs text-slate-400">
            Live direction
          </p>

          <p
            className={`mt-1 font-semibold ${
              isFlat
                ? "text-slate-600"
                : isUp
                  ? "text-emerald-600"
                  : "text-red-600"
            }`}
          >
            {market.direction}
          </p>

        </div>


        <span
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
            isFlat
              ? "bg-slate-100 text-slate-600"
              : isUp
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
          }`}
        >
          LIVE
        </span>

      </div>

    </div>
  );
}


function SignalRow({
  market,
  timeframe,
  signal,
  confidence,
  trend,
  reason,
}: {
  market: string;
  timeframe: string;
  signal: string;
  confidence: string;
  trend: string;
  reason: string;
}) {

  const isUp =
    signal === "UP";


  const isDown =
    signal === "DOWN";


  return (
    <div className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">

      <div className="flex items-center gap-4">

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            isUp
              ? "bg-emerald-50 text-emerald-600"
              : isDown
                ? "bg-red-50 text-red-600"
                : "bg-slate-100 text-slate-600"
          }`}
        >

          {isUp ? (
            <ArrowUpRight className="h-5 w-5" />
          ) : isDown ? (
            <ArrowDownRight className="h-5 w-5" />
          ) : (
            <LineChart className="h-5 w-5" />
          )}

        </div>


        <div>

          <div className="flex items-center gap-2">

            <p className="font-semibold text-slate-900">
              {market}
            </p>

            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">
              {timeframe}
            </span>

          </div>


          <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
            {reason}
          </p>

        </div>

      </div>


      <div className="flex items-center gap-6">

        <div className="hidden text-right sm:block">

          <p className="text-xs text-slate-400">
            Trend
          </p>

          <p className="mt-1 text-sm font-medium text-slate-700">
            {trend}
          </p>

        </div>


        <div className="text-right">

          <p className="text-xs text-slate-400">
            Confidence
          </p>

          <p className="mt-1 text-sm font-bold text-slate-900">
            {confidence}
          </p>

        </div>


        <span
          className={`rounded-lg px-3 py-2 text-xs font-bold ${
            isUp
              ? "bg-emerald-50 text-emerald-700"
              : isDown
                ? "bg-red-50 text-red-700"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {signal}
        </span>

      </div>

    </div>
  );
}


function PerformanceCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        {icon}
      </div>


      <div>

        <p className="text-sm text-slate-500">
          {label}
        </p>

        <p className="mt-1 text-xl font-bold text-slate-900">
          {value}
        </p>

      </div>

    </div>
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