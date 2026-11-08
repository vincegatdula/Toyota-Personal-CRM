"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { financingSchema, formToObject } from "@/lib/validation";
import { actionError, n, type ActionState } from "@/lib/actions-helpers";
import type { FinancingApplication } from "@/types/database";
import { assertLeadOwned } from "@/lib/lead-guard";
import { todayISO } from "@/lib/dates";

function revalidateFinancing(leadId?: string) {
  revalidatePath("/financing");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  if (leadId) revalidatePath(`/prospects/${leadId}`);
}

export async function saveFinancing(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  let redirectTo: string | null = null;
  try {
    const parsed = financingSchema.parse(formToObject(formData));
    const id = n(formData.get("id"));
    await assertLeadOwned(supabase, user.id, parsed.lead_id);

    const values = {
      lead_id: parsed.lead_id,
      date_submitted: parsed.date_submitted ?? null,
      lead_source: parsed.lead_source ?? null,
      preferred_model: parsed.preferred_model ?? null,
      bank: parsed.bank ?? null,
      application_status: parsed.application_status,
      date_approval: parsed.date_approval ?? null,
      approved_dp: parsed.approved_dp ?? null,
      date_released: parsed.date_released ?? null,
      remarks: parsed.remarks ?? null,
    };

    if (id) {
      const { data: before } = await supabase
        .from("financing_applications")
        .select("application_status, lead_id")
        .eq("id", id)
        .eq("owner_id", user.id)
        .maybeSingle();
      const { error } = await supabase
        .from("financing_applications")
        .update(values)
        .eq("id", id)
        .eq("owner_id", user.id);
      if (error) throw new Error(error.message);
      if (before && before.application_status !== parsed.application_status) {
        await supabase.from("lead_activities").insert({
          lead_id: parsed.lead_id,
          owner_id: user.id,
          activity_type: "Financing update",
          activity_at: new Date().toISOString(),
          summary: `Financing status changed from ${before.application_status} to ${parsed.application_status}`,
          created_by: user.id,
        });
      }
      redirectTo = "/financing";
    } else {
      const { data, error } = await supabase
        .from("financing_applications")
        .insert({ ...values, owner_id: user.id })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message || "Could not save application");
      await supabase.from("lead_activities").insert({
        lead_id: parsed.lead_id,
        owner_id: user.id,
        activity_type: "Financing update",
        activity_at: new Date().toISOString(),
        summary: `Financing application created (${parsed.application_status})`,
        created_by: user.id,
      });
      redirectTo = "/financing";
    }
    revalidateFinancing(parsed.lead_id);
  } catch (error) {
    return actionError(error);
  }
  if (redirectTo) redirect(redirectTo);
  return { ok: true };
}

export async function updateFinancingStatus(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = n(formData.get("id"));
  const status = n(formData.get("status"));
  if (!id || !status) return;
  const { data: before } = await supabase
    .from("financing_applications")
    .select("application_status, lead_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!before || before.application_status === status) return;

  const patch: Partial<FinancingApplication> = { application_status: status };
  if (status === "Released") patch.date_released = todayISO();
  await supabase
    .from("financing_applications")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id);
  await supabase.from("lead_activities").insert({
    lead_id: before.lead_id,
    owner_id: user.id,
    activity_type: "Financing update",
    activity_at: new Date().toISOString(),
    summary: `Financing status changed from ${before.application_status} to ${status}`,
    created_by: user.id,
  });
  revalidateFinancing(before.lead_id);
}

export async function deleteFinancing(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = n(formData.get("id"));
  if (!id) return;
  await supabase
    .from("financing_applications")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);
  revalidateFinancing();
  redirect("/financing");
}
