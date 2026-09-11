"use client";

import {
  Activity,
  BarChart3,
  Bell,
  Brain,
  ChevronLeft,
  LineChart,
  LogOut,
  Menu,
  Settings,
  Target,
  TrendingUp,
  X,
} from "lucide-react";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";


const NAVIGATION_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
  },
  {
    label: "Markets",
    href: "/markets",
    icon: TrendingUp,
  },
  {
    label: "Signals",
    href: "/signals",
    icon: Activity,
  },
  {
    label: "AI Analysis",
    href: "/ai-analysis",
    icon: Brain,
  },
  {
    label: "Strategy Lab",
    href: "/strategy-lab",
    icon: LineChart,
  },
  {
    label: "Performance",
    href: "/performance",
    icon: Target,
  },
  {
    label: "Watchlist",
    href: "/watchlist",
    icon: TrendingUp,
  },
  {
    label: "Alerts",
    href: "/alerts",
    icon: Bell,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];


export default function SignalPilotNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [signingOut, setSigningOut] =
    useState(false);


  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }


  function navigate(href: string) {
    setMobileOpen(false);
    router.push(href);
  }


  function handleBack() {
    router.back();
  }


  async function handleSignOut() {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    setMobileOpen(false);

    try {
      const supabase =
        createSupabaseBrowserClient();

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "Sign out failed:",
          error,
        );

        setSigningOut(false);
        return;
      }

      router.replace("/");
      router.refresh();

    } catch (error) {
      console.error(
        "Sign out failed:",
        error,
      );

      setSigningOut(false);
    }
  }


  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">

        <div className="flex h-20 items-center border-b border-slate-200 px-6">

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-3"
          >

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Brain className="h-5 w-5" />
            </div>

            <div className="text-left">

              <p className="text-sm font-bold text-slate-900">
                SignalPilot
              </p>

              <p className="text-[11px] text-slate-400">
                AI Market Intelligence
              </p>

            </div>

          </button>

        </div>


        <nav className="flex-1 overflow-y-auto px-4 py-5">

          <div className="space-y-1">

            {NAVIGATION_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => navigate(item.href)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >

                  <Icon
                    className={`h-4 w-4 ${
                      active
                        ? "text-blue-600"
                        : "text-slate-400"
                    }`}
                  />

                  <span>
                    {item.label}
                  </span>

                </button>
              );
            })}

          </div>

        </nav>


        {/* Desktop AI Intelligence Panel */}
        <div className="border-t border-slate-200 p-4">

          <div className="rounded-xl bg-slate-50 p-3">

            <div className="flex items-center gap-2">

              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Brain className="h-3.5 w-3.5" />
              </div>

              <p className="text-xs font-semibold text-slate-700">
                AI Intelligence
              </p>

            </div>

            <p className="mt-2 text-[11px] leading-4 text-slate-400">
              SignalPilot analyses real market
              conditions using quantitative indicators
              and AI-assisted interpretation.
            </p>

          </div>


          {/* Desktop Sign Out */}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />

            {signingOut
              ? "Signing out..."
              : "Sign out"}
          </button>

        </div>

      </aside>


      {/* Mobile Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">

        <div className="flex h-16 items-center justify-between px-4">

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>


          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
          >

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Brain className="h-4 w-4" />
            </div>

            <span className="text-sm font-bold text-slate-900">
              SignalPilot
            </span>

          </button>


          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

        </div>

      </header>


      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close navigation menu"
          />


          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl">

            <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Brain className="h-5 w-5" />
                </div>

                <div>

                  <p className="text-sm font-bold text-slate-900">
                    SignalPilot
                  </p>

                  <p className="text-[11px] text-slate-400">
                    AI Market Intelligence
                  </p>

                </div>

              </div>


              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>

            </div>


            <nav className="flex-1 overflow-y-auto px-4 py-5">

              <div className="space-y-1">

                {NAVIGATION_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => navigate(item.href)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                        active
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >

                      <Icon
                        className={`h-4 w-4 ${
                          active
                            ? "text-blue-600"
                            : "text-slate-400"
                        }`}
                      />

                      {item.label}

                    </button>
                  );
                })}

              </div>

            </nav>


            {/* Mobile AI Intelligence Panel */}
            <div className="border-t border-slate-200 p-4">

              <div className="rounded-xl bg-slate-50 p-3">

                <div className="flex items-center gap-2">

                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Brain className="h-3.5 w-3.5" />
                  </div>

                  <p className="text-xs font-semibold text-slate-700">
                    AI Intelligence
                  </p>

                </div>

                <p className="mt-2 text-[11px] leading-4 text-slate-400">
                  SignalPilot analyses real market
                  conditions using quantitative indicators
                  and AI-assisted interpretation.
                </p>

              </div>


              <button
                type="button"
                onClick={handleBack}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>


              {/* Mobile Sign Out */}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />

                {signingOut
                  ? "Signing out..."
                  : "Sign out"}
              </button>

            </div>

          </aside>

        </div>
      )}

    </>
  );
}
