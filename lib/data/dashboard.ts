import { getAuthContext } from "@/lib/auth";
import { getOptions, getTargetsFor, type OptionMap } from "@/lib/data/options";
import { normalizePeriod, remainingWorkingDays, toISODate } from "@/lib/dates";
import { safeFormatDate } from "@/lib/format";
import { dateRangeFromPeriod, isWithinDateRange, sixMonthTrendEnd } from "@/lib/date-range";
import {
  FINANCING_STATUS_FALLBACK,
  LEAD_SOURCE_FALLBACK,
  LOST_SALE_REASON_FALLBACK,
  PIPELINE_STATUS_FALLBACK,
} from "@/lib/constants";
import type {
  FinancingApplication,
  Lead,
  LostSale,
  Reservation,
  VehicleRelease,
} from "@/types/database";

export interface DashboardDateRange {
  from?: string;
  to?: string;
}

const FINANCING_TRANSACTIONS = ["financing", "in-house financing"];

export function isFinancingRelease(release: {
  transaction: string | null;
  bank: string | null;
}) {
  const transaction = (release.transaction || "").toLowerCase().trim();
  if (FINANCING_TRANSACTIONS.includes(transaction)) return true;
  if (transaction === "cash") return false;
  return Boolean(release.bank && release.bank.trim());
}

export function isTfsRelease(release: { bank: string | null }) {
  return (release.bank || "").trim().toUpperCase() === "TFS";
}

export interface ReleaseProgressRow {
  metric: string;
  target: number;
  actual: number;
  pct: number;
  remarks: string;
}

export interface MonthlyPoint {
  key: string;
  label: string;
  releases: number;
  prospects: number;
  closingRatio: number;
}

export interface DashboardData {
  year: number;
  month: number;
  profileName: string;
  profileStatus: string;
  targets: { sales: number; financing: number; tfs: number; source: string };
  remainingWorkingDays: number;
  kpis: {
    salesTarget: number;
    totalReleases: number;
    remainingToTarget: number;
    closingRatio: number;
    financingTarget: number;
    financingReleases: number;
    remainingFinancing: number;
    lostSales: number;
    tfsReleases: number;
    tfsTarget: number;
    applicationsSubmitted: number;
    approvedApplications: number;
    pendingUnits: number;
    prospectsCreated: number;
  };
  releaseProgress: ReleaseProgressRow[];
  leadSourceSummary: { label: string; count: number }[];
  lostReasonSummary: { label: string; count: number }[];
  performance: {
    name: string;
    status: string;
    target: number;
    actual: number;
    prospectsGenerated: number;
    applicationsSubmitted: number;
    approvedApplications: number;
    reservedProspects: number;
    lostProspects: number;
    closingRatio: number;
  };
  charts: {
    monthly: MonthlyPoint[];
    leadSources: { name: string; value: number }[];
    pipeline: { name: string; value: number }[];
    financing: { name: string; value: number }[];
    lostReasons: { name: string; value: number }[];
  };
  recentReleases: VehicleRelease[];
  recentFinancing: FinancingApplication[];
  recentLost: LostSale[];
}

function labelsFrom(
  options: OptionMap,
  category: string,
  fallback: string[],
) {
  const labels = (options[category] ?? []).map((row) => row.label);
  return labels.length ? labels : fallback;
}

function monthKey(value: string | null | undefined) {
  return value ? value.slice(0, 7) : "";
}

