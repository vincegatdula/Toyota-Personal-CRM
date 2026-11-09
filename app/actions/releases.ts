"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthContext } from "@/lib/auth";
import { formToObject, releaseSchema } from "@/lib/validation";
import { actionError, n, type ActionState } from "@/lib/actions-helpers";

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
  const context = await requireAuthContext();
  const { supabase, user } = context;
  let redirectTo: string | null = null;
  try {
    const parsed = releaseSchema.parse(formToObject(formData));
    const id = n(formData.get("id"));
    let leadQuery = supabase
      .from("leads")
      .select("id, owner_id")
      .eq("id", parsed.lead_id);
    if (!context.isAdmin) leadQuery = leadQuery.eq("owner_id", user.id);
    const { data: lead } = await leadQuery.maybeSingle();
    if (!lead) throw new Error("That prospect does not exist in your account.");
    if (parsed.reservation_id) {
      let resQuery = supabase
        .from("reservations")
        .select("id, lead_id")
        .eq("id", parsed.reservation_id)
        .eq("lead_id", parsed.lead_id);
      if (!context.isAdmin) resQuery = resQuery.eq("owner_id", user.id);
      const { data: reservation } = await resQuery.maybeSingle();
      if (!reservation) {
        throw new Error("That reservation does not belong to the selected prospect.");
      }
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
      let updateQuery = supabase
        .from("vehicle_releases")
        .update(values);
      if (!context.isAdmin) updateQuery = updateQuery.eq("owner_id", user.id);
      const { error } = await updateQuery.eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("vehicle_releases")
        .insert({ ...values, owner_id: lead.owner_id });
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
      {
        let leadUpdate = supabase
          .from("leads")
          .update({
            pipeline_status: "Vehicle Released",
            last_contact_date: parsed.release_date,
            next_action_completed_at: new Date().toISOString(),
          })
          .eq("id", parsed.lead_id);
        if (!context.isAdmin) leadUpdate = leadUpdate.eq("owner_id", user.id);
        await leadUpdate;
      }
    }

    if (parsed.update_reservation_status && parsed.reservation_id) {
      {
        let resUpdate = supabase
          .from("reservations")
          .update({ current_status: "Released" })
          .eq("id", parsed.reservation_id);
        if (!context.isAdmin) resUpdate = resUpdate.eq("owner_id", user.id);
        await resUpdate;
      }
    }

    await supabase.from("lead_activities").insert({
      lead_id: parsed.lead_id,
      owner_id: lead.owner_id,
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
  const context = await requireAuthContext();
  const { supabase, user } = context;
  const id = n(formData.get("id"));
  if (!id) return;
  {
    let deleteQuery = supabase
      .from("vehicle_releases")
      .delete()
      .eq("id", id);
    if (!context.isAdmin) deleteQuery = deleteQuery.eq("owner_id", user.id);
    await deleteQuery;
  }
  revalidateReleases();
  redirect("/releases");
}
