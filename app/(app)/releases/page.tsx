import Link from "next/link";
import type { Metadata } from "next";
import { Car, Plus, SearchX } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar, SearchField } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listReleases } from "@/lib/data/records";
import { getOptions, optionLabels } from "@/lib/data/options";
import {
  OPTION_CATEGORIES,
  TRANSACTION_FALLBACK,
} from "@/lib/constants";
import { formatDate, pluralize } from "@/lib/format";

export const metadata: Metadata = { title: "Vehicle Releases" };

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function ReleasesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const filters = {
    q: one(params.q),
    transaction: one(params.transaction),
    bank: one(params.bank),
    from: one(params.from),
    to: one(params.to),
    page: Number(one(params.page)) || 1,
  };
  const [result, options] = await Promise.all([
    listReleases(filters),
    getOptions(),
  ]);
  const transactions = optionLabels(options, OPTION_CATEGORIES.transactionType);
  const banks = optionLabels(options, OPTION_CATEGORIES.financingBank);
  const hasFilters = Boolean(
    filters.q || filters.transaction || filters.bank || filters.from || filters.to,
  );

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="CRM"
        title="Vehicle Releases"
        description={`${result.count} ${pluralize(result.count, "release")} in the log. Releases drive sales targets and the closing ratio.`}
        actions={
          <Button asChild size="sm">
            <Link href="/releases/new">
              <Plus /> Record release
            </Link>
          </Button>
        }
      />

      <FilterBar>
        <SearchField
          defaultValue={filters.q}
          placeholder="Search release, model, bank, or prospect…"
        />
        <Select name="transaction" defaultValue={filters.transaction ?? ""} className="h-8 w-auto min-w-32">
          <option value="">All transactions</option>
          {(transactions.length ? transactions : TRANSACTION_FALLBACK).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Select name="bank" defaultValue={filters.bank ?? ""} className="h-8 w-auto min-w-32">
          <option value="">All banks</option>
          {banks.map((bank) => (
            <option key={bank} value={bank}>
              {bank}
            </option>
          ))}
        </Select>
        <input
          type="date"
          name="from"
          defaultValue={filters.from ?? ""}
          className="h-8 rounded-lg border border-input bg-card px-2 text-[12px]"
          aria-label="From date"
        />
        <input
          type="date"
          name="to"
          defaultValue={filters.to ?? ""}
          className="h-8 rounded-lg border border-input bg-card px-2 text-[12px]"
          aria-label="To date"
        />
        <Button type="submit" size="sm" variant="outline">
          Apply
        </Button>
        {hasFilters ? (
          <Button asChild size="sm" variant="ghost">
            <Link href="/releases">
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
                <TableHead>Release</TableHead>
                <TableHead>Prospect</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Transaction / bank</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/releases/${row.id}/edit`} className="block hover:underline">
                      <span className="block text-[12px] font-medium">
                        {row.release_code}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {formatDate(row.release_date)}
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
                  <TableCell className="max-w-[240px] truncate">
                    {row.model_released || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge tone="green">{row.units_released}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="block">{row.transaction || "—"}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {row.bank || "No bank"}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate text-[11px] text-muted-foreground">
                    {row.remarks || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            basePath="/releases"
            params={params}
            page={result.page}
            pageSize={result.pageSize}
            total={result.count}
          />
        </>
      ) : (
        <EmptyState
          icon={hasFilters ? SearchX : Car}
          title={hasFilters ? "No releases match those filters" : "No vehicle releases yet"}
          description={
            hasFilters
              ? "Try a different date range, transaction, or search term."
              : "Record a release to count it toward the sales target and closing ratio."
          }
          action={
            <Button asChild size="sm">
              <Link href="/releases/new">
                <Plus /> Record release
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
