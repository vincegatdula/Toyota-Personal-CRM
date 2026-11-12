import { getAuthContext } from "@/lib/auth";
import { todayISO, toISODate } from "@/lib/dates";
import type {
  FinancingApplication,
  Lead,
  LeadActivity,
  LostSale,
  Reservation,
  VehicleRelease,
} from "@/types/database";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface LeadFilters {
  q?: string;
  source?: string;
  model?: string;
  transaction?: string;
  status?: string;
  timeline?: string;
  followUp?: string;
  from?: string;
  to?: string;
  createdFrom?: string;
  createdTo?: string;
  archived?: string;
  owner?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface LeadListResult {
  rows: Lead[];
  count: number;
  page: number;
  pageSize: number;
}

function cleanSearch(value: string) {
  return value.replace(/[(),]/g, " ").trim();
}

function timelineRange(timeline: string | undefined) {
  const today = todayISO();
  const now = new Date(`${today}T00:00:00`);
  const add = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return toISODate(d);
  };
  switch (timeline) {
    case "overdue":
      return { before: today, after: null };
    case "this_month": {
      const start = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
      const end = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      return { before: end, after: start };
    }
    case "next_30":
      return { before: add(30), after: today };
    case "next_90":
      return { before: add(90), after: today };
    default:
      return null;
  }
}

export async function listLeads(filters: LeadFilters): Promise<LeadListResult> {
  const context = await getAuthContext();
  const { supabase, user } = context;
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize || 25));
  if (!user) return { rows: [], count: 0, page, pageSize };

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" });
  if (!context.isAdmin) query = query.eq("owner_id", user.id);
  else if (filters.owner) query = query.eq("owner_id", filters.owner);

  query = filters.archived === "1"
    ? query.eq("is_archived", true)
    : query.eq("is_archived", false);

  const q = filters.q ? cleanSearch(filters.q) : "";
  if (q) {
    const term = `%${q}%`;
    query = query.or(
      `prospect_name.ilike.${term},contact_number.ilike.${term},lead_code.ilike.${term},email.ilike.${term},preferred_model.ilike.${term}`,
    );
  }
  if (filters.source) query = query.eq("lead_source", filters.source);
  if (filters.model) query = query.eq("preferred_model", filters.model);
  if (filters.transaction) query = query.eq("transaction", filters.transaction);
  if (filters.status) query = query.eq("pipeline_status", filters.status);
  const dateFrom = filters.from ?? filters.createdFrom;
  const dateTo = filters.to ?? filters.createdTo;
  if (dateFrom) query = query.gte("date_created", dateFrom);
  if (dateTo) query = query.lte("date_created", dateTo);

  if (filters.timeline === "no_date") {
    query = query.is("purchase_timeline", null);
  } else {
    const range = timelineRange(filters.timeline);
    if (range) {
      if (range.after) query = query.gte("purchase_timeline", range.after);
      if (range.before) query = query.lt("purchase_timeline", range.before);
    }
  }

  if (filters.followUp) {
    const today = todayISO();
    query = query
      .not("next_action_due_date", "is", null)
      .is("next_action_completed_at", null);
    if (filters.followUp === "overdue") {
      query = query.lt("next_action_due_date", today);
    } else if (filters.followUp === "today") {
      query = query.eq("next_action_due_date", today);
    } else if (filters.followUp === "upcoming") {
      const inSeven = new Date(`${today}T00:00:00`);
      inSeven.setDate(inSeven.getDate() + 7);
      query = query
        .gt("next_action_due_date", today)
        .lte("next_action_due_date", toISODate(inSeven));
    }
  }

  if (filters.sort === "oldest") {
    query = query.order("date_created", { ascending: true });
  } else if (filters.sort === "next_action") {
    query = query
      .order("next_action_due_date", { ascending: true, nullsFirst: false })
      .order("date_created", { ascending: false });
  } else if (filters.sort === "name") {
    query = query.order("prospect_name", { ascending: true });
  } else {
    query = query.order("date_created", { ascending: false });
  }
  query = query.order("created_at", { ascending: false });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);
  if (error) throw new Error(`Could not load prospects: ${error.message}`);

  return { rows: data ?? [], count: count ?? 0, page, pageSize };
}

export interface LeadDetail {
  lead: Lead;
  activities: LeadActivity[];
  financing: FinancingApplication[];
  reservations: Reservation[];
  releases: VehicleRelease[];
  lostSales: LostSale[];
}

