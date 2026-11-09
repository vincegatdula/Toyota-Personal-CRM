import { getAuthContext } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import type {
  FinancingApplication,
  Lead,
  LostSale,
  Reservation,
  VehicleRelease,
} from "@/types/database";

export interface PagedFilters {
  q?: string;
  status?: string;
  bank?: string;
  reason?: string;
  recovery?: string;
  transaction?: string;
  from?: string;
  to?: string;
  overdue?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedRows<T> {
  rows: T[];
  count: number;
  page: number;
  pageSize: number;
}

type LeadName = { prospect_name: string; lead_code: string };

export interface WithLead {
  prospect_name: string;
  lead_code: string;
}

function paging(filters: PagedFilters) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize || 25));
  return { page, pageSize, from: (page - 1) * pageSize, to: page * pageSize - 1 };
}

function clean(value: string) {
  return value.replace(/[(),]/g, " ").trim();
}

async function leadMatchingIds(
  supabase: Awaited<ReturnType<typeof getAuthContext>>["supabase"],
  ownerId: string | null,
  q: string,
): Promise<string[]> {
  const term = `%${clean(q)}%`;
  let query = supabase
    .from("leads")
    .select("id")
    .or(
      `prospect_name.ilike.${term},lead_code.ilike.${term},contact_number.ilike.${term}`,
    );
  if (ownerId) query = query.eq("owner_id", ownerId);
  const { data } = await query.limit(200);
  return (data ?? []).map((row) => row.id);
}

async function nameMap(
  supabase: Awaited<ReturnType<typeof getAuthContext>>["supabase"],
  ownerId: string | null,
  leadIds: string[],
): Promise<Map<string, LeadName>> {
  const ids = [...new Set(leadIds.filter(Boolean))];
  if (!ids.length) return new Map();
  let query = supabase
    .from("leads")
    .select("id, prospect_name, lead_code")
    .in("id", ids);
  if (ownerId) query = query.eq("owner_id", ownerId);
  const { data } = await query;
  return new Map(
    (data ?? []).map((row) => [
      row.id,
      { prospect_name: row.prospect_name, lead_code: row.lead_code },
    ]),
  );
}

export type FinancingRow = FinancingApplication & WithLead;

