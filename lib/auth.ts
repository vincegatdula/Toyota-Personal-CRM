import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CrmRole, Profile } from "@/types/database";

export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

export async function requireUser() {
  const { supabase, user } = await getSession();
  if (!user) redirect("/login");
  return { supabase, user };
}

export interface AuthContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: Awaited<ReturnType<typeof getSession>>["user"];
  profile: Profile | null;
  isAdmin: boolean;
}

export async function getAuthContext() {
  const { supabase, user } = await getSession();
  const profile = user ? await getProfile() : null;
  return { supabase, user, profile, isAdmin: isCrmAdmin(profile?.role) };
}

export async function requireAuthContext() {
  const context = await getAuthContext();
  if (!context.user) redirect("/login");
  return { ...context, user: context.user };
}

export async function requireCrmAdminContext() {
  const context = await getAuthContext();
  if (!context.user) redirect("/login");
  if (!context.isAdmin) {
    throw new Error("Only CRM administrators can perform this action.");
  }
  return { ...context, user: context.user };
}

export function isCrmAdmin(role: CrmRole | null | undefined) {
  return role === "owner" || role === "admin";
}

export async function requireCrmAdmin() {
  const { supabase, user } = await getSession();
  if (!user) throw new Error("You must be signed in.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isCrmAdmin(profile?.role)) {
    throw new Error("Only CRM owners or admins can manage vehicle models.");
  }
  return { supabase, user };
}

export const getProfile = cache(async (): Promise<Profile | null> => {
  const { supabase, user } = await getSession();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return data ?? null;
});
