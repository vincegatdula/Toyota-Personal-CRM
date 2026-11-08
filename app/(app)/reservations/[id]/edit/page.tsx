import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ReservationForm } from "@/components/reservations/form";
import { DeleteForm } from "@/components/shared/delete-form";
import { deleteReservation } from "@/app/actions/reservations";
import { getReservation } from "@/lib/data/records";
import { getLeadPicker } from "@/lib/data/leads";
import { getOptions, getVehicleModels } from "@/lib/data/options";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "Edit reservation" };

export default async function EditReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [record, leads, options, models] = await Promise.all([
    getReservation(id),
    getLeadPicker(),
    getOptions(),
    getVehicleModels(),
  ]);
  if (!record) notFound();

  return (
    <div className="page-container max-w-3xl">
      <PageHeader
        eyebrow={record.reservation_code}
        title="Edit reservation"
        description="Status changes are written to the prospect's activity timeline."
        actions={
          <DeleteForm
            action={deleteReservation}
            id={record.id}
            label="Delete"
            message="Delete this reservation? The prospect and other records are kept."
          />
        }
      />
      <ReservationForm
        record={record}
        leads={leads}
        options={options}
        models={models}
        today={todayISO()}
      />
    </div>
  );
}
