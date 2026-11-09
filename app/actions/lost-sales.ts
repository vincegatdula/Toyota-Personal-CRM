"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthContext } from "@/lib/auth";
import { formToObject, lostSaleSchema } from "@/lib/validation";
import { actionError, n, type ActionState } from "@/lib/actions-helpers";
import { manilaTimestamp, todayISO } from "@/lib/dates";

function revalidateLost(leadId?: string) {
  revalidatePath("/lost-sales");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/prospects");
  revalidatePath("/pipeline");
  if (leadId) revalidatePath(`/prospects/${leadId}`);
}

export async function saveLostSale(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  let redirectTo: string | null = null;
  try {
    const parsed = lostSaleSchema.parse(formToObject(formData));
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
      date_marked_lost: parsed.date_marked_lost,
      lead_source: parsed.lead_source ?? null,
      preferred_model: parsed.preferred_model ?? null,
      pipeline_stage_when_lost: parsed.pipeline_stage_when_lost ?? null,
      primary_loss_reason: parsed.primary_loss_reason,
      competitor_alternative: parsed.competitor_alternative ?? null,
      financing_payment_issue: parsed.financing_payment_issue ?? null,
      estimated_units_lost: parsed.estimated_units_lost,
      recoverable: parsed.recoverable,
      recovery_next_action: parsed.recovery_next_action ?? null,
      coaching_notes: parsed.coaching_notes ?? null,
      recovery_status: parsed.recovery_status ?? "open",
    };

    if (id) {
      let updateQuery = supabase
        .from("lost_sales")
        .update(values)
        .eq("id", id);
      if (!context.isAdmin) updateQuery = updateQuery.eq("owner_id", user.id);
      const { error } = await updateQuery;
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("lost_sales")
        .insert({ ...values, owner_id: lead.owner_id });
      if (error) throw new Error(error.message);
      {
        let leadUpdate = supabase
          .from("leads")
          .update({
            pipeline_status: "Lost",
            lost_at: manilaTimestamp(`${parsed.date_marked_lost}T12:00`),
          })
          .eq("id", parsed.lead_id);
        if (!context.isAdmin) leadUpdate = leadUpdate.eq("owner_id", user.id);
        await leadUpdate;
      }
      await supabase.from("lead_activities").insert({
        lead_id: parsed.lead_id,
        owner_id: lead.owner_id,
        activity_type: "Status change",
        activity_at: new Date().toISOString(),
        summary: `Marked lost: ${parsed.primary_loss_reason}${parsed.recoverable ? " (recoverable)" : ""}`,
        created_by: user.id,
      });
    }
    revalidateLost(parsed.lead_id);
    redirectTo = "/lost-sales";
  } catch (error) {
    return actionError(error);
  }
  if (redirectTo) redirect(redirectTo);
  return { ok: true };
}

export async function updateLostRecovery(formData: FormData) {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  const id = n(formData.get("id"));
  const status = n(formData.get("recovery_status"));
  if (!id || !status) return;
  if (!["open", "recovered", "closed"].includes(status)) return;

  let recordQuery = supabase
    .from("lost_sales")
    .select("lead_id, owner_id")
    .eq("id", id);
  if (!context.isAdmin) recordQuery = recordQuery.eq("owner_id", user.id);
  const { data: record } = await recordQuery.maybeSingle();
  if (!record) return;

  {
    let lostUpdate = supabase
      .from("lost_sales")
      .update({
        recovery_status: status as "open" | "recovered" | "closed",
        recovered_at: status === "recovered" ? todayISO() : null,
      })
      .eq("id", id);
    if (!context.isAdmin) lostUpdate = lostUpdate.eq("owner_id", user.id);
    await lostUpdate;
  }

  if (status === "recovered") {
    {
      let leadUpdate = supabase
        .from("leads")
        .update({
          lost_at: null,
          pipeline_status: "Contacted",
          last_contact_date: todayISO(),
        })
        .eq("id", record.lead_id);
      if (!context.isAdmin) leadUpdate = leadUpdate.eq("owner_id", user.id);
      await leadUpdate;
    }
    await supabase.from("lead_activities").insert({
      lead_id: record.lead_id,
      owner_id: record.owner_id,
      activity_type: "Note",
      activity_at: new Date().toISOString(),
      summary: "Lost sale marked recovered; prospect returned to Contacted",
      created_by: user.id,
    });
  }
  revalidateLost(record.lead_id);
  redirect("/lost-sales");
}

export async function deleteLostSale(formData: FormData) {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  const id = n(formData.get("id"));
  if (!id) return;
  {
    let deleteQuery = supabase
      .from("lost_sales")
      .delete()
      .eq("id", id);
    if (!context.isAdmin) deleteQuery = deleteQuery.eq("owner_id", user.id);
    await deleteQuery;
  }
  revalidateLost();
  redirect("/lost-sales");
}
