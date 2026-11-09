"use server";

import { revalidatePath } from "next/cache";
import { requireCrmAdminContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { actionError, n, type ActionState } from "@/lib/actions-helpers";
import { createAvatarSignedUrl, isAvatarStoragePath } from "@/lib/avatar";
import { adminSetUserRole, normalizeManagedRole } from "@/lib/admin-users";

function revalidateAdmin() {
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/prospects");
  revalidatePath("/financing");
  revalidatePath("/reservations");
  revalidatePath("/releases");
  revalidatePath("/lost-sales");
  revalidatePath("/pipeline");
}

function redactEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 2);
  return `${head}${local.length > 2 ? "***" : ""}@${domain}`;
}

function isInviteOnlyTriggerError(message: string | undefined) {
  return Boolean(message && /registration is invite-only|sqlstate 42501|42501/i.test(message));
}

async function assertNotLastAdminDemotion(targetUserId: string, nextRole: "admin" | "user") {
  if (nextRole === "admin") return;
  const { supabase } = await requireCrmAdminContext();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", targetUserId)
    .maybeSingle();
  if (!target || (target.role !== "owner" && target.role !== "admin")) return;
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .in("role", ["owner", "admin"])
    .neq("id", targetUserId);
  if ((count ?? 0) === 0) {
    throw new Error("Cannot demote the last CRM administrator.");
  }
}

export async function adminCreateUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await requireCrmAdminContext();
  let createdInviteId: string | null = null;
  const admin = createAdminClient();
  try {
    const email = n(formData.get("email"))?.toLowerCase();
    const password = n(formData.get("password"));
    const fullName = n(formData.get("full_name"));
    const role = normalizeManagedRole(n(formData.get("role")));
    const phone = n(formData.get("phone"));
    const title = n(formData.get("title"));
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid email address.");
    }
    if (!password || password.length < 8) {
      throw new Error("Use a password with at least 8 characters.");
    }

    // Compatibility path for invite-only signup trigger:
    // Some Supabase Auth/Admin environments may not expose supplied app_metadata
    // to the BEFORE INSERT trigger on auth.users as raw_app_meta_data. The
    // trigger already supports trusted pending signup_invites, so create or
    // reuse a pending invite for this exact email before createUser(). The
    // trigger consumes it transactionally during auth user creation.
    const { data: existingInvite, error: existingInviteError } = await admin
      .from("signup_invites")
      .select("id, role")
      .ilike("email", email)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingInviteError) throw new Error(existingInviteError.message);

    if (existingInvite?.id) {
      const { error: updateInviteError } = await admin
        .from("signup_invites")
        .update({
          role,
          note: "Admin-managed account provisioning",
          created_by: context.user.id,
        })
        .eq("id", existingInvite.id)
        .is("consumed_at", null);
      if (updateInviteError) throw new Error(updateInviteError.message);
    } else {
      const { data: invite, error: inviteError } = await admin
        .from("signup_invites")
        .insert({
          email,
          role,
          note: "Admin-managed account provisioning",
          created_by: context.user.id,
        })
        .select("id")
        .single();
      if (inviteError) throw new Error(inviteError.message);
      createdInviteId = invite?.id ?? null;
    }

    // Trusted admin-controlled provisioning. Keep app_metadata in payload for
    // environments where it is available to trigger/auth metadata.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || null },
      app_metadata: { crm_role: role },
    });
    if (error) {
      console.error("adminCreateUser: auth.admin.createUser failed", {
        email: redactEmail(email),
        role,
        hasAppMetadata: true,
        status: "status" in error ? error.status : undefined,
        code: "code" in error ? error.code : undefined,
        inviteOnly: isInviteOnlyTriggerError(error.message),
      });
      throw new Error(error.message);
    }
    const userId = data.user?.id;
    if (!userId) throw new Error("Account was not created.");

    try {
      // Use service-role for profile reconciliation to avoid RLS/policy drift
      // across environments and to prevent orphaned auth users on profile failure.
      const { error: profileError } = await admin.from("profiles").upsert({
        id: userId,
        full_name: fullName || null,
        email,
        phone: phone || null,
        title: title || null,
        role,
      });
      if (profileError) throw new Error(profileError.message);
      // Keep trusted auth metadata aligned with the managed CRM role.
      await adminSetUserRole(userId, role);
    } catch (profileError) {
      await admin.auth.admin.deleteUser(userId).catch(() => undefined);
      throw profileError;
    }

    revalidateAdmin();
    return { ok: true, message: "User account created." };
  } catch (error) {
    if (createdInviteId) {
      try {
        await admin
          .from("signup_invites")
          .delete()
          .eq("id", createdInviteId)
          .is("consumed_at", null);
      } catch {
        // best-effort cleanup only
      }
    }
    if (error instanceof Error && isInviteOnlyTriggerError(error.message)) {
      console.error("adminCreateUser: invite-only trigger rejected request", {
        hint: "verify 0006 trigger/app_metadata visibility; pending invite fallback attempted",
      });
    }
    return actionError(error);
  }
}

