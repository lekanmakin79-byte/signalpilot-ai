"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import {
  getMarketQuotes,
  type MarketQuote,
} from "@/lib/signalpilot-api";

const WATCHLIST_STORAGE_KEY = "signalpilot_watchlist";

const AVAILABLE_MARKETS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "XAU/USD",
];

const DEFAULT_WATCHLIST = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "XAU/USD",
];

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatPrice(
  symbol: string,
  price: number | undefined,
) {
  if (!isValidNumber(price)) {
    return "—";
  }

  if (symbol === "XAU/USD") {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (symbol === "USD/JPY") {
    return price.toFixed(3);
  }

  return price.toFixed(5);
}

function formatChange(value: number | undefined) {
  if (!isValidNumber(value)) {
    return "—";
  }

  const prefix = value > 0 ? "+" : "";

  return `${prefix}${value.toFixed(4)}%`;
}

function loadWatchlist(): string[] {
  if (typeof window === "undefined") {
    return DEFAULT_WATCHLIST;
  }

  try {
    const saved = window.localStorage.getItem(
      WATCHLIST_STORAGE_KEY,
    );

    if (!saved) {
      return DEFAULT_WATCHLIST;
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return DEFAULT_WATCHLIST;
    }

    const validMarkets = parsed.filter(
      (symbol): symbol is string =>
        typeof symbol === "string" &&
        AVAILABLE_MARKETS.includes(symbol),
    );

    return validMarkets.length > 0
      ? validMarkets
      : DEFAULT_WATCHLIST;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}

function directionIcon(
  direction: MarketQuote["direction"],
) {
  if (direction === "UP") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        <ArrowUp size={17} />
      </div>
    );
  }

  if (direction === "DOWN") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
        <ArrowDown size={17} />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
      <BarChart3 size={17} />
    </div>
  );
}

function directionLabel(
  direction: MarketQuote["direction"],
) {
  if (direction === "UP") {
    return "Bullish";
  }

  if (direction === "DOWN") {
    return "Bearish";
  }

  return "Flat";
}

function directionTextClass(
  direction: MarketQuote["direction"],
) {
  if (direction === "UP") {
    return "text-emerald-600";
  }

  if (direction === "DOWN") {
    return "text-red-600";
  }

  return "text-slate-500";
}

