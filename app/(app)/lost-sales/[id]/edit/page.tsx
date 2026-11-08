import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { LostSaleForm } from "@/components/lost-sales/form";
import { DeleteForm } from "@/components/shared/delete-form";
import { deleteLostSale } from "@/app/actions/lost-sales";
import { getLostSale } from "@/lib/data/records";
import { getLeadPicker } from "@/lib/data/leads";
import { getOptions, getVehicleModels } from "@/lib/data/options";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "Edit lost sale" };

export default async function EditLostSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [record, leads, options, models] = await Promise.all([
    getLostSale(id),
    getLeadPicker(),
    getOptions(),
    getVehicleModels(),
  ]);
  if (!record) notFound();

  return (
    <div className="page-container max-w-3xl">
      <PageHeader
        eyebrow={record.lost_code}
        title="Edit lost sale"
        description="Update the reason, recoverability, or coaching notes."
        actions={
          <DeleteForm
            action={deleteLostSale}
            id={record.id}
            label="Delete"
            message="Delete this lost-sale record? The prospect and its history are kept."
          />
        }
      />
      <LostSaleForm
        record={record}
        leads={leads}
        options={options}
        models={models}
        today={todayISO()}
      />
    </div>
  );
}
