import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PipelineBoard } from "@/components/pipeline/board";
import { getPipelineLeads } from "@/lib/data/leads";
import { getOptions, optionLabels } from "@/lib/data/options";
import {
  ACTIVE_PIPELINE_STATUSES,
  OPTION_CATEGORIES,
  PIPELINE_STATUS_FALLBACK,
} from "@/lib/constants";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const [leads, options] = await Promise.all([
    getPipelineLeads(),
    getOptions(),
  ]);
  const configured = optionLabels(options, OPTION_CATEGORIES.pipelineStatus);
  const base = configured.length ? configured : PIPELINE_STATUS_FALLBACK;
  const statuses = base.filter((status) =>
    ACTIVE_PIPELINE_STATUSES.includes(status),
  );
  const ordered = [
    ...statuses,
    ...ACTIVE_PIPELINE_STATUSES.filter((status) => !statuses.includes(status)),
  ];

  return (
    <div className="page-container max-w-none">
      <PageHeader
        eyebrow="CRM"
        title="Pipeline"
        description={`${leads.length} active prospect${leads.length === 1 ? "" : "s"} across ${ordered.length} stages. Drag cards to update the stage instantly.`}
      />
      <PipelineBoard leads={leads} statuses={ordered} />
    </div>
  );
}
