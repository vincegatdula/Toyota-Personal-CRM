import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ReleaseForm } from "@/components/releases/form";
import { getLeadPicker } from "@/lib/data/leads";
import { getReservationPicker } from "@/lib/data/records";
import { getOptions, getVehicleModels } from "@/lib/data/options";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "Record vehicle release" };

export default async function NewReleasePage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const { leadId } = await searchParams;
  const [leads, reservations, options, models] = await Promise.all([
    getLeadPicker(),
    getReservationPicker(),
    getOptions(),
    getVehicleModels(),
  ]);

  return (
    <div className="page-container max-w-3xl">
      <PageHeader
        eyebrow="Releases"
        title="Record vehicle release"
        description="A release counts toward the sales target. Duplicate releases for the same prospect, date, and model are blocked."
      />
      <ReleaseForm
        leads={leads}
        reservations={reservations}
        options={options}
        models={models}
        defaultLeadId={leadId}
        today={todayISO()}
      />
    </div>
  );
}