export async function listFinancing(
  filters: PagedFilters,
): Promise<PagedRows<FinancingRow>> {
  const context = await getAuthContext();
  const { supabase, user } = context;
  const { page, pageSize, from, to } = paging(filters);
  if (!user) return { rows: [], count: 0, page, pageSize };

  let query = supabase
    .from("financing_applications")
    .select("*", { count: "exact" });
  if (!context.isAdmin) query = query.eq("owner_id", user.id);

  if (filters.q) {
    const term = `%${clean(filters.q)}%`;
    const ids = await leadMatchingIds(
      supabase,
      context.isAdmin ? null : user.id,
      filters.q,
    );
    const clause = `financing_code.ilike.${term},bank.ilike.${term},preferred_model.ilike.${term}`;
    query = ids.length ? query.or(`${clause},lead_id.in.(${ids.join(",")})`) : query.or(clause);
  }
  if (filters.status === "pending") {
    query = query.in("application_status", [
      "For assessment",
      "Application submitted",
      "Pending documents",
      "Pending unit",
    ]);
  } else if (filters.status) {
    query = query.eq("application_status", filters.status);
  }
  if (filters.bank) query = query.eq("bank", filters.bank);
  if (filters.from) query = query.gte("date_submitted", filters.from);
  if (filters.to) query = query.lte("date_submitted", filters.to);

  const { data, count, error } = await query
    .order("date_submitted", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw new Error(`Could not load financing: ${error.message}`);

  const names = await nameMap(
    supabase,
    context.isAdmin ? null : user.id,
    (data ?? []).map((row) => row.lead_id),
  );
  const rows = (data ?? []).map((row) => ({
    ...row,
    ...(names.get(row.lead_id) ?? { prospect_name: "Unknown prospect", lead_code: "—" }),
  }));
  return { rows, count: count ?? 0, page, pageSize };
}

export async function getFinancing(id: string) {
  const context = await getAuthContext();
  const { supabase, user } = context;
  if (!user) return null;
  let query = supabase
    .from("financing_applications")
    .select("*");
  if (!context.isAdmin) query = query.eq("owner_id", user.id);
  query = query.eq("id", id);
  const { data } = await query.maybeSingle();
  return data ?? null;
}

export type ReservationRow = Reservation & WithLead;

export async function listReservations(
  filters: PagedFilters,
): Promise<PagedRows<ReservationRow>> {
  const context = await getAuthContext();
  const { supabase, user } = context;
  const { page, pageSize, from, to } = paging(filters);
  if (!user) return { rows: [], count: 0, page, pageSize };

  let query = supabase
    .from("reservations")
    .select("*", { count: "exact" });
  if (!context.isAdmin) query = query.eq("owner_id", user.id);

  if (filters.q) {
    const term = `%${clean(filters.q)}%`;
    const ids = await leadMatchingIds(
      supabase,
      context.isAdmin ? null : user.id,
      filters.q,
    );
    const clause = `reservation_code.ilike.${term},reserved_model.ilike.${term},sales_channel.ilike.${term}`;
    query = ids.length ? query.or(`${clause},lead_id.in.(${ids.join(",")})`) : query.or(clause);
  }
  if (filters.status) query = query.eq("current_status", filters.status);
  if (filters.overdue === "1") {
    query = query
      .lt("expected_release_date", todayISO())
      .not("current_status", "in", "(Released,Cancelled)");
  }
  if (filters.from) query = query.gte("reservation_date", filters.from);
  if (filters.to) query = query.lte("reservation_date", filters.to);

  const { data, count, error } = await query
    .order("expected_release_date", { ascending: true, nullsFirst: false })
    .order("reservation_date", { ascending: false })
    .range(from, to);
  if (error) throw new Error(`Could not load reservations: ${error.message}`);

  const names = await nameMap(
    supabase,
    context.isAdmin ? null : user.id,
    (data ?? []).map((row) => row.lead_id),
  );
  const rows = (data ?? []).map((row) => ({
    ...row,
    ...(names.get(row.lead_id) ?? { prospect_name: "Unknown prospect", lead_code: "—" }),
  }));
  return { rows, count: count ?? 0, page, pageSize };
}

export async function getReservation(id: string) {
  const context = await getAuthContext();
  const { supabase, user } = context;
  if (!user) return null;
  let query = supabase
    .from("reservations")
    .select("*");
  if (!context.isAdmin) query = query.eq("owner_id", user.id);
  query = query.eq("id", id);
  const { data } = await query.maybeSingle();
  return data ?? null;
}

export async function getReservationPicker(): Promise<
  Pick<Reservation, "id" | "reservation_code" | "lead_id" | "reserved_model" | "current_status">[]
> {
  const context = await getAuthContext();
  const { supabase, user } = context;
  if (!user) return [];
  let query = supabase
    .from("reservations")
    .select("id, reservation_code, lead_id, reserved_model, current_status")
    .order("reservation_date", { ascending: false });
  if (!context.isAdmin) query = query.eq("owner_id", user.id);
  const { data } = await query;
  return data ?? [];
}

export type ReleaseRow = VehicleRelease & WithLead;

export async function listReleases(
  filters: PagedFilters,
): Promise<PagedRows<ReleaseRow>> {
  const context = await getAuthContext();
  const { supabase, user } = context;
  const { page, pageSize, from, to } = paging(filters);
  if (!user) return { rows: [], count: 0, page, pageSize };

  let query = supabase
    .from("vehicle_releases")
    .select("*", { count: "exact" });
  if (!context.isAdmin) query = query.eq("owner_id", user.id);

  if (filters.q) {
    const term = `%${clean(filters.q)}%`;
    const ids = await leadMatchingIds(
      supabase,
      context.isAdmin ? null : user.id,
      filters.q,
    );
    const clause = `release_code.ilike.${term},model_released.ilike.${term},bank.ilike.${term}`;
    query = ids.length ? query.or(`${clause},lead_id.in.(${ids.join(",")})`) : query.or(clause);
  }
  if (filters.transaction) query = query.eq("transaction", filters.transaction);
  if (filters.bank) query = query.eq("bank", filters.bank);
  if (filters.from) query = query.gte("release_date", filters.from);
  if (filters.to) query = query.lte("release_date", filters.to);

  const { data, count, error } = await query
    .order("release_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw new Error(`Could not load releases: ${error.message}`);

  const names = await nameMap(
    supabase,
    context.isAdmin ? null : user.id,
    (data ?? []).map((row) => row.lead_id),
  );
  const rows = (data ?? []).map((row) => ({
    ...row,
    ...(names.get(row.lead_id) ?? { prospect_name: "Unknown prospect", lead_code: "—" }),
  }));
  return { rows, count: count ?? 0, page, pageSize };
}

export async function getRelease(id: string) {
  const context = await getAuthContext();
  const { supabase, user } = context;
  if (!user) return null;
  let query = supabase
    .from("vehicle_releases")
    .select("*");
  if (!context.isAdmin) query = query.eq("owner_id", user.id);
  query = query.eq("id", id);
  const { data } = await query.maybeSingle();
  return data ?? null;
}

export type LostRow = LostSale & WithLead;

export async function listLostSales(
  filters: PagedFilters,
): Promise<PagedRows<LostRow>> {
  const context = await getAuthContext();
  const { supabase, user } = context;
  const { page, pageSize, from, to } = paging(filters);
  if (!user) return { rows: [], count: 0, page, pageSize };

  let query = supabase
    .from("lost_sales")
    .select("*", { count: "exact" });
  if (!context.isAdmin) query = query.eq("owner_id", user.id);

  if (filters.q) {
    const term = `%${clean(filters.q)}%`;
    const ids = await leadMatchingIds(
      supabase,
      context.isAdmin ? null : user.id,
      filters.q,
    );
    const clause = `lost_code.ilike.${term},primary_loss_reason.ilike.${term},competitor_alternative.ilike.${term}`;
    query = ids.length ? query.or(`${clause},lead_id.in.(${ids.join(",")})`) : query.or(clause);
  }
  if (filters.reason) query = query.eq("primary_loss_reason", filters.reason);
  if (filters.recovery) {
    query = query.eq(
      "recovery_status",
      filters.recovery as "open" | "recovered" | "closed",
    );
  }
  if (filters.from) query = query.gte("date_marked_lost", filters.from);
  if (filters.to) query = query.lte("date_marked_lost", filters.to);

  const { data, count, error } = await query
    .order("date_marked_lost", { ascending: false })
    .range(from, to);
  if (error) throw new Error(`Could not load lost sales: ${error.message}`);

  const names = await nameMap(
    supabase,
    context.isAdmin ? null : user.id,
    (data ?? []).map((row) => row.lead_id),
  );
  const rows = (data ?? []).map((row) => ({
    ...row,
    ...(names.get(row.lead_id) ?? { prospect_name: "Unknown prospect", lead_code: "—" }),
  }));
  return { rows, count: count ?? 0, page, pageSize };
}

export async function getLostSale(id: string) {
  const context = await getAuthContext();
  const { supabase, user } = context;
  if (!user) return null;
  let query = supabase
    .from("lost_sales")
    .select("*");
  if (!context.isAdmin) query = query.eq("owner_id", user.id);
  query = query.eq("id", id);
  const { data } = await query.maybeSingle();
  return data ?? null;
}

export type LeadPicker = Pick<
  Lead,
  "id" | "lead_code" | "prospect_name" | "preferred_model" | "lead_source"
>;
