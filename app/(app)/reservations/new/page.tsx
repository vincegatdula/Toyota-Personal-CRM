import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ReservationForm } from "@/components/reservations/form";
import { getLeadPicker } from "@/lib/data/leads";
import { getOptions, getVehicleModels } from "@/lib/data/options";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "New reservation" };

export default async function NewReservationPage({
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
        eyebrow="Reservations"
        title="New reservation"
        description="Record the reserved unit and the expected release date."
      />
      <ReservationForm
        leads={leads}
        options={options}
        models={models}
        defaultLeadId={leadId}
        today={todayISO()}
      />
    </div>
  );
}
