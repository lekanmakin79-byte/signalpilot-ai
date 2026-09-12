import { createSupabaseServerClient } from "@/lib/supabase-server";

export type AdminUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "user" | "admin";
  created_at: string;
  updated_at: string;
};

export async function getAdminUsers(): Promise<AdminUser[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc(
    "get_admin_users",
  );

  if (error) {
    console.error(
      "[SignalPilot Admin Users]",
      JSON.stringify(
        error,
        Object.getOwnPropertyNames(error),
      ),
    );

    return [];
  }

  return (data ?? []) as AdminUser[];
}