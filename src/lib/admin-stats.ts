import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function getAdminStats() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc(
    "get_admin_stats",
  );

  if (error) {
    console.error(
      "[SignalPilot Admin Stats]",
      JSON.stringify(
        error,
        Object.getOwnPropertyNames(error),
      ),
    );

    return {
      totalUsers: 0,
      totalAdmins: 0,
      totalSignals: 0,
      bullishSignals: 0,
      bearishSignals: 0,
      neutralSignals: 0,
      evaluatedSignals: 0,
      averageConfidence: 0,
    };
  }

  return {
    totalUsers: Number(data?.totalUsers ?? 0),
    totalAdmins: Number(data?.totalAdmins ?? 0),
    totalSignals: Number(data?.totalSignals ?? 0),
    bullishSignals: Number(data?.bullishSignals ?? 0),
    bearishSignals: Number(data?.bearishSignals ?? 0),
    neutralSignals: Number(data?.neutralSignals ?? 0),
    evaluatedSignals: Number(
      data?.evaluatedSignals ?? 0,
    ),
    averageConfidence: Number(
      data?.averageConfidence ?? 0,
    ),
  };
}