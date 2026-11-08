import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  getDaysInMonth,
  isValid,
  parseISO,
  startOfMonth,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

const DEFAULT_TIMEZONE = "Asia/Manila";

export function isValidTimeZone(timeZone: string | null | undefined): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

const configuredTimeZone = process.env.NEXT_PUBLIC_APP_TIMEZONE?.trim();

export const APP_TIMEZONE =
  configuredTimeZone && isValidTimeZone(configuredTimeZone)
    ? configuredTimeZone
    : DEFAULT_TIMEZONE;

export function toValidDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === "number") {
    const date = new Date(value);
    return isValid(date) ? date : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const datePrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s]|$)/);
  if (datePrefix) {
    const dateOnly = parseISO(datePrefix[1]);
    if (!isValid(dateOnly) || format(dateOnly, "yyyy-MM-dd") !== datePrefix[1]) {
      return null;
    }
  }
  const iso = parseISO(trimmed);
  if (isValid(iso)) return iso;
  const parsed = new Date(trimmed);
  return isValid(parsed) ? parsed : null;
}

export function normalizePeriod(year: number, month: number) {
  const fallback = currentPeriod();
  return {
    year:
      Number.isFinite(year) && year >= 2000 && year <= 2100
        ? Math.trunc(year)
        : fallback.year,
    month:
      Number.isFinite(month) && month >= 1 && month <= 12
        ? Math.trunc(month)
        : fallback.month,
  };
}

/** Current wall-clock date in the CRM timezone. */
export function nowInAppTz(): Date {
  return toZonedTime(new Date(), APP_TIMEZONE);
}

/** Today's date as YYYY-MM-DD in the CRM timezone. */
export function todayISO(): string {
  return formatInTimeZone(new Date(), APP_TIMEZONE, "yyyy-MM-dd");
}

/** Format a Date as YYYY-MM-DD without converting to UTC. */
export function toISODate(value: string | number | Date | null | undefined): string {
  const date = toValidDate(value);
  return date ? format(date, "yyyy-MM-dd") : "";
}

export function toDateOnly(value: string | Date | null | undefined): string | null {
  const date = toValidDate(value);
  return date ? format(date, "yyyy-MM-dd") : null;
}

export function monthRange(year: number, month: number) {
  const period = normalizePeriod(year, month);
  const start = new Date(period.year, period.month - 1, 1);
  const end = endOfMonth(start);
  return { start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd") };
}

export function currentPeriod() {
  const now = nowInAppTz();
  if (!isValid(now)) {
    const fallback = new Date();
    return { year: fallback.getFullYear(), month: fallback.getMonth() + 1 };
  }
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function periodLabel(year: number, month: number) {
  const period = normalizePeriod(year, month);
  return format(new Date(period.year, period.month - 1, 1), "MMMM yyyy");
}

/**
 * Replicates the workbook's NETWORKDAYS.INTL(..., "0000001") behaviour:
 * Monday-Saturday are working days, Sunday is the only weekend day.
 * For the current month, counting starts today (inclusive). For a future
 * month it counts the whole month; a past month returns 0.
 */
export function remainingWorkingDays(year: number, month: number): number {
  const period = normalizePeriod(year, month);
  const today = nowInAppTz();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const monthStart = new Date(period.year, period.month - 1, 1);
  const monthEnd = endOfMonth(monthStart);

  let from: Date;
  if (monthStart > todayStart) {
    from = monthStart;
  } else if (monthEnd < todayStart) {
    return 0;
  } else {
    from = todayStart;
  }

  let count = 0;
  let cursor = from;
  while (cursor <= monthEnd) {
    if (cursor.getDay() !== 0) count += 1;
    cursor = addDays(cursor, 1);
  }
  return count;
}

export function daysInMonth(year: number, month: number) {
  const period = normalizePeriod(year, month);
  return getDaysInMonth(new Date(period.year, period.month - 1, 1));
}

export function isOverdue(dateStr: string | null | undefined): boolean {
  const date = toValidDate(dateStr);
  return date ? format(date, "yyyy-MM-dd") < todayISO() : false;
}

export function isToday(dateStr: string | null | undefined): boolean {
  const date = toValidDate(dateStr);
  return date ? format(date, "yyyy-MM-dd") === todayISO() : false;
}

export function isUpcoming(dateStr: string | null | undefined, days = 7): boolean {
  const date = toValidDate(dateStr);
  const today = toValidDate(todayISO());
  if (!date || !today) return false;
  if (format(date, "yyyy-MM-dd") <= format(today, "yyyy-MM-dd")) return false;
  const diff = differenceInCalendarDays(date, today);
  return diff <= days;
}

export function startOfMonthISO(year: number, month: number) {
  const period = normalizePeriod(year, month);
  return format(
    startOfMonth(new Date(period.year, period.month - 1, 1)),
    "yyyy-MM-dd",
  );
}

export function nowLocalInput(): string {
  return formatInTimeZone(new Date(), APP_TIMEZONE, "yyyy-MM-dd'T'HH:mm");
}

export function nowISOString() {
  return new Date().toISOString();
}

/**
 * Convert a datetime-local value (interpreted as Asia/Manila wall time) into an
 * ISO timestamp. Values that already contain an offset are respected.
 */
export function manilaTimestamp(input: string): string {
  const value = input.trim();
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)) {
    const parsed = toValidDate(value);
    return parsed ? parsed.toISOString() : new Date().toISOString();
  }
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  const parsed = fromZonedTime(withSeconds, APP_TIMEZONE);
  return isValid(parsed) ? parsed.toISOString() : new Date().toISOString();
}

export function dateOnlyToNoonISOString(
  value: string | Date | null | undefined,
): string | null {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return null;
  const parsed = fromZonedTime(`${dateOnly}T12:00:00`, APP_TIMEZONE);
  return isValid(parsed) ? parsed.toISOString() : null;
}
