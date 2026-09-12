import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Mail,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserCircle,
  Users,
} from "lucide-react";

import AdminSystemMonitoring from "@/components/AdminSystemMonitoring";
import { getCurrentAdmin } from "@/lib/admin";
import { getAdminStats } from "@/lib/admin-stats";
import { getAdminUsers } from "@/lib/admin-users";
import AdminPerformanceOverview from "@/components/AdminPerformanceOverview";
import AdminRecentSignals from "@/components/AdminRecentSignals";
import AdminSignalManagement from "@/components/AdminSignalManagement";
import ReturnToTop from "@/components/ReturnToTop";


function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function AdminPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const [stats, users] = await Promise.all([
    getAdminStats(),
    getAdminUsers(),
  ]);

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      description: `${stats.totalAdmins} admin account${
        stats.totalAdmins === 1 ? "" : "s"
      }`,
    },
    {
      label: "Total Signals",
      value: stats.totalSignals,
      icon: Activity,
      description: `${stats.totalSignals} recorded signals`,
    },
    {
      label: "Bullish Signals",
      value: stats.bullishSignals,
      icon: TrendingUp,
      description: "Positive direction",
    },
    {
      label: "Bearish Signals",
      value: stats.bearishSignals,
      icon: TrendingDown,
      description: "Negative direction",
    },
    {
      label: "Neutral Signals",
      value: stats.neutralSignals,
      icon: BarChart3,
      description: "Neutral direction",
    },
    {
      label: "Average Confidence",
      value: `${stats.averageConfidence.toFixed(1)}%`,
      icon: ShieldCheck,
      description: "Across recorded signals",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-blue-600">
                  SignalPilot AI
                </p>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Admin Dashboard
                </h1>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              Administrative controls and system monitoring.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </div>

        <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />

            <div>
              <h2 className="font-semibold text-emerald-900">
                Admin access verified
              </h2>

              <p className="mt-1 text-sm text-emerald-700">
                Signed in as {admin.user.email}
              </p>

              <p className="mt-1 text-xs text-emerald-600">
                Role: {admin.profile.role}
              </p>
            </div>
          </div>
        </div>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              System Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current SignalPilot AI platform statistics.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {statCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <p className="text-sm font-medium text-slate-500">
                    {card.label}
                  </p>

                  <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                    {card.value}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              User Management
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              View registered SignalPilot AI accounts and their roles.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Users className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    Registered Users
                  </h3>

                  <p className="text-sm text-slate-500">
                    {users.length} account{users.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>

            {users.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <UserCircle className="mx-auto h-10 w-10 text-slate-300" />

                <p className="mt-3 text-sm font-medium text-slate-700">
                  No users found
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  The admin user list could not be loaded.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          User
                        </th>

                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Email
                        </th>

                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Role
                        </th>

                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Created
                        </th>

                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Updated
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                <UserCircle className="h-5 w-5" />
                              </div>

                              <div>
                                <p className="font-medium text-slate-900">
                                  {user.full_name || "Unnamed user"}
                                </p>

                                <p className="text-xs text-slate-400">
                                  {user.id}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Mail className="h-4 w-4 text-slate-400" />
                              {user.email || "No email"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                user.role === "admin"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              {user.role}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <CalendarDays className="h-4 w-4 text-slate-400" />
                              {formatDate(user.created_at)}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <CalendarDays className="h-4 w-4 text-slate-400" />
                              {formatDate(user.updated_at)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                            <UserCircle className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900">
                              {user.full_name || "Unnamed user"}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                              {user.email || "No email"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.role === "admin"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {user.role}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-slate-400">
                            Created
                          </p>

                          <p className="mt-1 font-medium text-slate-700">
                            {formatDate(user.created_at)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-slate-400">
                            Updated
                          </p>

                          <p className="mt-1 font-medium text-slate-700">
                            {formatDate(user.updated_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <AdminSystemMonitoring />
		<AdminPerformanceOverview />
		<AdminRecentSignals />
		<AdminSignalManagement />
		<ReturnToTop />
      </div>
    </main>
  );
}