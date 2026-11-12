import { endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek, startOfYear, subMonths } from "date-fns";
import { currentPeriod, monthRange, normalizePeriod, nowInAppTz, toISODate } from "@/lib/dates";

export type DateRangePreset = "today" | "this_week" | "this_month" | "last_month" | "this_year" | "all_time" | "custom";

export interface DateRange {
  from?: string;
  to?: string;
  preset?: DateRangePreset;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeISO(value: string | string[] | undefined | null): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!ISO_RE.test(trimmed)) return undefined;
  const date = parseISO(trimmed);
  return toISODate(date) || undefined;
}

export function parseDateRangeParams(params: Record<string, string | string[] | undefined>): DateRange {
  const presetRaw = Array.isArray(params.range) ? params.range[0] : params.range;
  const preset = (["today", "this_week", "this_month", "last_month", "this_year", "all_time", "custom"] as const).includes(
    presetRaw as DateRangePreset,
  )
    ? (presetRaw as DateRangePreset)
    : undefined;
  let from = normalizeISO(params.from);
  let to = normalizeISO(params.to);
  if (from && to && from > to) {
    const tmp = from;
    from = to;
    to = tmp;
  }
  return { from, to, preset: preset ?? (from || to ? "custom" : undefined) };
}

export function resolvePresetRange(preset: DateRangePreset, now = nowInAppTz()): { from?: string; to?: string } {
  switch (preset) {
    case "today": {
      const d = format(now, "yyyy-MM-dd");
      return { from: d, to: d };
    }
    case "this_week": {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") };
    }
    case "this_month": {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") };
    }
    case "last_month": {
      const prev = subMonths(now, 1);
      return { from: format(startOfMonth(prev), "yyyy-MM-dd"), to: format(endOfMonth(prev), "yyyy-MM-dd") };
    }
    case "this_year": {
      return { from: format(startOfYear(now), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
    }
    case "all_time":
      return {};
    default:
      return {};
  }
}

export function resolveDateRange(range: DateRange): { from?: string; to?: string; preset?: DateRangePreset } {
  if (range.preset && range.preset !== "custom") {
    const presetRange = resolvePresetRange(range.preset);
    return { ...presetRange, preset: range.preset };
  }
  let { from, to } = range;
  if (from && to && from > to) {
    const tmp = from;
    from = to;
    to = tmp;
  }
  if (!from && !to) return { preset: undefined };
  return { from, to, preset: "custom" };
}

export function dateRangeFromPeriod(year: number, month: number): { from: string; to: string } {
  const p = normalizePeriod(year, month);
  const r = monthRange(p.year, p.month);
  return { from: r.start, to: r.end };
}

export function periodFromDateRange(range: DateRange): { year: number; month: number } {
  const now = currentPeriod();
  const resolved = resolveDateRange(range);
  const anchor = resolved.to || resolved.from || `${now.year}-${String(now.month).padStart(2, "0")}-01`;
  const date = parseISO(anchor);
  if (Number.isNaN(date.getTime())) return now;
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function isWithinDateRange(value: string | null | undefined, range: { from?: string; to?: string }) {
  if (!value) return false;
  const iso = toISODate(value) || value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  if (range.from && iso < range.from) return false;
  if (range.to && iso > range.to) return false;
  return true;
}

export function applyDateRange<T extends { gte: (c: string, v: string) => T; lte: (c: string, v: string) => T }>(
  query: T,
  column: string,
  range: { from?: string; to?: string },
): T {
  let q = query;
  if (range.from) q = q.gte(column, range.from);
  if (range.to) q = q.lte(column, range.to);
  return q;
}

export function dateRangeLabel(range: { from?: string; to?: string; preset?: DateRangePreset }) {
  const r = resolveDateRange(range);
  if (r.preset && r.preset !== "custom") {
    return {
      today: "Today",
      this_week: "This Week",
      this_month: "This Month",
      last_month: "Last Month",
      this_year: "This Year",
      all_time: "All Time",
      custom: "Custom",
    }[r.preset];
  }
  if (r.from && r.to) return `${r.from} to ${r.to}`;
  if (r.from) return `From ${r.from}`;
  if (r.to) return `Until ${r.to}`;
  return "All Time";
}

export function mergeSearchParams(
  params: Record<string, string | string[] | undefined>,
  updates: Record<string, string | undefined>,
) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page") continue;
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value[0]) sp.set(key, value[0]);
    } else if (value !== "") {
      sp.set(key, value);
    }
  }
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === "") sp.delete(key);
    else sp.set(key, value);
  }
  return sp.toString();
}

export function normalizedDateRangeForInput(range: DateRange) {
  const resolved = resolveDateRange(range);
  return { from: resolved.from ?? "", to: resolved.to ?? "", preset: resolved.preset ?? "" };
}

export function sixMonthTrendEnd(range: DateRange, fallbackYear: number, fallbackMonth: number) {
  const resolved = resolveDateRange(range);
  const anchor = resolved.to || resolved.from;
  if (anchor) {
    const d = parseISO(anchor);
    if (!Number.isNaN(d.getTime())) return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }
  const p = normalizePeriod(fallbackYear, fallbackMonth);
  return { year: p.year, month: p.month };
}
