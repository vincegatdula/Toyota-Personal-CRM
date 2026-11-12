import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { PipelineBoard } from "@/components/pipeline/board";
import { Button } from "@/components/ui/button";
import { getPipelineLeads } from "@/lib/data/leads";
import { getOptions, optionLabels } from "@/lib/data/options";
import { parseDateRangeParams, resolveDateRange } from "@/lib/date-range";
import {
  ACTIVE_PIPELINE_STATUSES,
  OPTION_CATEGORIES,
  PIPELINE_STATUS_FALLBACK,
} from "@/lib/constants";

export const metadata: Metadata = { title: "Pipeline" };

type Params = Record<string, string | string[] | undefined>;

export default async function PipelinePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const dateRange = resolveDateRange(parseDateRangeParams(params));
  const [leads, options] = await Promise.all([
    getPipelineLeads(dateRange),
    getOptions(),
  ]);
  const configured = optionLabels(options, OPTION_CATEGORIES.pipelineStatus);
  const base = configured.length ? configured : PIPELINE_STATUS_FALLBACK;
  const statuses = base.filter((status) => ACTIVE_PIPELINE_STATUSES.includes(status));
  const ordered = [...statuses, ...ACTIVE_PIPELINE_STATUSES.filter((status) => !statuses.includes(status))];

  return (
    <div className="page-container max-w-none">
      <PageHeader
        eyebrow="CRM"
        title="Pipeline"
        description={`${leads.length} active prospect${leads.length === 1 ? "" : "s"} across ${ordered.length} stages. Drag cards to update the stage instantly.`}
      />
      <FilterBar>
        <DateRangeFilter from={dateRange.from} to={dateRange.to} preset={dateRange.preset} />
        <div className="flex w-full items-center gap-2 sm:w-auto sm:self-end">
          <Button type="submit" variant="outline" className="h-10">Apply</Button>
          <Button asChild type="button" variant="ghost" className="h-10"><a href="/pipeline">Reset</a></Button>
        </div>
      </FilterBar>
      <PipelineBoard leads={leads} statuses={ordered} />
    </div>
  );
}
