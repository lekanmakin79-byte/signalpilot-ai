"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  Database,
  RefreshCw,
  Server,
  TrendingUp,
  Wifi,
  XCircle,
} from "lucide-react";

type ServiceStatus =
  | "healthy"
  | "degraded"
  | "down"
  | "unconfigured";

type HealthCheck = {
  status: ServiceStatus;
  message: string;
  database?: string;
  model?: string;
};

type SystemHealthResponse = {
  status: ServiceStatus;
  timestamp: string;
  checks: {
    backend: HealthCheck;
    market_data: HealthCheck;
    groq: HealthCheck;
    database: HealthCheck;
    signal_engine: HealthCheck;
  };
};

const API_URL =
  process.env.NEXT_PUBLIC_SIGNALPILOT_API_URL ||
  "http://127.0.0.1:8000";

function getStatusLabel(status: ServiceStatus) {
  switch (status) {
    case "healthy":
      return "Healthy";

    case "degraded":
      return "Degraded";

    case "down":
      return "Down";

    case "unconfigured":
      return "Unconfigured";

    default:
      return "Unknown";
  }
}

function getStatusClasses(status: ServiceStatus) {
  switch (status) {
    case "healthy":
      return {
        badge: "bg-emerald-50 text-emerald-700",
        icon: "text-emerald-600",
      };

    case "degraded":
      return {
        badge: "bg-amber-50 text-amber-700",
        icon: "text-amber-600",
      };

    case "down":
      return {
        badge: "bg-red-50 text-red-700",
        icon: "text-red-600",
      };

    case "unconfigured":
      return {
        badge: "bg-slate-100 text-slate-600",
        icon: "text-slate-500",
      };

    default:
      return {
        badge: "bg-slate-100 text-slate-600",
        icon: "text-slate-500",
      };
  }
}

function StatusIcon({
  status,
}: {
  status: ServiceStatus;
}) {
  const classes = `h-5 w-5 ${
    getStatusClasses(status).icon
  }`;

  if (status === "healthy") {
    return <CheckCircle2 className={classes} />;
  }

  if (status === "down") {
    return <XCircle className={classes} />;
  }

  return <Activity className={classes} />;
}

function formatCheckedTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export default function AdminSystemMonitoring() {
  const [health, setHealth] =
    useState<SystemHealthResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [refreshing, setRefreshing] =
    useState(false);

  const loadHealth = useCallback(
    async (manual = false) => {
      if (manual) {
        setRefreshing(true);
      }

      try {
        setError(null);

        const response = await fetch(
          `${API_URL}/system/health`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            `Health endpoint returned HTTP ${response.status}.`,
          );
        }

        const data =
          (await response.json()) as SystemHealthResponse;

        setHealth(data);
      } catch (requestError) {
        console.error(
          "[SignalPilot System Monitoring]",
          requestError,
        );

        setError(
          "Unable to reach the SignalPilot monitoring endpoint.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadHealth();

    const interval = window.setInterval(() => {
      void loadHealth();
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadHealth]);

  const services = health
    ? [
        {
          key: "backend",
          label: "Backend API",
          icon: Server,
          check: health.checks.backend,
        },
        {
          key: "market_data",
          label: "Market Data",
          icon: Wifi,
          check: health.checks.market_data,
        },
        {
          key: "groq",
          label: "Groq AI",
          icon: BrainCircuit,
          check: health.checks.groq,
        },
        {
          key: "database",
          label: "Database",
          icon: Database,
          check: health.checks.database,
        },
        {
          key: "signal_engine",
          label: "Signal Engine",
          icon: TrendingUp,
          check: health.checks.signal_engine,
        },
      ]
    : [];

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            System Monitoring
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Live health status of SignalPilot AI services.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadHealth(true)}
          disabled={loading || refreshing}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="px-5 py-10 text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600" />

            <p className="mt-3 text-sm font-medium text-slate-700">
              Checking system health...
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Connecting to the SignalPilot monitoring service.
            </p>
          </div>
        ) : error ? (
          <div className="px-5 py-10 text-center">
            <XCircle className="mx-auto h-10 w-10 text-red-500" />

            <p className="mt-3 text-sm font-semibold text-slate-900">
              Monitoring unavailable
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadHealth(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Activity className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    Service Health
                  </h3>

                  <p className="text-sm text-slate-500">
                    Overall status:{" "}
                    <span className="font-semibold">
                      {getStatusLabel(
                        health?.status ?? "down",
                      )}
                    </span>
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Last checked:{" "}
                {health
                  ? formatCheckedTime(
                      health.timestamp,
                    )
                  : "Unknown"}
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {services.map((service) => {
                const Icon = service.icon;
                const classes =
                  getStatusClasses(
                    service.check.status,
                  );

                return (
                  <div
                    key={service.key}
                    className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                        <Icon className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="font-semibold text-slate-900">
                          {service.label}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {service.check.message}
                        </p>

                        {service.check.database && (
                          <p className="mt-1 text-xs text-slate-400">
                            Database:{" "}
                            {service.check.database}
                          </p>
                        )}

                        {service.check.model && (
                          <p className="mt-1 text-xs text-slate-400">
                            Model:{" "}
                            {service.check.model}
                          </p>
                        )}
                      </div>
                    </div>

                    <div
                      className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${classes.badge}`}
                    >
                      <StatusIcon
                        status={
                          service.check.status
                        }
                      />

                      {getStatusLabel(
                        service.check.status,
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}