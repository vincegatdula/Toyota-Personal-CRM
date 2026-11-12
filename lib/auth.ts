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

export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const { supabase, user } = await getSession();
  const profile = user ? await getProfile() : null;
  return { supabase, user, profile, isAdmin: isCrmAdmin(profile?.role) };
});

export async function requireUser() {
  const context = await getAuthContext();
  if (!context.user) redirect("/login");
  return context as AuthContext & { user: NonNullable<AuthContext["user"]> };
}

export interface AuthContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: Awaited<ReturnType<typeof getSession>>["user"];
  profile: Profile | null;
  isAdmin: boolean;
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
  const context = await getAuthContext();
  if (!context.user) throw new Error("You must be signed in.");
  if (!context.isAdmin) {
    throw new Error("Only CRM owners or admins can manage vehicle models.");
  }
  return { supabase: context.supabase, user: context.user };
}
