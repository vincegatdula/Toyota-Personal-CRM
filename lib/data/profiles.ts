import { getAuthContext } from "@/lib/auth";

export interface ProfileSummary {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

export async function getProfileMap(): Promise<Map<string, ProfileSummary>> {
  const context = await getAuthContext();
  if (!context.user || !context.isAdmin) return new Map();
  const { data } = await context.supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .order("full_name", { ascending: true, nullsFirst: false });
  return new Map((data ?? []).map((row) => [row.id, row as ProfileSummary]));
}

export async function listAssignableProfiles(): Promise<ProfileSummary[]> {
  const context = await getAuthContext();
  if (!context.user || !context.isAdmin) return [];
  const { data, error } = await context.supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .order("full_name", { ascending: true, nullsFirst: false });
  if (error) return [];
  return (data ?? []) as ProfileSummary[];
}

export function profileLabel(profile: ProfileSummary | undefined, fallbackId?: string | null) {
  if (!profile) return fallbackId ? fallbackId.slice(0, 8) : "Unknown";
  return profile.full_name || profile.email || profile.id.slice(0, 8);
}
