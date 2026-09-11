import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ShieldCheck,
  Users,
} from "lucide-react";

import { getCurrentAdmin } from "@/lib/admin";

export default async function AdminPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
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
              Administrative controls and system management.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
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

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>

            <h2 className="font-semibold text-slate-900">
              User Management
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Manage SignalPilot AI users, roles and account status.
            </p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Coming next
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Activity className="h-5 w-5" />
            </div>

            <h2 className="font-semibold text-slate-900">
              System Monitoring
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Monitor signals, performance, market data and system health.
            </p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Coming next
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}