export async function adminUpdateUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireCrmAdminContext();
  try {
    const userId = n(formData.get("user_id"));
    if (!userId) throw new Error("User is required.");
    const fullName = n(formData.get("full_name"));
    const email = n(formData.get("email"))?.toLowerCase();
    const phone = n(formData.get("phone"));
    const title = n(formData.get("title"));
    const status = n(formData.get("status"));
    const role = normalizeManagedRole(n(formData.get("role")));
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid email address.");
    }

    await assertNotLastAdminDemotion(userId, role);

    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName || null },
      app_metadata: { crm_role: role },
    });
    if (authError) throw new Error(authError.message);

    const { error } = await admin
      .from("profiles")
      .update({
        full_name: fullName || null,
        email,
        phone: phone || null,
        title: title || null,
        status: status || null,
        role,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);

    revalidateAdmin();
    return { ok: true, message: "User updated." };
  } catch (error) {
    return actionError(error);
  }
}

export async function adminSetUserPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireCrmAdminContext();
  try {
    const userId = n(formData.get("user_id"));
    const password = n(formData.get("password"));
    if (!userId) throw new Error("User is required.");
    if (!password || password.length < 8) {
      throw new Error("Use a password with at least 8 characters.");
    }
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) throw new Error(error.message);
    return { ok: true, message: "Password updated." };
  } catch (error) {
    return actionError(error);
  }
}

export async function adminSaveTargetForUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireCrmAdminContext();
  try {
    const userId = n(formData.get("user_id"));
    const year = Number(formData.get("year"));
    const month = Number(formData.get("month"));
    const salesTarget = Math.max(0, Math.floor(Number(formData.get("sales_target") ?? 0)));
    const financingTarget = Math.max(0, Math.floor(Number(formData.get("financing_target") ?? 0)));
    const tfsTarget = Math.max(0, Math.floor(Number(formData.get("tfs_target") ?? 0)));
    if (!userId) throw new Error("User is required.");
    if (!Number.isFinite(year) || year < 2000 || year > 2100 || !Number.isFinite(month) || month < 1 || month > 12) {
      throw new Error("Invalid target period.");
    }

    const admin = createAdminClient();
    const { data: targetUser } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (!targetUser?.id) throw new Error("User not found.");

    const { data: existing } = await admin
      .from("monthly_targets")
      .select("id")
      .eq("owner_id", userId)
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();

    const values = { sales_target: salesTarget, financing_target: financingTarget, tfs_target: tfsTarget };
    if (existing?.id) {
      const { error } = await admin.from("monthly_targets").update(values).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await admin.from("monthly_targets").insert({ owner_id: userId, year, month, ...values });
      if (error) throw new Error(error.message);
    }
    revalidateAdmin();
    return { ok: true, message: "User target saved." };
  } catch (error) {
    return actionError(error);
  }
}

export async function getAdminProfilesWithAvatars() {
  await requireCrmAdminContext();
  const { supabase } = await requireCrmAdminContext();
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const profiles = data ?? [];
  return Promise.all(
    profiles.map(async (profile) => ({
      ...profile,
      avatar_signed_url: isAvatarStoragePath(profile.avatar_url)
        ? await createAvatarSignedUrl(profile.avatar_url, profile.id)
        : profile.avatar_url,
    })),
  );
}

export async function adminReassignLead(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireCrmAdminContext();
  try {
    const leadId = n(formData.get("lead_id"));
    const newOwnerId = n(formData.get("new_owner_id"));
    const note = n(formData.get("note"));
    if (!leadId) throw new Error("Lead is required.");
    if (!newOwnerId) throw new Error("Select a user to assign this lead to.");

    const { data, error } = await (supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> }).rpc("admin_reassign_lead", {
      p_lead_id: leadId,
      p_new_owner_id: newOwnerId,
      p_note: note,
    });
    if (error) throw new Error(error.message);

    revalidateAdmin();
    revalidatePath(`/prospects/${leadId}`);
    const changed = Boolean(data && typeof data === "object" && "changed" in data && (data as { changed?: boolean }).changed);
    return {
      ok: true,
      message: changed ? "Lead reassigned successfully." : "Lead is already assigned to that user.",
    };
  } catch (error) {
    return actionError(error);
  }
}
