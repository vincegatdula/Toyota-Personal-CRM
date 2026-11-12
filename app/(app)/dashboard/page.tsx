import Link from "next/link";
import type { Metadata } from "next";
import {
  CalendarCheck2,
  Car,
  CheckCircle2,
  Clock,
  FileText,
  Landmark,
  ListChecks,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ProgressBar } from "@/components/shared/progress-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardBrand } from "@/components/dashboard/dashboard-brand";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PipelineBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DonutChart, MonthlyChart, RankedBars } from "@/components/dashboard/charts";
import { getDashboardData } from "@/lib/data/dashboard";
import { getFollowUps } from "@/lib/data/leads";
import { completeFollowUp } from "@/app/actions/leads";
import { currentPeriod, normalizePeriod } from "@/lib/dates";
import { dateRangeFromPeriod, parseDateRangeParams, periodFromDateRange, resolveDateRange } from "@/lib/date-range";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { MONTH_NAMES as MONTHS } from "@/lib/constants";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; from?: string; to?: string; range?: string }>;
}) {
  const params = await searchParams;
  const now = currentPeriod();
  const parsedRange = parseDateRangeParams(params as Record<string, string | string[] | undefined>);
  const resolvedRange = resolveDateRange(parsedRange);

  let year: number;
  let month: number;
  if (resolvedRange.from || resolvedRange.to || resolvedRange.preset === "all_time") {
    const anchor = periodFromDateRange(resolvedRange);
    year = anchor.year;
    month = anchor.month;
  } else {
    const p = normalizePeriod(Number(params.year), Number(params.month));
    year = p.year;
    month = p.month;
  }
  const periodRange = dateRangeFromPeriod(year, month);
  const effectiveRange = resolvedRange.from || resolvedRange.to ? resolvedRange : periodRange;

  const [data, followUps] = await Promise.all([
    getDashboardData(year, month, effectiveRange),
    getFollowUps(),
  ]);
  const k = data.kpis;
  const followUpGroups = [
    { key: "overdue", label: "Overdue", items: followUps.overdue, tone: "text-red-700" },
    { key: "today", label: "Due today", items: followUps.dueToday, tone: "text-amber-700" },
    { key: "upcoming", label: "Next 7 days", items: followUps.upcoming, tone: "text-stone-600" },
  ];
  const years = Array.from({ length: 4 }, (_, index) => now.year - 1 + index);

  const rangeLabel = resolvedRange.from || resolvedRange.to
    ? `${effectiveRange.from ?? "…"} to ${effectiveRange.to ?? "…"}`
    : `${MONTHS[month - 1]} ${year}`;

  return (
    <div className="page-container min-w-0 overflow-x-hidden">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          eyebrow="Workspace"
          title={`Good day${data.profileName ? `, ${data.profileName.split(" ")[0]}` : ""}`}
          description={`${rangeLabel} performance at a glance. ${data.remainingWorkingDays} working day${data.remainingWorkingDays === 1 ? "" : "s"} remaining in ${MONTHS[month - 1]} ${year}.`}
          className="mb-0 min-w-0 flex-1"
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
              <DashboardBrand />
              <form method="get" className="flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-end">
                <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
                  <span>Month</span>
                  <select
                    name="month"
                    defaultValue={month}
                    className="h-8 rounded-lg border border-input bg-card px-2 text-[12px]"
                  >
                    {MONTHS.map((label, index) => (
                      <option key={label} value={index + 1}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
                  <span>Year</span>
                  <select
                    name="year"
                    defaultValue={year}
                    className="h-8 rounded-lg border border-input bg-card px-2 text-[12px]"
                  >
                    {years.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <DateRangeFilter from={resolvedRange.from} to={resolvedRange.to} preset={resolvedRange.preset} />
                <div className="flex items-center gap-1.5">
                  <Button type="submit" size="sm" variant="outline">Apply</Button>
                  <Button asChild type="button" size="sm" variant="ghost">
                    <Link href="/dashboard">Reset</Link>
                  </Button>
                </div>
              </form>
              <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                <Link href={`/reports?year=${year}&month=${month}${resolvedRange.from ? `&from=${resolvedRange.from}` : ""}${resolvedRange.to ? `&to=${resolvedRange.to}` : ""}${resolvedRange.preset ? `&range=${resolvedRange.preset}` : ""}`}>
                  <FileText /> Reports
                </Link>
              </Button>
            </div>
          }
        />
      </div>

      <section className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Sales target" value={formatNumber(k.salesTarget)} hint={`${k.totalReleases} released · ${k.remainingToTarget} to go`} icon={Target} tone="brand" />
        <StatCard label="Closing ratio" value={formatPercent(k.closingRatio)} hint={`${k.prospectsCreated} prospects created`} icon={TrendingUp} tone={k.closingRatio >= 0.25 ? "positive" : "warning"} />
        <StatCard label="Financing releases" value={formatNumber(k.financingReleases)} hint={`Target ${k.financingTarget} · ${k.remainingFinancing} to go`} icon={Landmark} />
        <StatCard label="TFS releases" value={formatNumber(k.tfsReleases)} hint={`Target ${k.tfsTarget}`} icon={Car} tone={k.tfsReleases >= k.tfsTarget && k.tfsTarget > 0 ? "positive" : "default"} />
        <StatCard label="Lost sales" value={formatNumber(k.lostSales)} hint="Review reasons and recoverable cases" icon={TrendingDown} tone={k.lostSales > 0 ? "danger" : "positive"} />
        <StatCard label="Applications submitted" value={formatNumber(k.applicationsSubmitted)} hint="By submission date" icon={FileText} />
        <StatCard label="Approved applications" value={formatNumber(k.approvedApplications)} hint="By approval date" icon={CheckCircle2} tone="positive" />
        <StatCard label="Pending units" value={formatNumber(k.pendingUnits)} hint="Reservations awaiting unit" icon={Clock} tone={k.pendingUnits > 0 ? "warning" : "default"} />
        <StatCard label="Prospects created" value={formatNumber(k.prospectsCreated)} hint="For selected range" icon={Users} />
        <StatCard label="Follow-ups" value={formatNumber(followUps.overdue.length + followUps.dueToday.length)} hint={`${followUps.overdue.length} overdue · ${followUps.dueToday.length} due today`} icon={ListChecks} tone={followUps.overdue.length > 0 ? "danger" : "default"} />
      </section>

      <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle>Release progress</CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Targets from {data.targets.source === "user" ? "your saved settings" : data.targets.source === "workbook" ? "the workbook" : "no target set"}.
              </p>
            </div>
            <Badge tone={k.totalReleases >= k.salesTarget && k.salesTarget > 0 ? "green" : "amber"}>
              {formatPercent(k.salesTarget ? k.totalReleases / k.salesTarget : 0)}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.releaseProgress.map((row) => (
              <div key={row.metric} className="min-w-0">
                <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                  <span className="min-w-0 truncate font-medium">{row.metric}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {row.actual} / {row.target}{" "}
                    <span className={row.remarks === "Target Met" ? "font-medium text-emerald-700" : "font-medium text-amber-700"}>
                      · {row.remarks}
                    </span>
                  </span>
                </div>
                <ProgressBar value={row.pct * 100} tone={row.remarks === "Target Met" ? "success" : "warning"} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Follow-ups</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/prospects?followUp=overdue">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {followUpGroups.map((group) => (
              <div key={group.key}>
                <p className="mb-1 flex items-center justify-between text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {group.label}
                  <span className={group.tone}>{group.items.length}</span>
                </p>
                {group.items.length ? (
                  <div className="space-y-1">
                    {group.items.slice(0, 3).map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-2 py-1.5">
                        <Link href={`/prospects/${lead.id}`} className="min-w-0 flex-1 hover:underline">
                          <span className="block truncate text-[12px] font-medium">{lead.prospect_name}</span>
                          <span className="block truncate text-[10px] text-muted-foreground">
                            {lead.next_action || "Follow up"} · {formatDate(lead.next_action_due_date)}
                          </span>
                        </Link>
                        <form action={completeFollowUp}>
                          <input type="hidden" name="id" value={lead.id} />
                          <Button type="submit" size="icon-sm" variant="outline" aria-label="Mark follow-up complete">
                            <CheckCircle2 />
                          </Button>
                        </form>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Nothing here.</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>Six-month trend</CardTitle>
            <p className="text-[11px] text-muted-foreground">Prospects created vs. units released, with closing ratio.</p>
          </CardHeader>
          <CardContent className="min-w-0">
            <MonthlyChart data={data.charts.monthly} />
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Lead sources</CardTitle>
            <p className="text-[11px] text-muted-foreground">Prospects created in selected range.</p>
          </CardHeader>
          <CardContent>
            {data.charts.leadSources.length ? (
              <div className="flex flex-col items-center gap-2">
                <DonutChart data={data.charts.leadSources} height={180} />
                <div className="grid w-full grid-cols-2 gap-1">
                  {data.leadSourceSummary.filter((row) => row.count > 0).slice(0, 6).map((row, index) => (
                    <div key={row.label} className="flex min-w-0 items-center gap-1.5 text-[10px]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ["#d32f2f","#1c1917","#78716c","#0f766e","#b45309","#1d4ed8"][index % 6] }} />
                      <span className="truncate text-muted-foreground">{row.label}</span>
                      <span className="ml-auto font-medium tabular-nums">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="No prospects yet" description="Lead source distribution appears once prospects are added." className="border-0 bg-transparent py-6" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-3">
        <Card className="min-w-0">
          <CardHeader><CardTitle>Pipeline</CardTitle></CardHeader>
          <CardContent className="min-w-0">
            {data.charts.pipeline.length ? <RankedBars data={data.charts.pipeline} height={230} /> : <EmptyState title="Pipeline is empty" description="Add a prospect to see the distribution by status." className="border-0 bg-transparent py-6" />}
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader><CardTitle>Financing status</CardTitle></CardHeader>
          <CardContent className="min-w-0">
            {data.charts.financing.length ? <DonutChart data={data.charts.financing} height={230} /> : <EmptyState title="No applications yet" description="Financing applications will appear here." className="border-0 bg-transparent py-6" />}
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader><CardTitle>Lost-sale reasons</CardTitle></CardHeader>
          <CardContent className="min-w-0">
            {data.charts.lostReasons.length ? <RankedBars data={data.charts.lostReasons.slice(0, 6)} height={230} color="#b45309" /> : <EmptyState title="No lost sales" description="Loss reasons appear when a prospect is marked lost." className="border-0 bg-transparent py-6" />}
          </CardContent>
        </Card>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent releases</CardTitle>
            <Button asChild size="sm" variant="ghost"><Link href="/releases">View release log</Link></Button>
          </CardHeader>
          <CardContent className="min-w-0">
            {data.recentReleases.length ? (
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Bank</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentReleases.map((release) => (
                    <TableRow key={release.id}>
                      <TableCell>{formatDate(release.release_date)}</TableCell>
                      <TableCell className="font-medium">{release.release_code}</TableCell>
                      <TableCell className="max-w-[240px] truncate">{release.model_released || "—"}</TableCell>
                      <TableCell className="tabular-nums">{release.units_released}</TableCell>
                      <TableCell>{release.bank || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No releases in selected range" description="Releases recorded in the selected period will appear here." className="border-0 bg-transparent py-6" />
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader><CardTitle>Performance summary</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-secondary/60 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium">{data.performance.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{data.performance.status}</p>
              </div>
              <PipelineBadge status={data.performance.actual >= data.performance.target && data.performance.target > 0 ? "Vehicle Released" : "Contacted"} />
            </div>
            <dl className="space-y-1.5 text-[12px]">
              {[
                ["Target", data.performance.target],
                ["Actual releases", data.performance.actual],
                ["Prospects generated", data.performance.prospectsGenerated],
                ["Applications submitted", data.performance.applicationsSubmitted],
                ["Approved applications", data.performance.approvedApplications],
                ["Reserved prospects", data.performance.reservedProspects],
                ["Lost prospects", data.performance.lostProspects],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium tabular-nums">{formatNumber(Number(value))}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-1.5">
                <dt className="text-muted-foreground">Closing ratio</dt>
                <dd className="font-medium tabular-nums">{formatPercent(data.performance.closingRatio)}</dd>
              </div>
            </dl>
            <Button asChild size="sm" variant="outline" className="mt-3 w-full">
              <Link href={`/reports?year=${year}&month=${month}${resolvedRange.from ? `&from=${resolvedRange.from}` : ""}${resolvedRange.to ? `&to=${resolvedRange.to}` : ""}${resolvedRange.preset ? `&range=${resolvedRange.preset}` : ""}`}>
                <CalendarCheck2 /> Open monthly report
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
