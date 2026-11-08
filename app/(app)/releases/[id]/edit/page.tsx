import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ReleaseForm } from "@/components/releases/form";
import { DeleteForm } from "@/components/shared/delete-form";
import { deleteRelease } from "@/app/actions/releases";
import { getRelease, getReservationPicker } from "@/lib/data/records";
import { getLeadPicker } from "@/lib/data/leads";
import { getOptions, getVehicleModels } from "@/lib/data/options";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "Edit vehicle release" };

export default async function EditReleasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [record, leads, reservations, options, models] = await Promise.all([
    getRelease(id),
    getLeadPicker(),
    getReservationPicker(),
    getOptions(),
    getVehicleModels(),
  ]);
  if (!record) notFound();

  return (
    <div className="page-container max-w-3xl">
      <PageHeader
        eyebrow={record.release_code}
        title="Edit vehicle release"
        description="Changes affect target attainment and closing-ratio calculations."
        actions={
          <DeleteForm
            action={deleteRelease}
            id={record.id}
            label="Delete"
            message="Delete this vehicle release? Targets and reports will recalculate."
          />
        }
      />
      <ReleaseForm
        record={record}
        leads={leads}
        reservations={reservations}
        options={options}
        models={models}
        today={todayISO()}
      />
    </div>
  );
}
