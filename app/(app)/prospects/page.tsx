import Link from "next/link";
import type { Metadata } from "next";
import { Archive, ArchiveRestore, Plus, SearchX, UserRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar, SearchField } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { PipelineBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAuthContext } from "@/lib/auth";
import { listLeads } from "@/lib/data/leads";
import { getOptions, optionLabels } from "@/lib/data/options";
import { getProfileMap, listAssignableProfiles, profileLabel } from "@/lib/data/profiles";
import { parseDateRangeParams, resolveDateRange } from "@/lib/date-range";
import {
  LEAD_SOURCE_FALLBACK,
  OPTION_CATEGORIES,
  PIPELINE_STATUS_FALLBACK,
  TRANSACTION_FALLBACK,
} from "@/lib/constants";
import { formatDate, pluralize } from "@/lib/format";
import { isOverdue } from "@/lib/dates";

export const metadata: Metadata = { title: "Prospects" };

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const context = await getAuthContext();
  const isAdmin = context.isAdmin;
  const archived = one(params.archived) === "1";
  const dateRange = resolveDateRange(parseDateRangeParams(params));
  const filters = {
    q: one(params.q),
    source: one(params.source),
    model: one(params.model),
    transaction: one(params.transaction),
    status: one(params.status),
    timeline: one(params.timeline),
    followUp: one(params.followUp),
    from: dateRange.from,
    to: dateRange.to,
    owner: isAdmin ? one(params.owner) : undefined,
    sort: one(params.sort),
    archived: archived ? "1" : undefined,
    page: Number(one(params.page)) || 1,
    pageSize: 25,
  };

  const [result, options, owners, profileMap] = await Promise.all([
    listLeads(filters),
    getOptions(),
    isAdmin ? listAssignableProfiles() : Promise.resolve([]),
    isAdmin ? getProfileMap() : Promise.resolve(new Map()),
  ]);

  const sources = optionLabels(options, OPTION_CATEGORIES.leadSource);
  const statuses = optionLabels(options, OPTION_CATEGORIES.pipelineStatus);
  const transactions = optionLabels(options, OPTION_CATEGORIES.transactionType);
  const activeFilters = [filters.q, filters.source, filters.status, filters.followUp, filters.timeline, filters.owner, dateRange.from, dateRange.to].filter(Boolean).length;
  const resetHref = archived ? "/prospects?archived=1" : "/prospects";

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="CRM"
        title={archived ? "Archived prospects" : "Prospects"}
        description={`${result.count} ${pluralize(result.count, "prospect")}${activeFilters ? " matching your filters" : ""}.${isAdmin ? " Admins can view all users and filter by owner." : " Keep follow-ups current and every conversation recorded."}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={archived ? "/prospects" : "/prospects?archived=1"}>
                {archived ? <ArchiveRestore /> : <Archive />}
                {archived ? "Active prospects" : "Archived"}
              </Link>
            </Button>
            <Button asChild size="sm"><Link href="/prospects/new"><Plus /> New prospect</Link></Button>
          </>
        }
      />

      <FilterBar>
        {archived ? <input type="hidden" name="archived" value="1" /> : null}
        <SearchField defaultValue={filters.q} placeholder="Search name, code, number, email, or model…" />
        <DateRangeFilter from={dateRange.from} to={dateRange.to} preset={dateRange.preset} />
        {isAdmin ? (
          <Select name="owner" defaultValue={filters.owner ?? ""} className="h-8 w-auto min-w-36">
            <option value="">All owners</option>
            {owners.map((owner) => (<option key={owner.id} value={owner.id}>{profileLabel(owner, owner.id)}</option>))}
          </Select>
        ) : null}
        <Select name="source" defaultValue={filters.source ?? ""} className="h-8 w-auto min-w-36">
          <option value="">All lead sources</option>
          {(sources.length ? sources : LEAD_SOURCE_FALLBACK).map((source) => (<option key={source} value={source}>{source}</option>))}
        </Select>
        <Select name="status" defaultValue={filters.status ?? ""} className="h-8 w-auto min-w-32">
          <option value="">All statuses</option>
          {(statuses.length ? statuses : PIPELINE_STATUS_FALLBACK).map((status) => (<option key={status} value={status}>{status}</option>))}
        </Select>
        <Select name="transaction" defaultValue={filters.transaction ?? ""} className="h-8 w-auto min-w-32">
          <option value="">All transactions</option>
          {(transactions.length ? transactions : TRANSACTION_FALLBACK).map((value) => (<option key={value} value={value}>{value}</option>))}
        </Select>
        <Select name="followUp" defaultValue={filters.followUp ?? ""} className="h-8 w-auto min-w-32">
          <option value="">Any follow-up</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due today</option>
          <option value="upcoming">Next 7 days</option>
        </Select>
        <Select name="sort" defaultValue={filters.sort ?? "newest"} className="h-8 w-auto min-w-32">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="next_action">Next action</option>
          <option value="name">Name A–Z</option>
        </Select>
        <div className="flex items-center gap-1.5">
          <Button type="submit" size="sm" variant="outline">Apply</Button>
          {activeFilters ? <Button asChild size="sm" variant="ghost"><Link href={resetHref}><SearchX /> Reset</Link></Button> : null}
        </div>
      </FilterBar>

      {result.rows.length ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prospect</TableHead>
                {isAdmin ? <TableHead>Owner</TableHead> : null}
                <TableHead>Model / transaction</TableHead>
                <TableHead>Lead source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next action</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Link href={`/prospects/${lead.id}`} className="group block">
                      <span className="block text-[13px] font-medium group-hover:underline">{lead.prospect_name}</span>
                      <span className="block text-[10px] text-muted-foreground">{lead.lead_code}{lead.contact_number ? ` · ${lead.contact_number}` : ""}</span>
                    </Link>
                  </TableCell>
                  {isAdmin ? <TableCell><Badge tone="neutral">{profileLabel(profileMap.get(lead.owner_id), lead.owner_id)}</Badge></TableCell> : null}
                  <TableCell>
                    <span className="block max-w-[220px] truncate">{lead.preferred_model || "—"}</span>
                    <span className="block text-[10px] text-muted-foreground">{lead.transaction || "No transaction set"}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lead.lead_source || "—"}</TableCell>
                  <TableCell><PipelineBadge status={lead.pipeline_status} /></TableCell>
                  <TableCell>
                    {lead.next_action ? (
                      <div>
                        <span className="block max-w-[220px] truncate">{lead.next_action}</span>
                        <span className={lead.next_action_completed_at ? "text-[10px] text-emerald-700" : isOverdue(lead.next_action_due_date) ? "text-[10px] font-medium text-red-700" : "text-[10px] text-muted-foreground"}>
                          {lead.next_action_completed_at ? "Completed" : formatDate(lead.next_action_due_date)}
                        </span>
                      </div>
                    ) : <span className="text-muted-foreground">No next action</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(lead.date_created)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination basePath="/prospects" params={params} page={result.page} pageSize={result.pageSize} total={result.count} />
        </>
      ) : (
        <EmptyState
          icon={activeFilters ? SearchX : UserRound}
          title={activeFilters ? "No prospects match those filters" : archived ? "No archived prospects" : "No prospects yet"}
          description={activeFilters ? "Try clearing one or more filters, or search for a different term." : "Create your first prospect or import the Excel workbook to bring in the existing pipeline."}
          action={<div className="flex gap-2"><Button asChild size="sm"><Link href="/prospects/new"><Plus /> New prospect</Link></Button>{!archived ? <Button asChild size="sm" variant="outline"><Link href="/import">Import workbook</Link></Button> : null}</div>}
        />
      )}
    </div>
  );
}
