import { getSession } from "@/lib/auth";
import { todayISO, toISODate } from "@/lib/dates";

export interface AlertSummary {
  overdueFollowUps: number;
  dueToday: number;
  upcomingFollowUps: number;
  pendingFinancing: number;
  pendingDocuments: number;
  overdueReleases: number;
  awaitingUnit: number;
  total: number;
}

export async function getAlertSummary(): Promise<AlertSummary> {
  const { supabase, user } = await getSession();
  const empty: AlertSummary = {
    overdueFollowUps: 0,
    dueToday: 0,
    upcomingFollowUps: 0,
    pendingFinancing: 0,
    pendingDocuments: 0,
    overdueReleases: 0,
    awaitingUnit: 0,
    total: 0,
  };
  if (!user) return empty;
  const today = todayISO();
  const week = new Date(`${today}T00:00:00`);
  week.setDate(week.getDate() + 7);
  const weekISO = toISODate(week);

  const count = async (
    build: () => PromiseLike<{ count: number | null; error: unknown }>,
  ) => {
    try {
      const { count } = await build();
      return count ?? 0;
    } catch {
      return 0;
    }
  };

  const [
    overdueFollowUps,
    dueToday,
    upcomingFollowUps,
    pendingFinancing,
    pendingDocsFinancing,
    pendingDocsReservations,
    overdueReleases,
    awaitingUnit,
  ] = await Promise.all([
    count(() =>
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("is_archived", false)
        .not("next_action_due_date", "is", null)
        .is("next_action_completed_at", null)
        .lt("next_action_due_date", today),
    ),
    count(() =>
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("is_archived", false)
        .eq("next_action_due_date", today)
        .is("next_action_completed_at", null),
    ),
    count(() =>
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("is_archived", false)
        .gt("next_action_due_date", today)
        .lte("next_action_due_date", weekISO)
        .is("next_action_completed_at", null),
    ),
    count(() =>
      supabase
        .from("financing_applications")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .in("application_status", [
          "For assessment",
          "Application submitted",
          "Pending documents",
          "Pending unit",
        ]),
    ),
    count(() =>
      supabase
        .from("financing_applications")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("application_status", "Pending documents"),
    ),
    count(() =>
      supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("current_status", "Pending Docs"),
    ),
    count(() =>
      supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .lt("expected_release_date", today)
        .not("current_status", "in", "(Released,Cancelled)"),
    ),
    count(() =>
      supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("current_status", "Pending Unit"),
    ),
  ]);

  const pendingDocuments = pendingDocsFinancing + pendingDocsReservations;
  const total =
    overdueFollowUps +
    dueToday +
    pendingFinancing +
    overdueReleases +
    awaitingUnit;

  return {
    overdueFollowUps,
    dueToday,
    upcomingFollowUps,
    pendingFinancing,
    pendingDocuments,
    overdueReleases,
    awaitingUnit,
    total,
  };
}
