import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { FinancingForm } from "@/components/financing/form";
import { getLeadPicker } from "@/lib/data/leads";
import { getOptions, getVehicleModels } from "@/lib/data/options";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "New financing application" };

export default async function NewFinancingPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const { leadId } = await searchParams;
  const [leads, options, models] = await Promise.all([
    getLeadPicker(),
    getOptions(),
    getVehicleModels(),
  ]);

  return (
    <div className="page-container max-w-3xl">
      <PageHeader
        eyebrow="Financing"
        title="New application"
        description="Attach the application to a prospect so the approval and release history stays together."
      />
      <FinancingForm
        leads={leads}
        options={options}
        models={models}
        defaultLeadId={leadId}
        today={todayISO()}
      />
    </div>
  );
}
