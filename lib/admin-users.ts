import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export type ManagedCrmRole = "admin" | "user";

export const MANAGED_ROLES: ManagedCrmRole[] = ["admin", "user"];

export function normalizeManagedRole(role: string | null | undefined): ManagedCrmRole {
  return role === "admin" || role === "owner" ? "admin" : "user";
}

export function isLastAdminProfile(profile: Pick<Profile, "id" | "role">, admins: Pick<Profile, "id" | "role">[]) {
  const adminCount = admins.filter((row) => row.role === "owner" || row.role === "admin").length;
  return adminCount <= 1 && (profile.role === "owner" || profile.role === "admin");
}

export async function listProfilesForAdmin(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

export async function adminSetUserRole(userId: string, role: ManagedCrmRole) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { crm_role: role },
  });
  if (error) throw new Error(error.message);
}
