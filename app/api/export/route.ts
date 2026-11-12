import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { getAuthContext } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { normalizePeriod } from "@/lib/dates";
import { dateRangeFromPeriod, parseDateRangeParams, periodFromDateRange, resolveDateRange } from "@/lib/date-range";

const EXPORT_TYPES = [
  "report",
  "leads",
  "financing",
  "reservations",
  "releases",
  "lost-sales",
] as const;

type ExportType = (typeof EXPORT_TYPES)[number];

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

  const rawParams: Record<string, string | string[] | undefined> = {};
  params.forEach((value, key) => { rawParams[key] = value; });
  const resolved = resolveDateRange(parseDateRangeParams(rawParams));
  let year: number;
  let month: number;
  if (params.get("year") || params.get("month")) {
    const p = normalizePeriod(Number(params.get("year")), Number(params.get("month")));
    year = p.year;
    month = p.month;
  } else if (resolved.from || resolved.to) {
    const p = periodFromDateRange(resolved);
    year = p.year;
    month = p.month;
  } else {
    const p = normalizePeriod(NaN, NaN);
    year = p.year;
    month = p.month;
  }
  const fallback = dateRangeFromPeriod(year, month);
  const range = {
    from: resolved.from ?? fallback.from,
    to: resolved.to ?? fallback.to,
  };

  const [leadsRes, financingRes, reservationsRes, releasesRes, lostRes, dashboard] = await Promise.all([
    (() => {
      let q = supabase.from("leads").select("id,lead_code,prospect_name,lead_source,preferred_model,transaction,sales_channel,pipeline_status,date_created,purchase_timeline,last_contact_date,next_action,next_action_due_date,contact_number,email,location,remarks");
      if (!context.isAdmin) q = q.eq("owner_id", user.id);
      return q.gte("date_created", range.from).lte("date_created", range.to).order("date_created", { ascending: true });
    })(),
    (() => {
      let q = supabase.from("financing_applications").select("id,financing_code,lead_id,date_submitted,lead_source,preferred_model,bank,application_status,date_approval,approved_dp,date_released,remarks");
      if (!context.isAdmin) q = q.eq("owner_id", user.id);
      return q.gte("date_submitted", range.from).lte("date_submitted", range.to).order("date_submitted", { ascending: true });
    })(),
    (() => {
      let q = supabase.from("reservations").select("id,reservation_code,lead_id,reservation_date,reserved_model,sales_channel,current_status,expected_release_date,last_customer_update,next_action,remarks");
      if (!context.isAdmin) q = q.eq("owner_id", user.id);
      return q.gte("reservation_date", range.from).lte("reservation_date", range.to).order("reservation_date", { ascending: true });
    })(),
    (() => {
      let q = supabase.from("vehicle_releases").select("id,release_code,lead_id,release_date,transaction,model_released,units_released,bank,remarks");
      if (!context.isAdmin) q = q.eq("owner_id", user.id);
      return q.gte("release_date", range.from).lte("release_date", range.to).order("release_date", { ascending: true });
    })(),
    (() => {
      let q = supabase.from("lost_sales").select("id,lost_code,lead_id,date_marked_lost,lead_source,preferred_model,pipeline_stage_when_lost,primary_loss_reason,competitor_alternative,financing_payment_issue,estimated_units_lost,recoverable,recovery_status,recovery_next_action,coaching_notes");
      if (!context.isAdmin) q = q.eq("owner_id", user.id);
      return q.gte("date_marked_lost", range.from).lte("date_marked_lost", range.to).order("date_marked_lost", { ascending: true });
    })(),
    getDashboardData(year, month, range),
  ]);

  const leadRows = leadsRes.data ?? [];
  const names = new Map(leadRows.map((row) => [row.id, `${row.prospect_name} (${row.lead_code})`]));
  const allLeadIds = [...new Set([
    ...(financingRes.data ?? []),
    ...(reservationsRes.data ?? []),
    ...(releasesRes.data ?? []),
    ...(lostRes.data ?? []),
  ].map((row) => row.lead_id))].filter((id) => !names.has(id));

  if (allLeadIds.length) {
    let namesQuery = supabase.from("leads").select("id, prospect_name, lead_code").in("id", allLeadIds);
    if (!context.isAdmin) namesQuery = namesQuery.eq("owner_id", user.id);
    const { data } = await namesQuery;
    for (const row of data ?? []) names.set(row.id, `${row.prospect_name} (${row.lead_code})`);
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
    { Metric: "Period from", Value: range.from },
    { Metric: "Period to", Value: range.to },
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
  const progressRows = dashboard.releaseProgress.map((row) => ({ Metric: row.metric, Target: row.target, Actual: row.actual, "Percent of target": row.pct, Remarks: row.remarks }));
  const sourceRows = dashboard.leadSourceSummary.map((row) => ({ "Lead source": row.label, "Prospects created": row.count }));
  const lostReasonRows = dashboard.lostReasonSummary.map((row) => ({ "Loss reason": row.label, Count: row.count }));
  const monthlyRows = dashboard.charts.monthly.map((row) => ({ Month: row.key, "Prospects created": row.prospects, Releases: row.releases, "Closing ratio": row.closingRatio }));

  const workbook = XLSX.utils.book_new();
  function add(name: string, rows: Record<string, unknown>[], widths: number[]) {
    const ws = sheet(rows);
    setWidths(ws, widths);
    XLSX.utils.book_append_sheet(workbook, ws, name);
  }

  if (type === "leads") add("Prospects", leadSheetRows, [14,26,24,24,20,20,18,14,14,14,30,14,18,26,20,40]);
  else if (type === "financing") add("Financing", financingRows, [16,30,14,22,24,16,20,14,12,14,36]);
  else if (type === "reservations") add("Reservations", reservationRows, [16,30,14,24,20,18,14,28,28,36]);
  else if (type === "releases") add("Releases", releaseRows, [14,30,14,18,26,8,16,36]);
  else if (type === "lost-sales") add("Lost Sales", lostRows, [14,30,14,22,24,20,30,24,26,8,12,14,30,40]);
  else {
    add("Summary", summaryRows, [26, 30]);
    add("Release Progress", progressRows, [20,10,10,16,16]);
    add("Lead Sources", sourceRows, [32,16]);
    add("Lost Reasons", lostReasonRows, [36,10]);
    add("Monthly Trend", monthlyRows, [12,16,10,14]);
    add("Prospects", leadSheetRows, [14,26,24,24,20,20,18,14,14,14,30,14,18,26,20,40]);
    add("Financing", financingRows, [16,30,14,22,24,16,20,14,12,14,36]);
    add("Reservations", reservationRows, [16,30,14,24,20,18,14,28,28,36]);
    add("Releases", releaseRows, [14,30,14,18,26,8,16,36]);
    add("Lost Sales", lostRows, [14,30,14,22,24,20,30,24,26,8,12,14,30,40]);
  }

  const period = `${range.from}_to_${range.to}`;
  const filenameBase = `toyota-crm-${type}-${period}`;

  if (format === "csv") {
    const firstSheetName = workbook.SheetNames[0];
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filenameBase}.csv"` } });
  }

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
    },
  });
}
