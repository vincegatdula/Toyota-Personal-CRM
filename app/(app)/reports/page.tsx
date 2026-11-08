import Link from "next/link";
import type { Metadata } from "next";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MonthlyChart } from "@/components/dashboard/charts";
import { getDashboardData } from "@/lib/data/dashboard";
import { currentPeriod, normalizePeriod } from "@/lib/dates";
import { MONTH_NAMES } from "@/lib/constants";
import { formatNumber, formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = currentPeriod();
  const { year, month } = normalizePeriod(
    Number(params.year),
    Number(params.month),
  );
  const data = await getDashboardData(year, month);
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const exportHref = (type: string, format: "csv" | "xlsx") =>
    `/api/export?type=${type}&format=${format}&year=${year}&month=${month}`;

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Analytics"
        title={`${MONTH_NAMES[month - 1]} ${year} report`}
        description="Monthly performance, lead-source mix, loss reasons, and a detailed release breakdown."
        actions={
          <>
            <form method="get" className="flex items-center gap-1.5">
              <select
                name="month"
                defaultValue={month}
                className="h-8 rounded-lg border border-input bg-card px-2 text-[12px]"
              >
                {MONTH_NAMES.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                name="year"
                defaultValue={year}
                className="h-8 rounded-lg border border-input bg-card px-2 text-[12px]"
              >
                {Array.from({ length: 4 }, (_, index) => now.year - 1 + index).map(
                  (value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ),
                )}
              </select>
              <Button type="submit" size="sm" variant="outline">
                View
              </Button>
            </form>
            <Button asChild size="sm" variant="outline">
              <a href={exportHref("report", "xlsx")}>
                <FileSpreadsheet /> Excel
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={exportHref("report", "csv")}>
                <Download /> CSV
              </a>
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Target" value={formatNumber(data.kpis.salesTarget)} hint="Sales units" tone="brand" />
        <StatCard label="Releases" value={formatNumber(data.kpis.totalReleases)} hint={`${formatNumber(data.kpis.remainingToTarget)} remaining`} tone="positive" />
        <StatCard label="Closing ratio" value={formatPercent(data.kpis.closingRatio)} hint="Releases ÷ prospects" />
        <StatCard label="Financing" value={formatNumber(data.kpis.financingReleases)} hint={`Target ${data.kpis.financingTarget}`} />
        <StatCard label="TFS" value={formatNumber(data.kpis.tfsReleases)} hint={`Target ${data.kpis.tfsTarget}`} />
        <StatCard label="Lost sales" value={formatNumber(data.kpis.lostSales)} hint="Recorded losses" tone={data.kpis.lostSales ? "danger" : "positive"} />
      </section>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Six-month trend</CardTitle>
            <CardDescription>
              Prospects created, units released, and closing ratio for the six
              months ending {MONTH_NAMES[month - 1]} {year}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyChart data={data.charts.monthly} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Release progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="min-w-0">
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.releaseProgress.map((row) => (
                  <TableRow key={row.metric}>
                    <TableCell className="whitespace-normal">{row.metric}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.actual}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.target}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(row.pct)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead source performance</CardTitle>
            <CardDescription>
              Prospects created in {MONTH_NAMES[month - 1]} by source.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table className="min-w-0">
              <TableHeader>
                <TableRow>
                  <TableHead>Lead source</TableHead>
                  <TableHead className="text-right">Prospects</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.leadSourceSummary.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="whitespace-normal">{row.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(
                        data.kpis.prospectsCreated
                          ? row.count / data.kpis.prospectsCreated
                          : 0,
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lost-sale reasons</CardTitle>
            <CardDescription>
              Why prospects were lost in {MONTH_NAMES[month - 1]}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table className="min-w-0">
              <TableHeader>
                <TableRow>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lostReasonSummary.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="whitespace-normal">{row.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(
                        data.kpis.lostSales ? row.count / data.kpis.lostSales : 0,
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-3">
        <CardHeader>
          <CardTitle>Download module data</CardTitle>
          <CardDescription>
            Exports are scoped to {MONTH_NAMES[month - 1]} {year} by the
            module&apos;s own date column.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["leads", "Prospects"],
            ["financing", "Financing"],
            ["reservations", "Reservations"],
            ["releases", "Releases"],
            ["lost-sales", "Lost sales"],
          ].map(([type, label]) => (
            <div
              key={type}
              className="rounded-lg border border-border p-3"
            >
              <p className="mb-2 text-[12px] font-medium">{label}</p>
              <div className="flex gap-1.5">
                <Button asChild size="sm" variant="outline">
                  <a href={exportHref(type, "xlsx")}>Excel</a>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <a href={exportHref(type, "csv")}>CSV</a>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Printer className="h-3.5 w-3.5" />
          Tip: use your browser&apos;s print dialog to save this report as PDF.
        </div>
        <div className="flex items-center gap-1.5">
          <Badge tone={data.targets.source === "none" ? "amber" : "neutral"}>
            Target source: {data.targets.source}
          </Badge>
          <Link
            href={`/dashboard?year=${year}&month=${month}`}
            className="text-[11px] text-muted-foreground hover:underline"
          >
            Open dashboard
          </Link>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        Report period {period} · Generated by Personal Toyota CRM
      </p>
    </div>
  );
}
