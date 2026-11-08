"use client";

import { useActionState, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { saveTarget } from "@/app/actions/settings";
import { initialActionState } from "@/lib/actions-helpers";
import { MONTH_NAMES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import type { MonthlyTarget } from "@/types/database";

export function TargetsManager({
  targets,
  initialYear,
  initialMonth,
}: {
  targets: MonthlyTarget[];
  initialYear: number;
  initialMonth: number;
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [state, formAction, pending] = useActionState(saveTarget, initialActionState);

  const own = targets.find(
    (row) => row.owner_id !== null && row.year === year && row.month === month,
  );
  const global = targets.find(
    (row) => row.owner_id === null && row.year === year && row.month === month,
  );
  const effective = own ?? global;
  const years = Array.from(new Set([initialYear - 1, initialYear, initialYear + 1, ...targets.map((row) => row.year)])).sort((a, b) => a - b);

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>Monthly targets</CardTitle>
          <CardDescription>
            Targets drive dashboard progress and report percentages. Your own
            target overrides the workbook default for the same month.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="target-year">Year</Label>
              <Select
                id="target-year"
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="h-8"
              >
                {years.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="target-month">Month</Label>
              <Select
                id="target-month"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="h-8"
              >
                {MONTH_NAMES.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <form action={formAction} key={`${year}-${month}`} className="space-y-3">
            <input type="hidden" name="year" value={year} />
            <input type="hidden" name="month" value={month} />
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="sales_target">Sales target</Label>
                <Input
                  id="sales_target"
                  name="sales_target"
                  type="number"
                  min={0}
                  defaultValue={effective?.sales_target ?? 0}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="financing_target">Financing target</Label>
                <Input
                  id="financing_target"
                  name="financing_target"
                  type="number"
                  min={0}
                  defaultValue={effective?.financing_target ?? 0}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tfs_target">TFS target</Label>
                <Input
                  id="tfs_target"
                  name="tfs_target"
                  type="number"
                  min={0}
                  defaultValue={effective?.tfs_target ?? 0}
                  className="h-8"
                />
              </div>
            </div>
            {state.error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                {state.error}
              </p>
            ) : null}
            {state.ok && state.message ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
                {state.message}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                {own
                  ? "Editing your own target for this month."
                  : global
                    ? "No personal target yet. Saving will create one that overrides the workbook default shown here."
                    : "No target exists for this month yet. Saving creates one."}
              </p>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Save />}
                Save target
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Financing</TableHead>
              <TableHead className="text-right">TFS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {targets.length ? (
              targets.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {MONTH_NAMES[row.month - 1]} {row.year}
                  </TableCell>
                  <TableCell>
                    <Badge tone={row.owner_id ? "green" : "neutral"}>
                      {row.owner_id ? "Personal" : "Workbook"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.sales_target)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.financing_target)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.tfs_target)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  No targets configured yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
