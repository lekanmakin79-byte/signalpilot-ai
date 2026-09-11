"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  BarChart3,
  Check,
  RotateCcw,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Sun,
  Moon,
  Target,
  Shield,
  Activity,
} from "lucide-react";

const SETTINGS_KEY = "signalpilot_settings";

type SignalPilotSettings = {
  defaultMarket: string;
  defaultTimeframe: string;
  candleCount: number;
  minimumConfidence: number;
  appearance: "light" | "dark";
  showRiskInformation: boolean;
  showTechnicalIndicators: boolean;
  enableAlertMonitoring: boolean;
};

const DEFAULT_SETTINGS: SignalPilotSettings = {
  defaultMarket: "EUR/USD",
  defaultTimeframe: "5m",
  candleCount: 100,
  minimumConfidence: 0,
  appearance: "light",
  showRiskInformation: true,
  showTechnicalIndicators: true,
  enableAlertMonitoring: true,
};

export default function SettingsPage() {
  const router = useRouter();

  const [settings, setSettings] =
    useState<SignalPilotSettings>(DEFAULT_SETTINGS);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);

      if (stored) {
        const parsed = JSON.parse(stored);

        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
        });
      }
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  function updateSetting<K extends keyof SignalPilotSettings>(
    key: K,
    value: SignalPilotSettings[K],
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));

    setSaved(false);
  }

  function saveSettings() {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings),
      );

      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch {
      setSaved(false);
    }
  }

  function resetSettings() {
    const confirmed = window.confirm(
      "Reset all SignalPilot settings to their default values?",
    );

    if (!confirmed) {
      return;
    }

    setSettings(DEFAULT_SETTINGS);

    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(DEFAULT_SETTINGS),
      );

      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch {
      setSaved(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                <SettingsIcon size={21} />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Settings
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Manage your SignalPilot preferences and monitoring options.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={saveSettings}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {saved ? (
              <>
                <Check size={17} />
                Saved
              </>
            ) : (
              <>
                <Check size={17} />
                Save settings
              </>
            )}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main settings */}
          <section className="space-y-6 lg:col-span-2">
            {/* Market defaults */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <SlidersHorizontal size={19} />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Analysis defaults
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Choose the default parameters used when viewing market
                    analysis.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="default-market"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Default market
                  </label>

                  <select
                    id="default-market"
                    value={settings.defaultMarket}
                    onChange={(event) =>
                      updateSetting(
                        "defaultMarket",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    <option value="EUR/USD">EUR/USD</option>
                    <option value="GBP/USD">GBP/USD</option>
                    <option value="USD/JPY">USD/JPY</option>
                    <option value="XAU/USD">XAU/USD</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="default-timeframe"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Default timeframe
                  </label>

                  <select
                    id="default-timeframe"
                    value={settings.defaultTimeframe}
                    onChange={(event) =>
                      updateSetting(
                        "defaultTimeframe",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    <option value="1m">1 minute</option>
                    <option value="5m">5 minutes</option>
                    <option value="15m">15 minutes</option>
                    <option value="30m">30 minutes</option>
                    <option value="1h">1 hour</option>
                    <option value="4h">4 hours</option>
                    <option value="1day">1 day</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="candle-count"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Analysis candle count
                  </label>

                  <select
                    id="candle-count"
                    value={settings.candleCount}
                    onChange={(event) =>
                      updateSetting(
                        "candleCount",
                        Number(event.target.value),
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    <option value={50}>50 candles</option>
                    <option value={100}>100 candles</option>
                    <option value={200}>200 candles</option>
                    <option value={500}>500 candles</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="minimum-confidence"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Minimum signal confidence
                  </label>

                  <select
                    id="minimum-confidence"
                    value={settings.minimumConfidence}
                    onChange={(event) =>
                      updateSetting(
                        "minimumConfidence",
                        Number(event.target.value),
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    <option value={0}>No minimum</option>
                    <option value={60}>60%+</option>
                    <option value={70}>70%+</option>
                    <option value={80}>80%+</option>
                    <option value={90}>90%+</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  {settings.appearance === "light" ? (
                    <Sun size={19} />
                  ) : (
                    <Moon size={19} />
                  )}
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Appearance
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Choose how SignalPilot should display this preference.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    updateSetting("appearance", "light")
                  }
                  className={`rounded-xl border p-4 text-left transition ${
                    settings.appearance === "light"
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Sun size={19} />

                    <div>
                      <p className="text-sm font-semibold">
                        Light mode
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Clean light interface
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateSetting("appearance", "dark")
                  }
                  className={`rounded-xl border p-4 text-left transition ${
                    settings.appearance === "dark"
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Moon size={19} />

                    <div>
                      <p className="text-sm font-semibold">
                        Dark mode preference
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Saved for future interface support
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Monitoring preferences */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Bell size={19} />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Monitoring preferences
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Control the information shown by SignalPilot monitoring
                    features.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <PreferenceToggle
                  icon={<Bell size={18} />}
                  title="Alert monitoring"
                  description="Allow the Alerts page to monitor your saved conditions."
                  enabled={settings.enableAlertMonitoring}
                  onChange={(value) =>
                    updateSetting(
                      "enableAlertMonitoring",
                      value,
                    )
                  }
                />

                <PreferenceToggle
                  icon={<Shield size={18} />}
                  title="Show risk information"
                  description="Display risk levels and analytical risk factors."
                  enabled={settings.showRiskInformation}
                  onChange={(value) =>
                    updateSetting(
                      "showRiskInformation",
                      value,
                    )
                  }
                />

                <PreferenceToggle
                  icon={<Activity size={18} />}
                  title="Show technical indicators"
                  description="Display EMA, RSI, MACD, ATR and related analytical information."
                  enabled={settings.showTechnicalIndicators}
                  onChange={(value) =>
                    updateSetting(
                      "showTechnicalIndicators",
                      value,
                    )
                  }
                />
              </div>
            </div>
          </section>

          {/* Right column */}
          <aside className="space-y-6">
            {/* Current settings */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <Target size={19} />

                <h2 className="font-semibold text-slate-900">
                  Current configuration
                </h2>
              </div>

              <div className="space-y-4 text-sm">
                <SettingSummary
                  label="Market"
                  value={settings.defaultMarket}
                />

                <SettingSummary
                  label="Timeframe"
                  value={settings.defaultTimeframe}
                />

                <SettingSummary
                  label="Candles"
                  value={String(settings.candleCount)}
                />

                <SettingSummary
                  label="Min confidence"
                  value={
                    settings.minimumConfidence === 0
                      ? "No minimum"
                      : `${settings.minimumConfidence}%+`
                  }
                />

                <SettingSummary
                  label="Appearance"
                  value={
                    settings.appearance === "light"
                      ? "Light"
                      : "Dark preference"
                  }
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-semibold text-slate-900">
                SignalPilot
              </h2>

              <div className="space-y-2">
                <QuickLink
                  label="Dashboard"
                  icon={<BarChart3 size={17} />}
                  onClick={() => router.push("/dashboard")}
                />

                <QuickLink
                  label="Markets"
                  icon={<Activity size={17} />}
                  onClick={() => router.push("/markets")}
                />

                <QuickLink
                  label="Watchlist"
                  icon={<Target size={17} />}
                  onClick={() => router.push("/watchlist")}
                />

                <QuickLink
                  label="Alerts"
                  icon={<Bell size={17} />}
                  onClick={() => router.push("/alerts")}
                />

                <QuickLink
                  label="Signal History"
                  icon={<BarChart3 size={17} />}
                  onClick={() => router.push("/signals/history")}
                />
              </div>
            </div>

            {/* Reset */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <RotateCcw
                  size={19}
                  className="mt-0.5 text-slate-500"
                />

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Reset preferences
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Restore the original SignalPilot browser preferences.
                  </p>

                  <button
                    type="button"
                    onClick={resetSettings}
                    className="mt-4 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Reset settings
                  </button>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5">
              <p className="text-xs leading-5 text-slate-600">
                SignalPilot provides market analysis and research tools.
                Settings do not place trades, execute orders, or guarantee
                market outcomes.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function PreferenceToggle({
  icon,
  title,
  description,
  enabled,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-slate-500">
          {icon}
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange(!enabled)}
        aria-pressed={enabled}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          enabled
            ? "bg-slate-900"
            : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            enabled
              ? "left-6"
              : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function SettingSummary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}

function QuickLink({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
    >
      {icon}
      {label}
    </button>
  );
}