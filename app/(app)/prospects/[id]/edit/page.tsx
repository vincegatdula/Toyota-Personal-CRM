import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { LeadForm } from "@/components/prospects/lead-form";
import { getLeadDetail } from "@/lib/data/leads";
import { getOptions, getVehicleModels } from "@/lib/data/options";

export const metadata: Metadata = { title: "Edit prospect" };

export default async function EditProspectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, options, models] = await Promise.all([
    getLeadDetail(id),
    getOptions(),
    getVehicleModels(),
  ]);
  if (!detail) notFound();

  return (
    <div className="page-container max-w-4xl">
      <PageHeader
        eyebrow={detail.lead.lead_code}
        title={`Edit ${detail.lead.prospect_name}`}
        description="Update the prospect record. Changes are stored with an audit trail."
      />
      <LeadForm
        lead={detail.lead}
        options={options}
        models={models}
        cancelHref={`/prospects/${detail.lead.id}`}
      />
    </div>
  );
}
