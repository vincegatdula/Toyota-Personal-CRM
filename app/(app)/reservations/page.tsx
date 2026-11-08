import Link from "next/link";
import type { Metadata } from "next";
import { CalendarClock, Plus, SearchX } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar, SearchField } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ReservationBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listReservations } from "@/lib/data/records";
import { getOptions, optionLabels } from "@/lib/data/options";
import {
  OPTION_CATEGORIES,
  RESERVATION_STATUS_FALLBACK,
} from "@/lib/constants";
import { formatDate, pluralize } from "@/lib/format";
import { isOverdue } from "@/lib/dates";

export const metadata: Metadata = { title: "Reservations & Units" };

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const filters = {
    q: one(params.q),
    status: one(params.status),
    overdue: one(params.overdue),
    page: Number(one(params.page)) || 1,
  };
  const [result, options] = await Promise.all([
    listReservations(filters),
    getOptions(),
  ]);
  const statuses = optionLabels(options, OPTION_CATEGORIES.reservationStatus);
  const hasFilters = Boolean(filters.q || filters.status || filters.overdue);

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="CRM"
        title="Reservations & Units"
        description={`${result.count} ${pluralize(result.count, "reservation")} tracked through unit availability, documents, and release.`}
        actions={
          <Button asChild size="sm">
            <Link href="/reservations/new">
              <Plus /> New reservation
            </Link>
          </Button>
        }
      />

      <FilterBar>
        <SearchField
          defaultValue={filters.q}
          placeholder="Search reservation, model, channel, or prospect…"
        />
        <Select name="status" defaultValue={filters.status ?? ""} className="h-8 w-auto min-w-36">
          <option value="">All statuses</option>
          {(statuses.length ? statuses : RESERVATION_STATUS_FALLBACK).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-1.5 text-[12px]">
          <input
            type="checkbox"
            name="overdue"
            value="1"
            defaultChecked={filters.overdue === "1"}
          />
          Overdue expected release
        </label>
        <Button type="submit" size="sm" variant="outline">
          Apply
        </Button>
        {hasFilters ? (
          <Button asChild size="sm" variant="ghost">
            <Link href="/reservations">
              <SearchX /> Reset
            </Link>
          </Button>
        ) : null}
      </FilterBar>

      {result.rows.length ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reservation</TableHead>
                <TableHead>Prospect</TableHead>
                <TableHead>Model / channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expected release</TableHead>
                <TableHead>Next action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/reservations/${row.id}/edit`} className="block hover:underline">
                      <span className="block text-[12px] font-medium">
                        {row.reservation_code}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        Reserved {formatDate(row.reservation_date)}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/prospects/${row.lead_id}`} className="hover:underline">
                      {row.prospect_name}
                    </Link>
                    <span className="block text-[10px] text-muted-foreground">
                      {row.lead_code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="block max-w-[220px] truncate">
                      {row.reserved_model || "—"}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {row.sales_channel || "No channel"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ReservationBadge status={row.current_status} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        isOverdue(row.expected_release_date) &&
                        !["Released", "Cancelled"].includes(row.current_status)
                          ? "font-medium text-red-700"
                          : ""
                      }
                    >
                      {formatDate(row.expected_release_date)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="block max-w-[220px] truncate">
                      {row.next_action || "—"}
                    </span>
                    <span className="block max-w-[220px] truncate text-[10px] text-muted-foreground">
                      {row.last_customer_update || "No customer update"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            basePath="/reservations"
            params={params}
            page={result.page}
            pageSize={result.pageSize}
            total={result.count}
          />
        </>
      ) : (
        <EmptyState
          icon={hasFilters ? SearchX : CalendarClock}
          title={hasFilters ? "No reservations match those filters" : "No reservations yet"}
          description={
            hasFilters
              ? "Try a different status or clear the overdue filter."
              : "Track reserved units, expected release dates, and pending documents."
          }
          action={
            <Button asChild size="sm">
              <Link href="/reservations/new">
                <Plus /> New reservation
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
