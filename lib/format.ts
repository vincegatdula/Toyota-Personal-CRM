import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { APP_TIMEZONE, toValidDate } from "@/lib/dates";

export const DATE_FALLBACK = "—";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return peso.format(value);
}

export function formatNumber(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "0%";
  return `${(value * 100).toFixed(digits)}%`;
}

export function safeFormatDate(
  value: string | number | Date | null | undefined,
  pattern: string,
  fallback = DATE_FALLBACK,
) {
  const date = toValidDate(value);
  if (!date) return fallback;
  try {
    return format(date, pattern);
  } catch {
    return fallback;
  }
}

export function safeFormatDateTime(
  value: string | number | Date | null | undefined,
  pattern = "MMM d, yyyy h:mm a",
  fallback = DATE_FALLBACK,
) {
  const date = toValidDate(value);
  if (!date) return fallback;
  try {
    return formatInTimeZone(date, APP_TIMEZONE, pattern);
  } catch {
    return fallback;
  }
}

export function formatDate(value: string | Date | null | undefined) {
  return safeFormatDate(value, "MMM d, yyyy");
}

export function formatDateShort(value: string | Date | null | undefined) {
  return safeFormatDate(value, "MMM d");
}

export function formatDateTime(value: string | Date | null | undefined) {
  return safeFormatDateTime(value);
}

/**
 * The workbook stores approved DP as a rate (0.2 = 20%). Newer entries may
 * store an amount. Values between 0 and 1 are treated as a rate.
 */
export function formatApprovedDp(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (value > 0 && value <= 1) return formatPercent(value, 2);
  return formatCurrency(value);
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : plural || `${singular}s`;
}
