import Link from "next/link";
import type { Metadata } from "next";
import { Landmark, Plus, SearchX } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar, SearchField } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { FinancingBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listFinancing } from "@/lib/data/records";
import { getOptions, optionLabels } from "@/lib/data/options";
import {
  FINANCING_STATUS_FALLBACK,
  OPTION_CATEGORIES,
} from "@/lib/constants";
import { formatApprovedDp, formatDate, pluralize } from "@/lib/format";

export const metadata: Metadata = { title: "Financing" };

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function FinancingPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const filters = {
    q: one(params.q),
    status: one(params.status),
    bank: one(params.bank),
    page: Number(one(params.page)) || 1,
  };
  const [result, options] = await Promise.all([
    listFinancing(filters),
    getOptions(),
  ]);
  const statuses = optionLabels(options, OPTION_CATEGORIES.financingStatus);
  const banks = optionLabels(options, OPTION_CATEGORIES.financingBank);
  const hasFilters = Boolean(filters.q || filters.status || filters.bank);

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="CRM"
        title="Financing"
        description={`${result.count} ${pluralize(result.count, "application")} tracked from submission to approval and release.`}
        actions={
          <Button asChild size="sm">
            <Link href="/financing/new">
              <Plus /> New application
            </Link>
          </Button>
        }
      />

      <FilterBar>
        <SearchField
          defaultValue={filters.q}
          placeholder="Search application, bank, model, or prospect…"
        />
        <Select name="status" defaultValue={filters.status ?? ""} className="h-8 w-auto min-w-36">
          <option value="">All statuses</option>
          <option value="pending">Pending / in progress</option>
          {(statuses.length ? statuses : FINANCING_STATUS_FALLBACK).map((status) => (
            <option key={status} value={status}>
              {status}
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
        <Button type="submit" size="sm" variant="outline">
          Apply
        </Button>
        {hasFilters ? (
          <Button asChild size="sm" variant="ghost">
            <Link href="/financing">
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
                <TableHead>Application</TableHead>
                <TableHead>Prospect</TableHead>
                <TableHead>Bank / model</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>Released</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/financing/${row.id}/edit`} className="block hover:underline">
                      <span className="block text-[12px] font-medium">
                        {row.financing_code}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        Submitted {formatDate(row.date_submitted)}
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
                    <span className="block">{row.bank || "—"}</span>
                    <span className="block max-w-[220px] truncate text-[10px] text-muted-foreground">
                      {row.preferred_model || "No model"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <FinancingBadge status={row.application_status} />
                  </TableCell>
                  <TableCell>
                    <span className="block">{formatDate(row.date_approval)}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      DP {formatApprovedDp(row.approved_dp)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(row.date_released)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            basePath="/financing"
            params={params}
            page={result.page}
            pageSize={result.pageSize}
            total={result.count}
          />
        </>
      ) : (
        <EmptyState
          icon={hasFilters ? SearchX : Landmark}
          title={hasFilters ? "No applications match those filters" : "No financing applications yet"}
          description={
            hasFilters
              ? "Try a different status, bank, or search term."
              : "Track bank submissions, approvals, and TFS releases from the same place as the prospect."
          }
          action={
            <Button asChild size="sm">
              <Link href="/financing/new">
                <Plus /> New application
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
