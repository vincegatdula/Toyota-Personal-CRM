"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthContext } from "@/lib/auth";
import { formToObject, reservationSchema } from "@/lib/validation";
import { actionError, n, type ActionState } from "@/lib/actions-helpers";

function revalidateReservations(leadId?: string) {
  revalidatePath("/reservations");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  if (leadId) revalidatePath(`/prospects/${leadId}`);
}

export async function saveReservation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  let redirectTo: string | null = null;
  try {
    const parsed = reservationSchema.parse(formToObject(formData));
    const id = n(formData.get("id"));
    let leadQuery = supabase
      .from("leads")
      .select("id, owner_id")
      .eq("id", parsed.lead_id);
    if (!context.isAdmin) leadQuery = leadQuery.eq("owner_id", user.id);
    const { data: lead } = await leadQuery.maybeSingle();
    if (!lead) throw new Error("That prospect does not exist in your account.");
    const values = {
      lead_id: parsed.lead_id,
      reservation_date: parsed.reservation_date ?? null,
      reserved_model: parsed.reserved_model ?? null,
      sales_channel: parsed.sales_channel ?? null,
      current_status: parsed.current_status,
      expected_release_date: parsed.expected_release_date ?? null,
      last_customer_update: parsed.last_customer_update ?? null,
      next_action: parsed.next_action ?? null,
      remarks: parsed.remarks ?? null,
    };

    if (id) {
      let beforeQuery = supabase
        .from("reservations")
        .select("current_status, lead_id")
        .eq("id", id);
      if (!context.isAdmin) beforeQuery = beforeQuery.eq("owner_id", user.id);
      const { data: before } = await beforeQuery.maybeSingle();
      let updateQuery = supabase
        .from("reservations")
        .update(values)
        .eq("id", id);
      if (!context.isAdmin) updateQuery = updateQuery.eq("owner_id", user.id);
      const { error } = await updateQuery;
      if (error) throw new Error(error.message);
      if (before && before.current_status !== parsed.current_status) {
        await supabase.from("lead_activities").insert({
          lead_id: parsed.lead_id,
          owner_id: lead.owner_id,
          activity_type: "Status change",
          activity_at: new Date().toISOString(),
          summary: `Reservation status changed from ${before.current_status} to ${parsed.current_status}`,
          created_by: user.id,
        });
      }
      redirectTo = "/reservations";
    } else {
      const { data, error } = await supabase
        .from("reservations")
        .insert({ ...values, owner_id: lead.owner_id })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message || "Could not save reservation");
      await supabase.from("lead_activities").insert({
        lead_id: parsed.lead_id,
        owner_id: lead.owner_id,
        activity_type: "Note",
        activity_at: new Date().toISOString(),
        summary: `Reservation created (${parsed.current_status})`,
        created_by: user.id,
      });
      redirectTo = "/reservations";
    }
    revalidateReservations(parsed.lead_id);
  } catch (error) {
    return actionError(error);
  }
  if (redirectTo) redirect(redirectTo);
  return { ok: true };
}

export async function updateReservationStatus(formData: FormData) {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  const id = n(formData.get("id"));
  const status = n(formData.get("status"));
  if (!id || !status) return;
  let beforeQuery = supabase
    .from("reservations")
    .select("current_status, lead_id, owner_id")
    .eq("id", id);
  if (!context.isAdmin) beforeQuery = beforeQuery.eq("owner_id", user.id);
  const { data: before } = await beforeQuery.maybeSingle();
  if (!before || before.current_status === status) return;
  {
    let updateQuery = supabase
      .from("reservations")
      .update({ current_status: status })
      .eq("id", id);
    if (!context.isAdmin) updateQuery = updateQuery.eq("owner_id", user.id);
    await updateQuery;
  }
  await supabase.from("lead_activities").insert({
    lead_id: before.lead_id,
    owner_id: before.owner_id,
    activity_type: "Status change",
    activity_at: new Date().toISOString(),
    summary: `Reservation status changed from ${before.current_status} to ${status}`,
    created_by: user.id,
  });
  revalidateReservations(before.lead_id);
}

export async function deleteReservation(formData: FormData) {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  const id = n(formData.get("id"));
  if (!id) return;
  {
    let deleteQuery = supabase
      .from("reservations")
      .delete()
      .eq("id", id);
    if (!context.isAdmin) deleteQuery = deleteQuery.eq("owner_id", user.id);
    await deleteQuery;
  }
  revalidateReservations();
  redirect("/reservations");
}