export default function WatchlistPage() {
  const router = useRouter();

  const [watchlist, setWatchlist] = useState<string[]>(
    DEFAULT_WATCHLIST,
  );

  const [markets, setMarkets] = useState<MarketQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddMarket, setShowAddMarket] = useState(false);

  useEffect(() => {
    setWatchlist(loadWatchlist());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      WATCHLIST_STORAGE_KEY,
      JSON.stringify(watchlist),
    );
  }, [watchlist]);

  async function loadMarkets(showRefreshState = false) {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const result = await getMarketQuotes();

      if (!result || !Array.isArray(result.markets)) {
        setMarkets([]);
        setError(
          "Market data returned an unexpected response.",
        );
        return;
      }

      setMarkets(result.markets);
    } catch (err) {
      console.error(
        "Watchlist market load failed:",
        err,
      );

      setMarkets([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load live market data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadMarkets();
  }, []);

  const watchlistMarkets = useMemo(() => {
    return watchlist.map((symbol) => {
      const market = markets.find(
        (item) => item.symbol === symbol,
      );

      return (
        market || {
          symbol,
          price: 0,
          change_percent: 0,
          direction: "FLAT" as const,
        }
      );
    });
  }, [watchlist, markets]);

  const filteredAvailableMarkets =
    AVAILABLE_MARKETS.filter((symbol) => {
      const matchesSearch = symbol
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const notAlreadyAdded =
        !watchlist.includes(symbol);

      return matchesSearch && notAlreadyAdded;
    });

  function addToWatchlist(symbol: string) {
    setWatchlist((current) => {
      if (current.includes(symbol)) {
        return current;
      }

      return [...current, symbol];
    });

    setShowAddMarket(false);
    setSearchTerm("");
  }

  function removeFromWatchlist(symbol: string) {
    setWatchlist((current) =>
      current.filter((item) => item !== symbol),
    );
  }

  function openMarket(_symbol: string) {
    router.push("/markets");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <Star
                  size={18}
                  className="fill-amber-400 text-amber-500"
                />

                <span className="text-sm font-medium text-amber-600">
                  Market Watchlist
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Watchlist
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Monitor the markets you want to keep an eye on.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadMarkets(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={() => setShowAddMarket(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
            >
              <Plus size={17} />

              Add market
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Watchlist markets
              </span>

              <Star
                size={18}
                className="text-amber-500"
              />
            </div>

            <div className="text-2xl font-bold text-slate-900">
              {watchlist.length}
            </div>

            <div className="mt-1 text-xs text-slate-400">
              Saved in this browser
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Live markets
              </span>

              <Eye
                size={18}
                className="text-blue-500"
              />
            </div>

            <div className="text-2xl font-bold text-slate-900">
              {markets.length}
            </div>

            <div className="mt-1 text-xs text-slate-400">
              Latest provider response
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Last update
              </span>

              <Clock3
                size={18}
                className="text-emerald-500"
              />
            </div>

            <div className="text-lg font-bold text-slate-900">
              {loading
                ? "Loading..."
                : markets.length > 0
                  ? "Live"
                  : "Unavailable"}
            </div>

            <div className="mt-1 text-xs text-slate-400">
              Refresh when you need the latest quotes
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <X
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div>
              <div className="font-medium">
                Unable to load live market data
              </div>

              <div className="mt-1 text-red-600/80">
                {error}
              </div>
            </div>
          </div>
        )}

        {/* Watchlist */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Your markets
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Live quotes and market direction
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live market data
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center">
              <RefreshCw
                size={24}
                className="mx-auto mb-3 animate-spin text-blue-500"
              />

              <p className="text-sm text-slate-500">
                Loading your watchlist...
              </p>
            </div>
          ) : watchlistMarkets.length === 0 ? (
            <div className="p-10 text-center">
              <Star
                size={34}
                className="mx-auto mb-4 text-slate-300"
              />

              <h3 className="font-semibold text-slate-900">
                Your watchlist is empty
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Add markets to quickly monitor their latest
                prices and direction.
              </p>

              <button
                type="button"
                onClick={() => setShowAddMarket(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
              >
                <Plus size={16} />
                Add market
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {watchlistMarkets.map((market) => (
                <div
                  key={market.symbol}
                  className="flex flex-col gap-4 px-5 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {directionIcon(
                      market.direction,
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {market.symbol}
                        </h3>

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          FX
                        </span>
                      </div>

                      <div
                        className={`mt-1 flex items-center gap-1 text-xs font-medium ${directionTextClass(
                          market.direction,
                        )}`}
                      >
                        {market.direction ===
                        "UP" ? (
                          <TrendingUp size={13} />
                        ) : market.direction ===
                          "DOWN" ? (
                          <TrendingDown size={13} />
                        ) : (
                          <BarChart3 size={13} />
                        )}

                        {directionLabel(
                          market.direction,
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
                    <div className="sm:text-right">
                      <div className="text-lg font-bold text-slate-900">
                        {formatPrice(
                          market.symbol,
                          market.price,
                        )}
                      </div>

                      <div
                        className={`mt-1 text-xs font-medium ${directionTextClass(
                          market.direction,
                        )}`}
                      >
                        {formatChange(
                          market.change_percent,
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openMarket(
                            market.symbol,
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                      >
                        Analyze

                        <ChevronRight size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removeFromWatchlist(
                            market.symbol,
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remove ${market.symbol} from watchlist`}
                        title="Remove from watchlist"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick actions */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">

          <button
            type="button"
            onClick={() => router.push("/markets")}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <BarChart3 size={19} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Market analysis
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Open detailed technical analysis
                </p>
              </div>

              <ChevronRight
                size={17}
                className="text-slate-300 transition group-hover:text-slate-600"
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() => router.push("/signals")}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/30"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp size={19} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Signal monitor
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Review current quantitative signals
                </p>
              </div>

              <ChevronRight
                size={17}
                className="text-slate-300 transition group-hover:text-slate-600"
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() => router.push("/alerts")}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-amber-200 hover:bg-amber-50/30"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Bell size={19} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Market alerts
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Configure alerts for watched markets
                </p>
              </div>

              <ChevronRight
                size={17}
                className="text-slate-300 transition group-hover:text-slate-600"
              />
            </div>
          </button>
        </div>

        {/* Research note */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Check size={17} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Watchlist status
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Your selected markets are stored locally
                in this browser. The prices shown above come
                from SignalPilot&apos;s live market-data
                endpoint. Watchlist data is for monitoring
                and research and does not execute trades.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add market modal */}
      {showAddMarket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowAddMarket(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Add market
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Choose a supported market
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAddMarket(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-5">
              <div className="relative mb-4">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value,
                    )
                  }
                  placeholder="Search markets..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                {filteredAvailableMarkets.length ===
                0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                    No additional supported markets
                    found.
                  </div>
                ) : (
                  filteredAvailableMarkets.map(
                    (symbol) => (
                      <button
                        key={symbol}
                        type="button"
                        onClick={() =>
                          addToWatchlist(
                            symbol,
                          )
                        }
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Star size={16} />
                          </div>

                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {symbol}
                            </div>

                            <div className="mt-0.5 text-[11px] text-slate-400">
                              Supported market
                            </div>
                          </div>
                        </div>

                        <Plus
                          size={17}
                          className="text-slate-400"
                        />
                      </button>
                    ),
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}