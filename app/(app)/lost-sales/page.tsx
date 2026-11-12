import Link from "next/link";
import type { Metadata } from "next";
import { Plus, SearchX, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar, FilterField, SearchField } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RecoveryBadge } from "@/components/ui/status-badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getAuthContext } from "@/lib/auth";
import { listLostSales } from "@/lib/data/records";
import { getOptions, optionLabels } from "@/lib/data/options";
import { getProfileMap, listAssignableProfiles, profileLabel } from "@/lib/data/profiles";
import { parseDateRangeParams, resolveDateRange } from "@/lib/date-range";
import { LOST_SALE_REASON_FALLBACK, OPTION_CATEGORIES } from "@/lib/constants";
import { formatDate, pluralize } from "@/lib/format";
import { updateLostRecovery } from "@/app/actions/lost-sales";

export const metadata: Metadata = { title: "Lost Sales" };

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function LostSalesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const context = await getAuthContext();
  const isAdmin = context.isAdmin;
  const dateRange = resolveDateRange(parseDateRangeParams(params));
  const filters = {
    q: one(params.q),
    reason: one(params.reason),
    recovery: one(params.recovery),
    from: dateRange.from,
    to: dateRange.to,
    owner: isAdmin ? one(params.owner) : undefined,
    page: Number(one(params.page)) || 1,
  };
  const [result, options, owners, profileMap] = await Promise.all([
    listLostSales(filters),
    getOptions(),
    isAdmin ? listAssignableProfiles() : Promise.resolve([]),
    isAdmin ? getProfileMap() : Promise.resolve(new Map()),
  ]);
  const reasons = optionLabels(options, OPTION_CATEGORIES.lostSaleReason);
  const hasFilters = Boolean(filters.q || filters.reason || filters.recovery || dateRange.from || dateRange.to || filters.owner);
  const recoverableCount = result.rows.filter((row) => row.recoverable && row.recovery_status === "open").length;

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="CRM"
        title="Lost Sales"
        description={`${result.count} ${pluralize(result.count, "lost sale")} recorded. ${recoverableCount} recoverable ${recoverableCount === 1 ? "case is" : "cases are"} still open on this page.${isAdmin ? " Admins can view all users and filter by owner." : ""}`}
        actions={<Button asChild size="sm"><Link href="/lost-sales/new"><Plus /> Mark lost sale</Link></Button>}
      />

      <FilterBar>
        <SearchField defaultValue={filters.q} placeholder="Search reason, competitor, or prospect…" />
        <DateRangeFilter from={dateRange.from} to={dateRange.to} preset={dateRange.preset} />
        {isAdmin ? (
          <FilterField label="Owner"><Select name="owner" defaultValue={filters.owner ?? ""} className="h-10 w-full sm:min-w-40">
            <option value="">All owners</option>
            {owners.map((owner) => (<option key={owner.id} value={owner.id}>{profileLabel(owner, owner.id)}</option>))}
          </Select></FilterField>
        ) : null}
        <FilterField label="Reason"><Select name="reason" defaultValue={filters.reason ?? ""} className="h-10 w-full sm:min-w-40">
          <option value="">All reasons</option>
          {(reasons.length ? reasons : LOST_SALE_REASON_FALLBACK).map((reason) => (<option key={reason} value={reason}>{reason}</option>))}
        </Select></FilterField>
        <FilterField label="Recovery"><Select name="recovery" defaultValue={filters.recovery ?? ""} className="h-10 w-full sm:min-w-36">
          <option value="">All recovery states</option>
          <option value="open">Open</option>
          <option value="recovered">Recovered</option>
          <option value="closed">Closed</option>
        </Select></FilterField>
        <div className="flex w-full items-center gap-2 sm:w-auto sm:self-end">
          <Button type="submit" variant="outline" className="h-10">Apply</Button>
          {hasFilters ? <Button asChild variant="ghost" className="h-10"><Link href="/lost-sales"><SearchX /> Reset</Link></Button> : null}
        </div>
      </FilterBar>

      {result.rows.length ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lost sale</TableHead>
                <TableHead>Prospect</TableHead>
                {isAdmin ? <TableHead>Owner</TableHead> : null}
                <TableHead>Reason</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Recovery</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/lost-sales/${row.id}/edit`} className="block hover:underline">
                      <span className="block text-[12px] font-medium">{row.lost_code}</span>
                      <span className="block text-[10px] text-muted-foreground">{formatDate(row.date_marked_lost)}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/prospects/${row.lead_id}`} className="hover:underline">{row.prospect_name}</Link>
                    <span className="block text-[10px] text-muted-foreground">{row.lead_code}</span>
                  </TableCell>
                  {isAdmin ? <TableCell><Badge tone="neutral">{profileLabel(profileMap.get(row.owner_id), row.owner_id)}</Badge></TableCell> : null}
                  <TableCell className="max-w-[240px] truncate">
                    {row.primary_loss_reason || "—"}
                    {row.competitor_alternative ? <span className="block text-[10px] text-muted-foreground">vs. {row.competitor_alternative}</span> : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.pipeline_stage_when_lost || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <RecoveryBadge status={row.recovery_status} />
                      {row.recoverable ? <Badge tone="amber">Recoverable</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{row.estimated_units_lost}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {row.recovery_status === "open" ? (
                        <>
                          <form action={updateLostRecovery}>
                            <input type="hidden" name="id" value={row.id} />
                            <input type="hidden" name="recovery_status" value="recovered" />
                            <Button type="submit" size="sm" variant="outline">Recover</Button>
                          </form>
                          <form action={updateLostRecovery}>
                            <input type="hidden" name="id" value={row.id} />
                            <input type="hidden" name="recovery_status" value="closed" />
                            <Button type="submit" size="sm" variant="ghost">Close</Button>
                          </form>
                        </>
                      ) : (
                        <Link href={`/lost-sales/${row.id}/edit`} className="text-[11px] text-muted-foreground hover:underline">View</Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination basePath="/lost-sales" params={params} page={result.page} pageSize={result.pageSize} total={result.count} />
        </>
      ) : (
        <EmptyState
          icon={hasFilters ? SearchX : TrendingDown}
          title={hasFilters ? "No lost sales match those filters" : "No lost sales recorded"}
          description={hasFilters ? "Try a different reason, recovery state, or date range." : "Recording losses is how the reasons and coaching opportunities become visible."}
          action={<Button asChild size="sm"><Link href="/lost-sales/new"><Plus /> Mark lost sale</Link></Button>}
        />
      )}
    </div>
  );
}
