import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { LostSaleForm } from "@/components/lost-sales/form";
import { getLeadPicker } from "@/lib/data/leads";
import { getOptions, getVehicleModels } from "@/lib/data/options";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "Mark lost sale" };

export default async function NewLostSalePage({
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
        eyebrow="Lost sales"
        title="Mark lost sale"
        description="Record why the sale was lost and whether it can be recovered. The prospect stays in the CRM."
      />
      <LostSaleForm
        leads={leads}
        options={options}
        models={models}
        defaultLeadId={leadId}
        today={todayISO()}
      />
    </div>
  );
}
