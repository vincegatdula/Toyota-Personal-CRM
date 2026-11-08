"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { formToObject, lostSaleSchema } from "@/lib/validation";
import { actionError, n, type ActionState } from "@/lib/actions-helpers";
import { manilaTimestamp, todayISO } from "@/lib/dates";
import { assertLeadOwned } from "@/lib/lead-guard";

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
  const { supabase, user } = await requireUser();
  let redirectTo: string | null = null;
  try {
    const parsed = lostSaleSchema.parse(formToObject(formData));
    const id = n(formData.get("id"));
    await assertLeadOwned(supabase, user.id, parsed.lead_id);
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
      const { error } = await supabase
        .from("lost_sales")
        .update(values)
        .eq("id", id)
        .eq("owner_id", user.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("lost_sales")
        .insert({ ...values, owner_id: user.id });
      if (error) throw new Error(error.message);
      await supabase
        .from("leads")
        .update({
          pipeline_status: "Lost",
          lost_at: manilaTimestamp(`${parsed.date_marked_lost}T12:00`),
        })
        .eq("id", parsed.lead_id)
        .eq("owner_id", user.id);
      await supabase.from("lead_activities").insert({
        lead_id: parsed.lead_id,
        owner_id: user.id,
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
  const { supabase, user } = await requireUser();
  const id = n(formData.get("id"));
  const status = n(formData.get("recovery_status"));
  if (!id || !status) return;
  if (!["open", "recovered", "closed"].includes(status)) return;

  const { data: record } = await supabase
    .from("lost_sales")
    .select("lead_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!record) return;

  await supabase
    .from("lost_sales")
    .update({
      recovery_status: status as "open" | "recovered" | "closed",
      recovered_at: status === "recovered" ? todayISO() : null,
    })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (status === "recovered") {
    await supabase
      .from("leads")
      .update({
        lost_at: null,
        pipeline_status: "Contacted",
        last_contact_date: todayISO(),
      })
      .eq("id", record.lead_id)
      .eq("owner_id", user.id);
    await supabase.from("lead_activities").insert({
      lead_id: record.lead_id,
      owner_id: user.id,
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
  const { supabase, user } = await requireUser();
  const id = n(formData.get("id"));
  if (!id) return;
  await supabase
    .from("lost_sales")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);
  revalidateLost();
  redirect("/lost-sales");
}
