import { getSession, getProfile } from "@/lib/auth";
import { getOptions, getTargetsFor, type OptionMap } from "@/lib/data/options";
import { normalizePeriod, remainingWorkingDays, toISODate } from "@/lib/dates";
import { safeFormatDate } from "@/lib/format";
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
): Promise<DashboardData> {
  const period = normalizePeriod(year, month);
  year = period.year;
  month = period.month;

  const { supabase, user } = await getSession();
  const [options, targets, profile] = await Promise.all([
    getOptions(),
    getTargetsFor(year, month),
    getProfile(),
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

  const periodStart = monthKeyOf(year, month) + "-01";
  const periodEndDate = new Date(year, month, 0);
  const periodEnd = toISODate(periodEndDate);
  const chartStartDate = new Date(year, month - 1 - 5, 1);
  const chartStart = toISODate(chartStartDate);

  const [leadsRes, releasesRes, financingRes, lostRes, reservationsRes] =
    await Promise.all([
      supabase
        .from("leads")
        .select(
          "id, lead_code, prospect_name, lead_source, preferred_model, pipeline_status, date_created, is_archived",
        )
        .eq("owner_id", user.id),
      supabase
        .from("vehicle_releases")
        .select("*")
        .eq("owner_id", user.id)
        .gte("release_date", chartStart)
        .lte("release_date", periodEnd)
        .order("release_date", { ascending: false }),
      supabase
        .from("financing_applications")
        .select("*")
        .eq("owner_id", user.id)
        .order("date_submitted", { ascending: false }),
      supabase
        .from("lost_sales")
        .select("*")
        .eq("owner_id", user.id)
        .gte("date_marked_lost", chartStart)
        .lte("date_marked_lost", periodEnd)
        .order("date_marked_lost", { ascending: false }),
      supabase
        .from("reservations")
        .select("*")
        .eq("owner_id", user.id),
    ]);

  const leads = (leadsRes.data ?? []) as Pick<
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
  const releases = (releasesRes.data ?? []) as VehicleRelease[];
  const financing = (financingRes.data ?? []) as FinancingApplication[];
  const lost = (lostRes.data ?? []) as LostSale[];
  const reservations = (reservationsRes.data ?? []) as Reservation[];

  const inPeriod = (date: string | null | undefined) =>
    Boolean(date && date >= periodStart && date <= periodEnd);

  const releasesInPeriod = releases.filter((r) => inPeriod(r.release_date));
  const totalReleases = releasesInPeriod.reduce(
    (sum, r) => sum + r.units_released,
    0,
  );
  const financingReleases = releasesInPeriod
    .filter((r) => isFinancingRelease(r))
    .reduce((sum, r) => sum + r.units_released, 0);
  const tfsReleases = releasesInPeriod
    .filter((r) => isTfsRelease(r))
    .reduce((sum, r) => sum + r.units_released, 0);

  const leadsInPeriod = leads.filter((l) => inPeriod(l.date_created));
  const prospectsCreated = leadsInPeriod.length;

  const applicationsSubmitted = financing.filter((a) =>
    inPeriod(a.date_submitted),
  ).length;
  const approvedApplications = financing.filter(
    (a) =>
      inPeriod(a.date_approval) &&
      ["Approved", "Released"].includes(a.application_status),
  ).length;

  const lostInPeriod = lost.filter((l) => inPeriod(l.date_marked_lost));
  const pendingUnits = reservations.filter(
    (r) => inPeriod(r.reservation_date) && r.current_status === "Pending Unit",
  ).length;
  const reservedProspects = reservations.filter(
    (r) => inPeriod(r.reservation_date) && r.current_status === "Reserved",
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

  // Monthly chart series (6 months ending in the selected period) ------------
  const monthly: MonthlyPoint[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const pointDate = new Date(year, month - 1 - offset, 1);
    const key = monthKeyOf(pointDate.getFullYear(), pointDate.getMonth() + 1);
    const monthReleases = releases
      .filter((r) => monthKey(r.release_date) === key)
      .reduce((sum, r) => sum + r.units_released, 0);
    const monthProspects = leads.filter(
      (l) => monthKey(l.date_created) === key,
    ).length;
    monthly.push({
      key,
      label: safeFormatDate(pointDate, "MMM"),
      releases: monthReleases,
      prospects: monthProspects,
      closingRatio:
        monthProspects > 0 ? monthReleases / monthProspects : 0,
    });
  }

  const pipelineCounts = new Map<string, number>();
  for (const lead of leads.filter((l) => !l.is_archived)) {
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
  for (const application of financing) {
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
    recentReleases: releasesInPeriod.slice(0, 5),
    recentFinancing: financing
      .filter((a) => inPeriod(a.date_submitted))
      .slice(0, 5),
    recentLost: lostInPeriod.slice(0, 5),
  };
}
