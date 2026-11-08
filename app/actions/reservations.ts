"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { formToObject, reservationSchema } from "@/lib/validation";
import { actionError, n, type ActionState } from "@/lib/actions-helpers";
import { assertLeadOwned } from "@/lib/lead-guard";

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
  const { supabase, user } = await requireUser();
  let redirectTo: string | null = null;
  try {
    const parsed = reservationSchema.parse(formToObject(formData));
    const id = n(formData.get("id"));
    await assertLeadOwned(supabase, user.id, parsed.lead_id);
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
      const { data: before } = await supabase
        .from("reservations")
        .select("current_status, lead_id")
        .eq("id", id)
        .eq("owner_id", user.id)
        .maybeSingle();
      const { error } = await supabase
        .from("reservations")
        .update(values)
        .eq("id", id)
        .eq("owner_id", user.id);
      if (error) throw new Error(error.message);
      if (before && before.current_status !== parsed.current_status) {
        await supabase.from("lead_activities").insert({
          lead_id: parsed.lead_id,
          owner_id: user.id,
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
        .insert({ ...values, owner_id: user.id })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message || "Could not save reservation");
      await supabase.from("lead_activities").insert({
        lead_id: parsed.lead_id,
        owner_id: user.id,
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
  const { supabase, user } = await requireUser();
  const id = n(formData.get("id"));
  const status = n(formData.get("status"));
  if (!id || !status) return;
  const { data: before } = await supabase
    .from("reservations")
    .select("current_status, lead_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!before || before.current_status === status) return;
  await supabase
    .from("reservations")
    .update({ current_status: status })
    .eq("id", id)
    .eq("owner_id", user.id);
  await supabase.from("lead_activities").insert({
    lead_id: before.lead_id,
    owner_id: user.id,
    activity_type: "Status change",
    activity_at: new Date().toISOString(),
    summary: `Reservation status changed from ${before.current_status} to ${status}`,
    created_by: user.id,
  });
  revalidateReservations(before.lead_id);
}

export async function deleteReservation(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = n(formData.get("id"));
  if (!id) return;
  await supabase
    .from("reservations")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);
  revalidateReservations();
  redirect("/reservations");
}