function monthKeyOf(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function getDashboardData(
  year: number,
  month: number,
  range?: DashboardDateRange,
): Promise<DashboardData> {
  const period = normalizePeriod(year, month);
  year = period.year;
  month = period.month;

  const context = await getAuthContext();
  const { supabase, user } = context;
  const profile = context.profile;
  const [options, targets] = await Promise.all([
    getOptions(),
    getTargetsFor(year, month),
  ]);

  const emptyCharts = {
    monthly: [] as MonthlyPoint[],
    leadSources: [] as { name: string; value: number }[],
    pipeline: [] as { name: string; value: number }[],
    financing: [] as { name: string; value: number }[],
    lostReasons: [] as { name: string; value: number }[],
  };

  if (!user) {
    return {
      year,
      month,
      profileName: profile?.full_name || "Marketing Professional",
      profileStatus: profile?.status || "—",
      targets,
      remainingWorkingDays: remainingWorkingDays(year, month),
      kpis: {
        salesTarget: targets.sales,
        totalReleases: 0,
        remainingToTarget: targets.sales,
        closingRatio: 0,
        financingTarget: targets.financing,
        financingReleases: 0,
        remainingFinancing: targets.financing,
        lostSales: 0,
        tfsReleases: 0,
        tfsTarget: targets.tfs,
        applicationsSubmitted: 0,
        approvedApplications: 0,
        pendingUnits: 0,
        prospectsCreated: 0,
      },
      releaseProgress: [
        { metric: "Total Releases", target: targets.sales, actual: 0, pct: 0, remarks: "Behind Target" },
        { metric: "Financing Releases", target: targets.financing, actual: 0, pct: 0, remarks: "Behind Target" },
        { metric: "TFS Releases", target: targets.tfs, actual: 0, pct: 0, remarks: "Behind Target" },
      ],
      leadSourceSummary: [],
      lostReasonSummary: [],
      performance: {
        name: profile?.full_name || "Marketing Professional",
        status: profile?.status || "—",
        target: targets.sales,
        actual: 0,
        prospectsGenerated: 0,
        applicationsSubmitted: 0,
        approvedApplications: 0,
        reservedProspects: 0,
        lostProspects: 0,
        closingRatio: 0,
      },
      charts: emptyCharts,
      recentReleases: [],
      recentFinancing: [],
      recentLost: [],
    };
  }

  const trendEnd = sixMonthTrendEnd(range ?? {}, year, month);
  const trendYear = trendEnd.year;
  const trendMonth = trendEnd.month;
  const selectedPeriod = dateRangeFromPeriod(year, month);
  const selectedRange = range?.from || range?.to
    ? { from: range.from ?? selectedPeriod.from, to: range.to ?? selectedPeriod.to }
    : selectedPeriod;
  const chartStartDate = new Date(trendYear, trendMonth - 1 - 5, 1);
  const chartEndDate = new Date(trendYear, trendMonth, 0);
  const chartStart = toISODate(chartStartDate);
  const chartEnd = toISODate(chartEndDate);
  const kpiStart = selectedRange.from ?? chartStart;
  const kpiEnd = selectedRange.to ?? chartEnd;

  const leadsSelect = "id, lead_code, prospect_name, lead_source, preferred_model, pipeline_status, date_created, is_archived";
  const releaseSelect = "id, release_code, lead_id, release_date, model_released, units_released, transaction, bank, created_at";
  const financingSelect = "id, financing_code, lead_id, date_submitted, date_approval, application_status, bank, date_released";
  const lostSelect = "id, lost_code, lead_id, date_marked_lost, primary_loss_reason, recoverable, recovery_status";
  const reservationSelect = "id, reservation_code, lead_id, reservation_date, current_status, expected_release_date";

  const [leadsTrendRes, leadsKpiRes, releasesTrendRes, releasesKpiRes, financingRes, lostKpiRes, reservationsKpiRes, pipelineLeadsRes, recentFinancingRes, recentLostRes] =
    await Promise.all([
      (() => {
        let q = supabase.from("leads").select("id, date_created");
        if (!context.isAdmin) q = q.eq("owner_id", user.id);
        return q.gte("date_created", chartStart).lte("date_created", chartEnd);
      })(),
      (() => {
        let q = supabase.from("leads").select(leadsSelect);
        if (!context.isAdmin) q = q.eq("owner_id", user.id);
        return q.gte("date_created", kpiStart).lte("date_created", kpiEnd).order("date_created", { ascending: true });
      })(),
      (() => {
        let q = supabase.from("vehicle_releases").select("release_date, units_released");
        if (!context.isAdmin) q = q.eq("owner_id", user.id);
        return q.gte("release_date", chartStart).lte("release_date", chartEnd);
      })(),
      (() => {
        let q = supabase.from("vehicle_releases").select(releaseSelect);
        if (!context.isAdmin) q = q.eq("owner_id", user.id);
        return q.gte("release_date", kpiStart).lte("release_date", kpiEnd).order("release_date", { ascending: false });
      })(),
      (() => {
        let q = supabase.from("financing_applications").select(financingSelect);
        if (!context.isAdmin) q = q.eq("owner_id", user.id);
        return q.or(`and(date_submitted.gte.${kpiStart},date_submitted.lte.${kpiEnd}),and(date_approval.gte.${kpiStart},date_approval.lte.${kpiEnd})`);
      })(),
      (() => {
        let q = supabase.from("lost_sales").select(lostSelect);
        if (!context.isAdmin) q = q.eq("owner_id", user.id);
        return q.gte("date_marked_lost", kpiStart).lte("date_marked_lost", kpiEnd).order("date_marked_lost", { ascending: false });
      })(),
      (() => {
        let q = supabase.from("reservations").select(reservationSelect);
        if (!context.isAdmin) q = q.eq("owner_id", user.id);
        return q.gte("reservation_date", kpiStart).lte("reservation_date", kpiEnd);
      })(),
      (() => {
        let q = supabase.from("leads").select("pipeline_status, is_archived");
        if (!context.isAdmin) q = q.eq("owner_id", user.id);
        return q.eq("is_archived", false);
      })(),
      (() => {
        let q = supabase.from("financing_applications").select(financingSelect);
        if (!context.isAdmin) q = q.eq("owner_id", user.id);
        return q.gte("date_submitted", kpiStart).lte("date_submitted", kpiEnd).order("date_submitted", { ascending: false, nullsFirst: false }).limit(5);
      })(),
      (() => {
        let q = supabase.from("lost_sales").select(lostSelect);
        if (!context.isAdmin) q = q.eq("owner_id", user.id);
        return q.gte("date_marked_lost", kpiStart).lte("date_marked_lost", kpiEnd).order("date_marked_lost", { ascending: false }).limit(5);
      })(),
    ]);

  const leadsInPeriod = (leadsKpiRes.data ?? []) as Pick<
    Lead,
    | "id"
    | "lead_code"
    | "prospect_name"
    | "lead_source"
    | "preferred_model"
    | "pipeline_status"
    | "date_created"
    | "is_archived"
  >[];
  const releasesInPeriod = (releasesKpiRes.data ?? []) as Pick<
    VehicleRelease,
    "id" | "release_code" | "lead_id" | "release_date" | "model_released" | "units_released" | "transaction" | "bank" | "created_at"
  >[];
  const financing = (financingRes.data ?? []) as Pick<
    FinancingApplication,
    "id" | "financing_code" | "lead_id" | "date_submitted" | "date_approval" | "application_status" | "bank" | "date_released"
  >[];
  const lostInPeriod = (lostKpiRes.data ?? []) as Pick<
    LostSale,
    "id" | "lost_code" | "lead_id" | "date_marked_lost" | "primary_loss_reason" | "recoverable" | "recovery_status"
  >[];
  const reservations = (reservationsKpiRes.data ?? []) as Pick<
    Reservation,
    "id" | "reservation_code" | "lead_id" | "reservation_date" | "current_status" | "expected_release_date"
  >[];
  const leadsForTrend = (leadsTrendRes.data ?? []) as Pick<Lead, "id" | "date_created">[];
  const releasesForTrend = (releasesTrendRes.data ?? []) as Pick<VehicleRelease, "release_date" | "units_released">[];
  // lost reasons chart uses selected-range lost records (lostInPeriod)

  const inSelected = (date: string | null | undefined) => isWithinDateRange(date, selectedRange);

  const totalReleases = releasesInPeriod.reduce((sum, r) => sum + (r.units_released || 0), 0);
  const financingReleases = releasesInPeriod
    .filter((r) => isFinancingRelease(r))
    .reduce((sum, r) => sum + (r.units_released || 0), 0);
  const tfsReleases = releasesInPeriod
    .filter((r) => isTfsRelease(r))
    .reduce((sum, r) => sum + (r.units_released || 0), 0);

  const prospectsCreated = leadsInPeriod.length;
  const applicationsSubmitted = financing.filter((a) => inSelected(a.date_submitted)).length;
  const approvedApplications = financing.filter(
    (a) => inSelected(a.date_approval) && ["Approved", "Released"].includes(a.application_status),
  ).length;

  const pendingUnits = reservations.filter(
    (r) => inSelected(r.reservation_date) && r.current_status === "Pending Unit",
  ).length;
  const reservedProspects = reservations.filter(
    (r) => inSelected(r.reservation_date) && r.current_status === "Reserved",
  ).length;

  const closingRatio =
    prospectsCreated > 0 ? totalReleases / prospectsCreated : 0;

  const leadSources = labelsFrom(
    options,
    "lead_source",
    LEAD_SOURCE_FALLBACK,
  );
  const lostReasons = labelsFrom(
    options,
    "lost_sale_reason",
    LOST_SALE_REASON_FALLBACK,
  );
  const pipelineStatuses = labelsFrom(
    options,
    "pipeline_status",
    PIPELINE_STATUS_FALLBACK,
  );
  const financingStatuses = labelsFrom(
    options,
    "financing_status",
    FINANCING_STATUS_FALLBACK,
  );

  const sourceCounts = new Map<string, number>();
  for (const lead of leadsInPeriod) {
    const key = lead.lead_source || "Unspecified";
    sourceCounts.set(key, (sourceCounts.get(key) || 0) + 1);
  }
  const leadSourceSummary = leadSources.map((label) => ({
    label,
    count: sourceCounts.get(label) || 0,
  }));
  for (const [label, count] of sourceCounts) {
    if (!leadSources.includes(label)) leadSourceSummary.push({ label, count });
  }

  const lostReasonCounts = new Map<string, number>();
  for (const record of lostInPeriod) {
    const key = record.primary_loss_reason || "Unspecified";
    lostReasonCounts.set(key, (lostReasonCounts.get(key) || 0) + 1);
  }
  const lostReasonSummary = lostReasons.map((label) => ({
    label,
    count: lostReasonCounts.get(label) || 0,
  }));
  for (const [label, count] of lostReasonCounts) {
    if (!lostReasons.includes(label)) lostReasonSummary.push({ label, count });
  }
  lostReasonSummary.sort((a, b) => b.count - a.count);

  const releaseProgress: ReleaseProgressRow[] = [
    {
      metric: "Total Releases",
      target: targets.sales,
      actual: totalReleases,
      pct: targets.sales > 0 ? totalReleases / targets.sales : 0,
      remarks:
        targets.sales > 0 && totalReleases >= targets.sales
          ? "Target Met"
          : "Behind Target",
    },
    {
      metric: "Financing Releases",
      target: targets.financing,
      actual: financingReleases,
      pct:
        targets.financing > 0 ? financingReleases / targets.financing : 0,
      remarks:
        targets.financing > 0 && financingReleases >= targets.financing
          ? "Target Met"
          : "Behind Target",
    },
    {
      metric: "TFS Releases",
      target: targets.tfs,
      actual: tfsReleases,
      pct: targets.tfs > 0 ? tfsReleases / targets.tfs : 0,
      remarks:
        targets.tfs > 0 && tfsReleases >= targets.tfs
          ? "Target Met"
          : "Behind Target",
    },
  ];

  // Monthly chart series (6 months ending in the selected reporting period) --
  const monthly: MonthlyPoint[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const pointDate = new Date(trendYear, trendMonth - 1 - offset, 1);
    const key = monthKeyOf(pointDate.getFullYear(), pointDate.getMonth() + 1);
    const monthReleases = releasesForTrend
      .filter((r) => monthKey(r.release_date) === key)
      .reduce((sum, r) => sum + (r.units_released || 0), 0);
    const monthProspects = leadsForTrend.filter((l) => monthKey(l.date_created) === key).length;
    monthly.push({
      key,
      label: safeFormatDate(pointDate, "MMM"),
      releases: monthReleases,
      prospects: monthProspects,
      closingRatio: monthProspects > 0 ? monthReleases / monthProspects : 0,
    });
  }

  const pipelineCounts = new Map<string, number>();
  for (const lead of (pipelineLeadsRes.data ?? []) as Pick<Lead, "pipeline_status" | "is_archived">[]) {
    if (lead.is_archived) continue;
    const key = lead.pipeline_status || "Unspecified";
    pipelineCounts.set(key, (pipelineCounts.get(key) || 0) + 1);
  }
  const pipeline = pipelineStatuses
    .map((name) => ({ name, value: pipelineCounts.get(name) || 0 }))
    .filter((row) => row.value > 0);
  for (const [name, value] of pipelineCounts) {
    if (!pipelineStatuses.includes(name)) pipeline.push({ name, value });
  }

  const financingCounts = new Map<string, number>();
  for (const application of financing.filter((a) => inSelected(a.date_submitted) || inSelected(a.date_approval))) {
    const key = application.application_status || "Unspecified";
    financingCounts.set(key, (financingCounts.get(key) || 0) + 1);
  }
  const financingChart = financingStatuses
    .map((name) => ({ name, value: financingCounts.get(name) || 0 }))
    .filter((row) => row.value > 0);
  for (const [name, value] of financingCounts) {
    if (!financingStatuses.includes(name)) financingChart.push({ name, value });
  }

  const lostReasonChart = [...lostReasonCounts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return {
    year,
    month,
    profileName: profile?.full_name || "Marketing Professional",
    profileStatus: profile?.status || "—",
    targets,
    remainingWorkingDays: remainingWorkingDays(year, month),
    kpis: {
      salesTarget: targets.sales,
      totalReleases,
      remainingToTarget: Math.max(0, targets.sales - totalReleases),
      closingRatio,
      financingTarget: targets.financing,
      financingReleases,
      remainingFinancing: Math.max(0, targets.financing - financingReleases),
      lostSales: lostInPeriod.length,
      tfsReleases,
      tfsTarget: targets.tfs,
      applicationsSubmitted,
      approvedApplications,
      pendingUnits,
      prospectsCreated,
    },
    releaseProgress,
    leadSourceSummary,
    lostReasonSummary,
    performance: {
      name: profile?.full_name || "Marketing Professional",
      status: profile?.status || "—",
      target: targets.sales,
      actual: totalReleases,
      prospectsGenerated: prospectsCreated,
      applicationsSubmitted,
      approvedApplications,
      reservedProspects,
      lostProspects: lostInPeriod.length,
      closingRatio,
    },
    charts: {
      monthly,
      leadSources: leadSourceSummary
        .filter((row) => row.count > 0)
        .map((row) => ({ name: row.label, value: row.count })),
      pipeline: pipeline.filter((row) => row.value > 0),
      financing: financingChart,
      lostReasons: lostReasonChart,
    },
    recentReleases: releasesInPeriod.slice(0, 5) as unknown as VehicleRelease[],
    recentFinancing: ((recentFinancingRes.data ?? []) as unknown as FinancingApplication[]).slice(0, 5),
    recentLost: ((recentLostRes.data ?? []) as unknown as LostSale[]).slice(0, 5),
  };
}
