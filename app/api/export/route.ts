import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { getAuthContext } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { normalizePeriod, toISODate } from "@/lib/dates";

const EXPORT_TYPES = [
  "report",
  "leads",
  "financing",
  "reservations",
  "releases",
  "lost-sales",
] as const;

type ExportType = (typeof EXPORT_TYPES)[number];

function periodDates(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = toISODate(new Date(year, month, 0));
  return { start, end };
}

function sheet(rows: Record<string, unknown>[]) {
  return XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No records" }]);
}

function setWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map((wch) => ({ wch }));
}

export async function GET(request: NextRequest) {
  const context = await getAuthContext();
  const { supabase, user } = context;
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const requested = params.get("type") || "report";
  const type: ExportType = EXPORT_TYPES.includes(requested as ExportType)
    ? (requested as ExportType)
    : "report";
  const format = params.get("format") === "csv" ? "csv" : "xlsx";
  const { year, month } = normalizePeriod(
    Number(params.get("year")),
    Number(params.get("month")),
  );
  const { start, end } = periodDates(year, month);

  const [
    leadsRes,
    financingRes,
    reservationsRes,
    releasesRes,
    lostRes,
    dashboard,
  ] = await Promise.all([
    (() => {
      let query = supabase
        .from("leads")
        .select("*");
      if (!context.isAdmin) query = query.eq("owner_id", user.id);
      return query
        .gte("date_created", start)
        .lte("date_created", end)
        .order("date_created", { ascending: true });
    })(),
    (() => {
      let query = supabase
        .from("financing_applications")
        .select("*");
      if (!context.isAdmin) query = query.eq("owner_id", user.id);
      return query
        .gte("date_submitted", start)
        .lte("date_submitted", end)
        .order("date_submitted", { ascending: true });
    })(),
    (() => {
      let query = supabase
        .from("reservations")
        .select("*");
      if (!context.isAdmin) query = query.eq("owner_id", user.id);
      return query
        .gte("reservation_date", start)
        .lte("reservation_date", end)
        .order("reservation_date", { ascending: true });
    })(),
    (() => {
      let query = supabase
        .from("vehicle_releases")
        .select("*");
      if (!context.isAdmin) query = query.eq("owner_id", user.id);
      return query
        .gte("release_date", start)
        .lte("release_date", end)
        .order("release_date", { ascending: true });
    })(),
    (() => {
      let query = supabase
        .from("lost_sales")
        .select("*");
      if (!context.isAdmin) query = query.eq("owner_id", user.id);
      return query
        .gte("date_marked_lost", start)
        .lte("date_marked_lost", end)
        .order("date_marked_lost", { ascending: true });
    })(),
    getDashboardData(year, month),
  ]);

  const leadRows = leadsRes.data ?? [];
  const names = new Map(
    leadRows.map((row) => [row.id, `${row.prospect_name} (${row.lead_code})`]),
  );
  const allLeadIds = [
    ...new Set(
      [
        ...(financingRes.data ?? []),
        ...(reservationsRes.data ?? []),
        ...(releasesRes.data ?? []),
        ...(lostRes.data ?? []),
      ].map((row) => row.lead_id),
    ),
  ].filter((id) => !names.has(id));

  if (allLeadIds.length) {
    let namesQuery = supabase
      .from("leads")
      .select("id, prospect_name, lead_code")
      .in("id", allLeadIds);
    if (!context.isAdmin) namesQuery = namesQuery.eq("owner_id", user.id);
    const { data } = await namesQuery;
    for (const row of data ?? []) {
      names.set(row.id, `${row.prospect_name} (${row.lead_code})`);
    }
  }

  const leadSheetRows = leadRows.map((row) => ({
    "Lead code": row.lead_code,
    "Prospect name": row.prospect_name,
    "Lead source": row.lead_source ?? "",
    "Preferred model": row.preferred_model ?? "",
    Transaction: row.transaction ?? "",
    "Sales channel": row.sales_channel ?? "",
    "Pipeline status": row.pipeline_status,
    "Date created": row.date_created,
    "Purchase timeline": row.purchase_timeline ?? "",
    "Last contact": row.last_contact_date ?? "",
    "Next action": row.next_action ?? "",
    "Next action due": row.next_action_due_date ?? "",
    "Contact number": row.contact_number ?? "",
    Email: row.email ?? "",
    Location: row.location ?? "",
    Remarks: row.remarks ?? "",
  }));

  const financingRows = (financingRes.data ?? []).map((row) => ({
    "Financing code": row.financing_code,
    Prospect: names.get(row.lead_id) ?? "",
    "Date submitted": row.date_submitted ?? "",
    "Lead source": row.lead_source ?? "",
    "Preferred model": row.preferred_model ?? "",
    Bank: row.bank ?? "",
    Status: row.application_status,
    "Date approved": row.date_approval ?? "",
    "Approved DP": row.approved_dp ?? "",
    "Date released": row.date_released ?? "",
    Remarks: row.remarks ?? "",
  }));

  const reservationRows = (reservationsRes.data ?? []).map((row) => ({
    "Reservation code": row.reservation_code,
    Prospect: names.get(row.lead_id) ?? "",
    "Reservation date": row.reservation_date ?? "",
    "Reserved model": row.reserved_model ?? "",
    "Sales channel": row.sales_channel ?? "",
    Status: row.current_status,
    "Expected release": row.expected_release_date ?? "",
    "Last customer update": row.last_customer_update ?? "",
    "Next action": row.next_action ?? "",
    Remarks: row.remarks ?? "",
  }));

  const releaseRows = (releasesRes.data ?? []).map((row) => ({
    "Release code": row.release_code,
    Prospect: names.get(row.lead_id) ?? "",
    "Release date": row.release_date,
    Transaction: row.transaction ?? "",
    "Model released": row.model_released ?? "",
    Units: row.units_released,
    Bank: row.bank ?? "",
    Remarks: row.remarks ?? "",
  }));

  const lostRows = (lostRes.data ?? []).map((row) => ({
    "Lost code": row.lost_code,
    Prospect: names.get(row.lead_id) ?? "",
    "Date marked lost": row.date_marked_lost,
    "Lead source": row.lead_source ?? "",
    "Preferred model": row.preferred_model ?? "",
    "Stage when lost": row.pipeline_stage_when_lost ?? "",
    "Primary reason": row.primary_loss_reason ?? "",
    "Competitor / alternative": row.competitor_alternative ?? "",
    "Financing / payment issue": row.financing_payment_issue ?? "",
    Units: row.estimated_units_lost,
    Recoverable: row.recoverable ? "Yes" : "No",
    "Recovery status": row.recovery_status,
    "Recovery next action": row.recovery_next_action ?? "",
    "Coaching notes": row.coaching_notes ?? "",
  }));

  const summaryRows = [
    { Metric: "Period", Value: `${year}-${String(month).padStart(2, "0")}` },
    { Metric: "Sales target", Value: dashboard.kpis.salesTarget },
    { Metric: "Total releases", Value: dashboard.kpis.totalReleases },
    { Metric: "Remaining to target", Value: dashboard.kpis.remainingToTarget },
    { Metric: "Closing ratio", Value: dashboard.kpis.closingRatio },
    { Metric: "Financing target", Value: dashboard.kpis.financingTarget },
    { Metric: "Financing releases", Value: dashboard.kpis.financingReleases },
    { Metric: "TFS target", Value: dashboard.kpis.tfsTarget },
    { Metric: "TFS releases", Value: dashboard.kpis.tfsReleases },
    { Metric: "Prospects created", Value: dashboard.kpis.prospectsCreated },
    { Metric: "Applications submitted", Value: dashboard.kpis.applicationsSubmitted },
    { Metric: "Approved applications", Value: dashboard.kpis.approvedApplications },
    { Metric: "Pending units", Value: dashboard.kpis.pendingUnits },
    { Metric: "Lost sales", Value: dashboard.kpis.lostSales },
  ];

  const progressRows = dashboard.releaseProgress.map((row) => ({
    Metric: row.metric,
    Target: row.target,
    Actual: row.actual,
    "Percent of target": row.pct,
    Remarks: row.remarks,
  }));

  const sourceRows = dashboard.leadSourceSummary.map((row) => ({
    "Lead source": row.label,
    "Prospects created": row.count,
  }));

  const lostReasonRows = dashboard.lostReasonSummary.map((row) => ({
    "Loss reason": row.label,
    Count: row.count,
  }));

  const monthlyRows = dashboard.charts.monthly.map((row) => ({
    Month: row.key,
    "Prospects created": row.prospects,
    Releases: row.releases,
    "Closing ratio": row.closingRatio,
  }));

  const workbook = XLSX.utils.book_new();

  function add(name: string, rows: Record<string, unknown>[], widths: number[]) {
    const ws = sheet(rows);
    setWidths(ws, widths);
    XLSX.utils.book_append_sheet(workbook, ws, name);
  }

  if (type === "leads") {
    add("Prospects", leadSheetRows, [14, 26, 24, 24, 20, 20, 18, 14, 14, 14, 30, 14, 18, 26, 20, 40]);
  } else if (type === "financing") {
    add("Financing", financingRows, [16, 30, 14, 22, 24, 16, 20, 14, 12, 14, 36]);
  } else if (type === "reservations") {
    add("Reservations", reservationRows, [16, 30, 14, 24, 20, 18, 14, 28, 28, 36]);
  } else if (type === "releases") {
    add("Releases", releaseRows, [14, 30, 14, 18, 26, 8, 16, 36]);
  } else if (type === "lost-sales") {
    add("Lost Sales", lostRows, [14, 30, 14, 22, 24, 20, 30, 24, 26, 8, 12, 14, 30, 40]);
  } else {
    add("Summary", summaryRows, [26, 30]);
    add("Release Progress", progressRows, [20, 10, 10, 16, 16]);
    add("Lead Sources", sourceRows, [32, 16]);
    add("Lost Reasons", lostReasonRows, [36, 10]);
    add("Monthly Trend", monthlyRows, [12, 16, 10, 14]);
    add("Prospects", leadSheetRows, [14, 26, 24, 24, 20, 20, 18, 14, 14, 14, 30, 14, 18, 26, 20, 40]);
    add("Financing", financingRows, [16, 30, 14, 22, 24, 16, 20, 14, 12, 14, 36]);
    add("Reservations", reservationRows, [16, 30, 14, 24, 20, 18, 14, 28, 28, 36]);
    add("Releases", releaseRows, [14, 30, 14, 18, 26, 8, 16, 36]);
    add("Lost Sales", lostRows, [14, 30, 14, 22, 24, 20, 30, 24, 26, 8, 12, 14, 30, 40]);
  }

  const period = `${year}-${String(month).padStart(2, "0")}`;
  const filenameBase = `toyota-crm-${type}-${period}`;

  if (format === "csv") {
    const firstSheetName = workbook.SheetNames[0];
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
      },
    });
  }

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
    },
  });
}
