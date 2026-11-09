"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthContext } from "@/lib/auth";
import { activitySchema, formToObject, leadSchema } from "@/lib/validation";
import { actionError, n, type ActionState } from "@/lib/actions-helpers";
import { manilaTimestamp, toDateOnly, todayISO } from "@/lib/dates";

function revalidateLeadPaths(id?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/prospects");
  revalidatePath("/pipeline");
  revalidatePath("/reports");
  if (id) revalidatePath(`/prospects/${id}`);
}

export async function saveLead(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  let redirectTo: string | null = null;
  try {
    const payload = formToObject(formData);
    const parsed = leadSchema.parse(payload);
    const id = n(formData.get("id"));

    const values = {
      date_created: parsed.date_created,
      lead_source: parsed.lead_source,
      prospect_name: parsed.prospect_name,
      preferred_model: parsed.preferred_model ?? null,
      transaction: parsed.transaction ?? null,
      sales_channel: parsed.sales_channel ?? null,
      purchase_timeline: parsed.purchase_timeline ?? null,
      pipeline_status: parsed.pipeline_status,
      last_contact_date: parsed.last_contact_date ?? null,
      next_action: parsed.next_action ?? null,
      next_action_due_date: parsed.next_action_due_date ?? null,
      contact_number: parsed.contact_number ?? null,
      email: parsed.email ?? null,
      location: parsed.location ?? null,
      remarks: parsed.remarks ?? null,
      next_action_completed_at: parsed.next_action_due_date ? null : undefined,
      ...(parsed.pipeline_status === "Lost"
        ? { lost_at: new Date().toISOString() }
        : {}),
    };

    if (id) {
      let beforeQuery = supabase
        .from("leads")
        .select("pipeline_status")
        .eq("id", id);
      if (!context.isAdmin) beforeQuery = beforeQuery.eq("owner_id", user.id);
      const { data: before } = await beforeQuery.maybeSingle();
      let updateQuery = supabase
        .from("leads")
        .update(
          before &&
            before.pipeline_status === "Lost" &&
            parsed.pipeline_status !== "Lost"
            ? { ...values, lost_at: null }
            : values,
        );
      if (!context.isAdmin) updateQuery = updateQuery.eq("owner_id", user.id);
      const { error } = await updateQuery.eq("id", id);
      if (error) throw new Error(error.message);
      if (before && before.pipeline_status !== parsed.pipeline_status) {
        const { data: ownerLead } = await supabase
          .from("leads")
          .select("owner_id")
          .eq("id", id)
          .maybeSingle();
        await supabase.from("lead_activities").insert({
          lead_id: id,
          owner_id: ownerLead?.owner_id ?? user.id,
          activity_type: "Status change",
          activity_at: new Date().toISOString(),
          summary: `Status changed from ${before.pipeline_status} to ${parsed.pipeline_status}`,
          created_by: user.id,
        });
      }
      redirectTo = `/prospects/${id}`;
    } else {
      const { data, error } = await supabase
        .from("leads")
        .insert({
          ...values,
          owner_id: user.id,
          next_action_completed_at: null,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message || "Could not save prospect");
      await supabase.from("lead_activities").insert({
        lead_id: data.id,
        owner_id: user.id,
        activity_type: "Note",
        activity_at: new Date().toISOString(),
        summary: "Prospect created",
        created_by: user.id,
      });
      redirectTo = `/prospects/${data.id}`;
    }
    revalidateLeadPaths(id ?? undefined);
  } catch (error) {
    return actionError(error);
  }
  if (redirectTo) redirect(redirectTo);
  return { ok: true };
}

export async function setLeadArchived(formData: FormData) {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  const id = n(formData.get("id"));
  const archived = formData.get("archived") === "1";
  if (!id) return;
  let query = supabase
    .from("leads")
    .update({ is_archived: archived })
    .eq("id", id);
  if (!context.isAdmin) query = query.eq("owner_id", user.id);
  await query;
  revalidateLeadPaths(id);
  redirect(archived ? "/prospects?archived=1" : "/prospects");
}

export async function addActivity(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  try {
    const parsed = activitySchema.parse(formToObject(formData));
    let leadQuery = supabase
      .from("leads")
      .select("id, owner_id")
      .eq("id", parsed.lead_id);
    if (!context.isAdmin) leadQuery = leadQuery.eq("owner_id", user.id);
    const { data: lead } = await leadQuery.maybeSingle();
    if (!lead) throw new Error("That prospect does not exist in your account.");
    const { error } = await supabase.from("lead_activities").insert({
      lead_id: parsed.lead_id,
      owner_id: lead.owner_id,
      activity_type: parsed.activity_type,
      activity_at: manilaTimestamp(parsed.activity_at),
      summary: parsed.summary ?? null,
      notes: parsed.notes ?? null,
      outcome: parsed.outcome ?? null,
      created_by: user.id,
    });
    if (error) throw new Error(error.message);
    {
      let leadUpdate = supabase
        .from("leads")
        .update({
          last_contact_date: toDateOnly(parsed.activity_at),
        })
        .eq("id", parsed.lead_id);
      if (!context.isAdmin) leadUpdate = leadUpdate.eq("owner_id", user.id);
      await leadUpdate;
    }
    revalidateLeadPaths(parsed.lead_id);
    return { ok: true, message: "Activity recorded" };
  } catch (error) {
    return actionError(error);
  }
}

export async function completeFollowUp(formData: FormData) {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  const id = n(formData.get("id"));
  if (!id) return;
  let leadQuery = supabase
    .from("leads")
    .select("id, owner_id")
    .eq("id", id);
  if (!context.isAdmin) leadQuery = leadQuery.eq("owner_id", user.id);
  const { data: lead } = await leadQuery.maybeSingle();
  if (!lead) return;
  const now = new Date().toISOString();
  let updateQuery = supabase
    .from("leads")
    .update({ next_action_completed_at: now, last_contact_date: todayISO() });
  if (!context.isAdmin) updateQuery = updateQuery.eq("owner_id", user.id);
  await updateQuery.eq("id", id);
  await supabase.from("lead_activities").insert({
    lead_id: id,
    owner_id: lead.owner_id,
    activity_type: "Follow-up attempt",
    activity_at: now,
    summary: "Follow-up marked complete",
    created_by: user.id,
  });
  revalidateLeadPaths(id);
}

export async function updateLeadStatus(formData: FormData) {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  const id = n(formData.get("id"));
  const status = n(formData.get("status"));
  if (!id || !status) return;

  let beforeQuery = supabase
    .from("leads")
    .select("pipeline_status, owner_id")
    .eq("id", id);
  if (!context.isAdmin) beforeQuery = beforeQuery.eq("owner_id", user.id);
  const { data: before } = await beforeQuery.maybeSingle();
  if (!before || before.pipeline_status === status) return;

  let updateQuery = supabase
    .from("leads")
    .update({
      pipeline_status: status,
      lost_at: status === "Lost" ? new Date().toISOString() : null,
    });
  if (!context.isAdmin) updateQuery = updateQuery.eq("owner_id", user.id);
  await updateQuery.eq("id", id);

  await supabase.from("lead_activities").insert({
    lead_id: id,
    owner_id: before.owner_id,
    activity_type: "Status change",
    activity_at: new Date().toISOString(),
    summary: `Status changed from ${before.pipeline_status} to ${status}`,
    created_by: user.id,
  });

  revalidateLeadPaths(id);
}

export async function updateNextAction(formData: FormData) {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  const id = n(formData.get("id"));
  if (!id) return;
  let updateQuery = supabase
    .from("leads")
    .update({
      next_action: n(formData.get("next_action")),
      next_action_due_date: n(formData.get("next_action_due_date")),
      next_action_completed_at: null,
    });
  if (!context.isAdmin) updateQuery = updateQuery.eq("owner_id", user.id);
  await updateQuery.eq("id", id);
  revalidateLeadPaths(id);
}
