"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { formToObject, releaseSchema } from "@/lib/validation";
import { actionError, n, type ActionState } from "@/lib/actions-helpers";
import { assertLeadOwned, assertReservationOwned } from "@/lib/lead-guard";

function revalidateReleases(leadId?: string) {
  revalidatePath("/releases");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/reservations");
  if (leadId) revalidatePath(`/prospects/${leadId}`);
}

export async function saveRelease(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  let redirectTo: string | null = null;
  try {
    const parsed = releaseSchema.parse(formToObject(formData));
    const id = n(formData.get("id"));
    await assertLeadOwned(supabase, user.id, parsed.lead_id);
    if (parsed.reservation_id) {
      await assertReservationOwned(
        supabase,
        user.id,
        parsed.reservation_id,
        parsed.lead_id,
      );
    }
    const values = {
      lead_id: parsed.lead_id,
      reservation_id: parsed.reservation_id ?? null,
      release_date: parsed.release_date,
      transaction: parsed.transaction ?? null,
      model_released: parsed.model_released,
      units_released: parsed.units_released,
      bank: parsed.bank ?? null,
      remarks: parsed.remarks ?? null,
    };

    if (id) {
      const { error } = await supabase
        .from("vehicle_releases")
        .update(values)
        .eq("id", id)
        .eq("owner_id", user.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("vehicle_releases")
        .insert({ ...values, owner_id: user.id });
      if (error) {
        if (error.code === "23505") {
          throw new Error(
            "A release already exists for this prospect, date, and model. Update the existing entry instead of adding a duplicate.",
          );
        }
        throw new Error(error.message);
      }
    }

    if (parsed.update_lead_status) {
      await supabase
        .from("leads")
        .update({
          pipeline_status: "Vehicle Released",
          last_contact_date: parsed.release_date,
          next_action_completed_at: new Date().toISOString(),
        })
        .eq("id", parsed.lead_id)
        .eq("owner_id", user.id);
    }

    if (parsed.update_reservation_status && parsed.reservation_id) {
      await supabase
        .from("reservations")
        .update({ current_status: "Released" })
        .eq("id", parsed.reservation_id)
        .eq("owner_id", user.id);
    }

    await supabase.from("lead_activities").insert({
      lead_id: parsed.lead_id,
      owner_id: user.id,
      activity_type: id ? "Note" : "Status change",
      activity_at: new Date().toISOString(),
      summary: `${id ? "Updated" : "Recorded"} vehicle release: ${parsed.model_released} × ${parsed.units_released}${parsed.bank ? ` via ${parsed.bank}` : ""}`,
      created_by: user.id,
    });

    revalidateReleases(parsed.lead_id);
    redirectTo = "/releases";
  } catch (error) {
    return actionError(error);
  }
  if (redirectTo) redirect(redirectTo);
  return { ok: true };
}

export async function deleteRelease(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = n(formData.get("id"));
  if (!id) return;
  await supabase
    .from("vehicle_releases")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);
  revalidateReleases();
  redirect("/releases");
}