export async function getLeadDetail(
  idOrCode: string,
): Promise<LeadDetail | null> {
  const context = await getAuthContext();
  const { supabase, user } = context;
  if (!user) return null;

  let query = supabase.from("leads").select("*");
  if (!context.isAdmin) query = query.eq("owner_id", user.id);
  query = UUID_RE.test(idOrCode)
    ? query.eq("id", idOrCode)
    : query.eq("lead_code", idOrCode);
  const { data: lead, error } = await query.maybeSingle();
  if (error) throw new Error(`Could not load prospect: ${error.message}`);
  if (!lead) return null;

  const activitiesQuery = () => {
    let query = supabase.from("lead_activities").select("*").eq("lead_id", lead.id);
    if (!context.isAdmin) query = query.eq("owner_id", user.id);
    return query.order("activity_at", { ascending: false });
  };
  const financingQuery = () => {
    let query = supabase.from("financing_applications").select("*").eq("lead_id", lead.id);
    if (!context.isAdmin) query = query.eq("owner_id", user.id);
    return query.order("created_at", { ascending: false });
  };
  const reservationsQuery = () => {
    let query = supabase.from("reservations").select("*").eq("lead_id", lead.id);
    if (!context.isAdmin) query = query.eq("owner_id", user.id);
    return query.order("reservation_date", { ascending: false });
  };
  const releasesQuery = () => {
    let query = supabase.from("vehicle_releases").select("*").eq("lead_id", lead.id);
    if (!context.isAdmin) query = query.eq("owner_id", user.id);
    return query.order("release_date", { ascending: false });
  };
  const lostSalesQuery = () => {
    let query = supabase.from("lost_sales").select("*").eq("lead_id", lead.id);
    if (!context.isAdmin) query = query.eq("owner_id", user.id);
    return query.order("date_marked_lost", { ascending: false });
  };

  const [activities, financing, reservations, releases, lostSales] =
    await Promise.all([
      activitiesQuery(),
      financingQuery(),
      reservationsQuery(),
      releasesQuery(),
      lostSalesQuery(),
    ]);

  return {
    lead,
    activities: activities.data ?? [],
    financing: financing.data ?? [],
    reservations: reservations.data ?? [],
    releases: releases.data ?? [],
    lostSales: lostSales.data ?? [],
  };
}

export async function getPipelineLeads(range?: { from?: string; to?: string }): Promise<Lead[]> {
  const context = await getAuthContext();
  const { supabase, user } = context;
  if (!user) return [];
  let query = supabase
    .from("leads")
    .select("id, lead_code, prospect_name, preferred_model, lead_source, pipeline_status, next_action, next_action_due_date, date_created")
    .eq("is_archived", false)
    .in("pipeline_status", [
      "New Prospect",
      "Contacted",
      "Qualified",
      "Quotation Given",
      "Financing Assessment",
      "Application Submitted",
      "Approved",
      "Reserved",
      "Pending Unit",
    ]);
  if (!context.isAdmin) query = query.eq("owner_id", user.id);
  if (range?.from) query = query.gte("date_created", range.from);
  if (range?.to) query = query.lte("date_created", range.to);
  query = query
    .order("next_action_due_date", { ascending: true, nullsFirst: false })
    .order("date_created", { ascending: false });
  const { data, error } = await query;
  if (error) throw new Error(`Could not load the pipeline: ${error.message}`);
  return (data ?? []) as Lead[];
}

export interface LeadPickerItem {
  id: string;
  lead_code: string;
  prospect_name: string;
  preferred_model: string | null;
  lead_source: string | null;
  pipeline_status: string;
}

export async function getLeadPicker(): Promise<LeadPickerItem[]> {
  const context = await getAuthContext();
  const { supabase, user } = context;
  if (!user) return [];
  let query = supabase
    .from("leads")
    .select("id, lead_code, prospect_name, preferred_model, lead_source, pipeline_status")
    .eq("is_archived", false)
    .order("prospect_name", { ascending: true });
  if (!context.isAdmin) query = query.eq("owner_id", user.id);
  const { data } = await query;
  return data ?? [];
}

export interface FollowUpBucket {
  overdue: Lead[];
  dueToday: Lead[];
  upcoming: Lead[];
}

export async function getFollowUps(): Promise<FollowUpBucket> {
  const context = await getAuthContext();
  const { supabase, user } = context;
  if (!user) return { overdue: [], dueToday: [], upcoming: [] };
  const today = todayISO();
  const inSeven = new Date(`${today}T00:00:00`);
  inSeven.setDate(inSeven.getDate() + 7);
  const upcomingTo = toISODate(inSeven);

  const base = () => {
    let query = supabase
      .from("leads")
      .select("*")
      .eq("is_archived", false)
      .not("next_action_due_date", "is", null)
      .is("next_action_completed_at", null);
    if (!context.isAdmin) query = query.eq("owner_id", user.id);
    return query;
  };

  const [overdue, dueToday, upcoming] = await Promise.all([
    base()
      .lt("next_action_due_date", today)
      .order("next_action_due_date", { ascending: true })
      .limit(50),
    base()
      .eq("next_action_due_date", today)
      .order("prospect_name", { ascending: true })
      .limit(50),
    base()
      .gt("next_action_due_date", today)
      .lte("next_action_due_date", upcomingTo)
      .order("next_action_due_date", { ascending: true })
      .limit(50),
  ]);

  return {
    overdue: overdue.data ?? [],
    dueToday: dueToday.data ?? [],
    upcoming: upcoming.data ?? [],
  };
}
