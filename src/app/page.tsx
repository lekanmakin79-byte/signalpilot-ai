import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  ChevronRight,
  Clock3,
  Gauge,
  LineChart,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const markets = [
  {
    symbol: "EUR/USD",
    name: "Euro / US Dollar",
    price: "1.17342",
    change: "+0.42%",
    direction: "UP",
  },
  {
    symbol: "GBP/USD",
    name: "British Pound / US Dollar",
    price: "1.35186",
    change: "+0.31%",
    direction: "UP",
  },
  {
    symbol: "XAU/USD",
    name: "Gold / US Dollar",
    price: "3,628.40",
    change: "-0.18%",
    direction: "DOWN",
  },
  {
    symbol: "USD/JPY",
    name: "US Dollar / Japanese Yen",
    price: "147.420",
    change: "-0.27%",
    direction: "DOWN",
  },
];

const features = [
  {
    icon: Brain,
    title: "AI Market Analysis",
    description:
      "Combine technical indicators, market structure and AI reasoning to analyse potential market setups.",
  },
  {
    icon: Gauge,
    title: "Confidence Scoring",
    description:
      "Every signal receives a transparent confidence score based on multiple market conditions.",
  },
  {
    icon: LineChart,
    title: "Performance Tracking",
    description:
      "Track historical signals and measure how strategies perform across different markets.",
  },
  {
    icon: ShieldCheck,
    title: "Risk Intelligence",
    description:
      "Identify market conditions where a setup may be weaker, conflicted or too volatile.",
  },
];

const steps = [
  {
    number: "01",
    title: "Collect market data",
    description: "Price, volume and market conditions are collected for analysis.",
  },
  {
    number: "02",
    title: "Analyse the market",
    description:
      "Indicators, trend, momentum and volatility are evaluated together.",
  },
  {
    number: "03",
    title: "Generate AI intelligence",
    description:
      "The AI evaluates the combined evidence and produces an analysis.",
  },
  {
    number: "04",
    title: "Track the outcome",
    description:
      "Historical results are recorded so performance can be measured.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Activity className="h-6 w-6" />
            </div>

            <div>
              <div className="text-lg font-bold tracking-tight text-slate-900">
                SignalPilot AI
              </div>
              <div className="text-xs text-slate-500">
                AI Market Intelligence
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <Link
              href="#markets"
              className="transition hover:text-blue-600"
            >
              Markets
            </Link>

            <Link
              href="#features"
              className="transition hover:text-blue-600"
            >
              Features
            </Link>

            <Link
              href="#how-it-works"
              className="transition hover:text-blue-600"
            >
              How it works
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:block"
            >
              Sign in
            </Link>

            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-50">
        <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-blue-100/60 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-20 lg:pb-28 lg:pt-28">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              <Sparkles className="h-4 w-4" />
              AI-powered market intelligence
            </div>

            <h1 className="text-5xl font-bold leading-tight tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Understand the market
              <span className="block text-blue-600">
                before you make a decision.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              SignalPilot AI analyses market conditions, technical indicators
              and historical behaviour to identify potential trading setups and
              explain the reasoning behind them.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Explore Dashboard
                <ChevronRight className="h-5 w-5" />
              </Link>

              <Link
                href="#markets"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                View Markets
              </Link>
            </div>
          </div>

          {/* Hero stats */}
          <div className="mt-16 grid max-w-4xl gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-slate-500">Markets</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                Multi-Market
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Forex, Gold, Crypto & Indices
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-slate-500">Analysis</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                AI Powered
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Technical + intelligent analysis
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-slate-500">Tracking</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                Historical
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Measure signal performance
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Markets */}
      <section id="markets" className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Market Watch
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Markets we're analysing
              </h2>
            </div>

            <div className="hidden items-center gap-2 text-sm font-medium text-slate-500 sm:flex">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Analysis engine online
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {markets.map((market) => (
              <div
                key={market.symbol}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-900">
                      {market.symbol}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {market.name}
                    </p>
                  </div>

                  <div
                    className={
                      market.direction === "UP"
                        ? "flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"
                        : "flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600"
                    }
                  >
                    {market.direction === "UP" ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5" />
                    )}
                  </div>
                </div>

                <div className="mt-7 flex items-end justify-between">
                  <p className="text-xl font-bold text-slate-900">
                    {market.price}
                  </p>

                  <p
                    className={
                      market.direction === "UP"
                        ? "text-sm font-semibold text-emerald-600"
                        : "text-sm font-semibold text-red-600"
                    }
                  >
                    {market.change}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Intelligence
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              More than a simple signal generator.
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              SignalPilot is designed to combine market data, technical
              analysis, machine learning and AI explanations into one
              intelligence platform.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h3 className="text-xl font-semibold text-slate-900">
                    {feature.title}
                  </h3>

                  <p className="mt-3 leading-7 text-slate-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                How it works
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                From market data to AI intelligence.
              </h2>

              <p className="mt-5 leading-7 text-slate-600">
                The system will analyse multiple data points before producing
                an intelligence report. Every signal can then be measured
                against its historical performance.
              </p>

              <Link
                href="/dashboard"
                className="mt-7 inline-flex items-center gap-2 font-semibold text-blue-600 transition hover:text-blue-700"
              >
                Explore the platform
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="flex gap-5 rounded-xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                    {step.number}
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {step.title}
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center lg:py-28">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
            <BarChart3 className="h-7 w-7" />
          </div>

          <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Build your market intelligence dashboard.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">
            Analyse markets, monitor signals and understand the reasoning
            behind potential setups.
          </p>

          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Enter SignalPilot
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <Clock3 className="h-4 w-4" />
            SignalPilot AI
          </div>

          <p className="text-center">
            Market intelligence and analysis tools. Not financial advice.
          </p>

          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Built for informed decisions
          </div>
        </div>
      </footer>
    </main>
  );
}
