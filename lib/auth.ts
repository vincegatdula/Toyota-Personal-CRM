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
