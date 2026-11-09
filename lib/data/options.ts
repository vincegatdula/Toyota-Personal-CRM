import { cache } from "react";
import { getAuthContext, getSession } from "@/lib/auth";
import { currentPeriod } from "@/lib/dates";
import type {
  DropdownOption,
  MonthlyTarget,
  VehicleModel,
} from "@/types/database";

export type OptionMap = Record<string, DropdownOption[]>;

export const getOptions = cache(async (): Promise<OptionMap> => {
  const { supabase } = await getSession();
  const { data, error } = await supabase
    .from("dropdown_options")
    .select("*")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Could not load dropdown options: ${error.message}`);
  const map: OptionMap = {};
  for (const row of data ?? []) {
    if (!map[row.category]) map[row.category] = [];
    map[row.category].push(row);
  }
  return map;
});

export const getAllOptions = cache(async (): Promise<OptionMap> => {
  const { supabase } = await getSession();
  const { data, error } = await supabase
    .from("dropdown_options")
    .select("*")
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Could not load dropdown options: ${error.message}`);
  const map: OptionMap = {};
  for (const row of data ?? []) {
    if (!map[row.category]) map[row.category] = [];
    map[row.category].push(row);
  }
  return map;
});

export function optionLabels(map: OptionMap, category: string): string[] {
  return (map[category] ?? []).map((row) => row.label);
}

export const getVehicleModels = cache(async (): Promise<VehicleModel[]> => {
  const { supabase } = await getSession();
  const { data, error } = await supabase
    .from("vehicle_models")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(`Could not load vehicle models: ${error.message}`);
  return data ?? [];
});

export async function getTargetsFor(
  year: number,
  month: number,
): Promise<{ sales: number; financing: number; tfs: number; source: string }> {
  const context = await getAuthContext();
  const { supabase, user } = context;
  if (!user) return { sales: 0, financing: 0, tfs: 0, source: "none" };

  let query = supabase
    .from("monthly_targets")
    .select("*")
    .eq("year", year)
    .eq("month", month);
  if (!context.isAdmin) query = query.or(`owner_id.eq.${user.id},owner_id.is.null`);

  const { data } = await query;
  const rows = data ?? [];
  const own = user && !context.isAdmin ? rows.find((row) => row.owner_id === user.id) : undefined;
  const global = rows.find((row) => row.owner_id === null);
  const chosen = own ?? global;
  if (!chosen) return { sales: 0, financing: 0, tfs: 0, source: "none" };
  return {
    sales: chosen.sales_target,
    financing: chosen.financing_target,
    tfs: chosen.tfs_target,
    source: own ? "user" : "workbook",
  };
}

export async function getTargetYears(): Promise<number[]> {
  const { supabase } = await getSession();
  const { data } = await supabase
    .from("monthly_targets")
    .select("year")
    .order("year", { ascending: false });
  const years = new Set<number>((data ?? []).map((row: { year: number }) => row.year));
  years.add(currentPeriod().year);
  return [...years].sort((a, b) => b - a);
}

export const getAllVehicleModels = cache(async (): Promise<VehicleModel[]> => {
  const { supabase } = await getSession();
  const { data, error } = await supabase
    .from("vehicle_models")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(`Could not load vehicle models: ${error.message}`);
  return data ?? [];
});

export async function getMonthlyTargets(): Promise<MonthlyTarget[]> {
  const context = await getAuthContext();
  const { supabase, user } = context;
  if (!user) return [];
  let query = supabase
    .from("monthly_targets")
    .select("*");
  if (!context.isAdmin) query = query.or(`owner_id.eq.${user.id},owner_id.is.null`);
  query = query
    .order("year", { ascending: false })
    .order("month", { ascending: false });
  const { data, error } = await query;
  if (error) throw new Error(`Could not load targets: ${error.message}`);
  return data ?? [];
}
