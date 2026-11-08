import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { LeadForm } from "@/components/prospects/lead-form";
import { getOptions, getVehicleModels } from "@/lib/data/options";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "New prospect" };

export default async function NewProspectPage() {
  const [options, models] = await Promise.all([getOptions(), getVehicleModels()]);

  return (
    <div className="page-container max-w-4xl">
      <PageHeader
        eyebrow="Prospects"
        title="New prospect"
        description="Capture the lead once, then keep every follow-up, application, and release attached to the same record."
      />
      <LeadForm
        options={options}
        models={models}
        defaults={{ date_created: todayISO(), pipeline_status: "New Prospect" }}
      />
    </div>
  );
}
