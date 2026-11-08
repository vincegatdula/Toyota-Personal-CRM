import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { FinancingForm } from "@/components/financing/form";
import { DeleteForm } from "@/components/shared/delete-form";
import { deleteFinancing } from "@/app/actions/financing";
import { getFinancing } from "@/lib/data/records";
import { getLeadPicker } from "@/lib/data/leads";
import { getOptions, getVehicleModels } from "@/lib/data/options";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "Edit financing application" };

export default async function EditFinancingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [record, leads, options, models] = await Promise.all([
    getFinancing(id),
    getLeadPicker(),
    getOptions(),
    getVehicleModels(),
  ]);
  if (!record) notFound();

  return (
    <div className="page-container max-w-3xl">
      <PageHeader
        eyebrow={record.financing_code}
        title="Edit financing application"
        description="Status changes are also written to the prospect's activity timeline."
        actions={
          <DeleteForm
            action={deleteFinancing}
            id={record.id}
            label="Delete"
            message="Delete this financing application? The prospect and other records are kept."
          />
        }
      />
      <FinancingForm
        record={record}
        leads={leads}
        options={options}
        models={models}
        today={todayISO()}
      />
    </div>
  );
}
