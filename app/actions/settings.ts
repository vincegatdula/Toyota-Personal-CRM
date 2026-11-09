"use server";

import { revalidatePath } from "next/cache";
import { requireCrmAdmin, requireAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AVATAR_ACCEPT, AVATAR_BUCKET, AVATAR_MAX_BYTES } from "@/lib/brand";
import {
  dropdownOptionSchema,
  formToObject,
  profileSchema,
  targetSchema,
  vehicleModelSchema,
} from "@/lib/validation";
import { actionError, bool, n, type ActionState } from "@/lib/actions-helpers";

function revalidateSettings() {
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

function assertAvatarFile(file: FormDataEntryValue | null): asserts file is File {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose an image file to upload.");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error("Profile picture must be 3 MB or smaller.");
  }
  if (!AVATAR_ACCEPT.split(",").includes(file.type)) {
    throw new Error("Use a PNG, JPEG, or WebP image.");
  }
}

function avatarExtension(file: File) {
  const fromType = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "png";
  if (name.endsWith(".webp")) return "webp";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "jpg";
  return fromType;
}

export async function saveDropdownOption(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  try {
    const parsed = dropdownOptionSchema.parse(formToObject(formData));
    const id = n(formData.get("id"));
    if (id) {
      const { data: existing } = await supabase
        .from("dropdown_options")
        .select("id, owner_id, is_system")
        .eq("id", id)
        .maybeSingle();
      if (!existing) throw new Error("List option not found.");
      const isGlobal = existing.owner_id === null || existing.is_system;
      if (isGlobal && !context.isAdmin) {
        throw new Error("Only CRM administrators can manage shared list options.");
      }
      if (!isGlobal && existing.owner_id !== user.id && !context.isAdmin) {
        throw new Error("You can only manage your own list options.");
      }
      const { error } = await supabase
        .from("dropdown_options")
        .update({
          label: parsed.label,
          sort_order: parsed.sort_order ?? 0,
          is_active: parsed.is_active,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
      revalidateSettings();
      return { ok: true, message: "List option saved" };
    }

    // Creating global/shared dropdown options is admin-only.
    if (!context.isAdmin) {
      throw new Error("Only CRM administrators can create shared list options.");
    }

    {
      const { data: existing } = await supabase
        .from("dropdown_options")
        .select("id, is_active")
        .eq("category", parsed.category)
        .eq("label", parsed.label)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("dropdown_options")
          .update({ is_active: true, sort_order: parsed.sort_order ?? 0 })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("dropdown_options").insert({
          category: parsed.category,
          label: parsed.label,
          sort_order: parsed.sort_order ?? 999,
          is_active: true,
          is_system: false,
          owner_id: user.id,
        });
        if (error) throw new Error(error.message);
      }
    }
    revalidateSettings();
    return { ok: true, message: "List option saved" };
  } catch (error) {
    return actionError(error);
  }
}

export async function moveDropdownOption(formData: FormData) {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  const id = n(formData.get("id"));
  const direction = n(formData.get("direction"));
  if (!id || !direction) return;

  const { data: current } = await supabase
    .from("dropdown_options")
    .select("id, category, owner_id, is_system")
    .eq("id", id)
    .maybeSingle();
  if (!current) return;
  const isGlobal = current.owner_id === null || current.is_system;
  if (isGlobal && !context.isAdmin) return;
  if (!isGlobal && current.owner_id !== user.id && !context.isAdmin) return;

  const { data: rows } = await supabase
    .from("dropdown_options")
    .select("id, sort_order")
    .eq("category", current.category)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  const list = rows ?? [];
  const index = list.findIndex((row) => row.id === id);
  if (index < 0) return;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= list.length) return;
  const reordered = [...list];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  await Promise.all(
    reordered.map((row, i) =>
      supabase
        .from("dropdown_options")
        .update({ sort_order: (i + 1) * 10 })
        .eq("id", row.id),
    ),
  );
  revalidateSettings();
}

export async function toggleDropdownOption(formData: FormData) {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  const id = n(formData.get("id"));
  const active = bool(formData.get("is_active"));
  if (!id) return;
  const { data: existing } = await supabase
    .from("dropdown_options")
    .select("id, owner_id, is_system")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return;
  const isGlobal = existing.owner_id === null || existing.is_system;
  if (isGlobal && !context.isAdmin) return;
  if (!isGlobal && existing.owner_id !== user.id && !context.isAdmin) return;
  await supabase
    .from("dropdown_options")
    .update({ is_active: active })
    .eq("id", id);
  revalidateSettings();
}

export async function deleteDropdownOption(formData: FormData) {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  const id = n(formData.get("id"));
  if (!id) return;
  const { data } = await supabase
    .from("dropdown_options")
    .select("id, owner_id, is_system")
    .eq("id", id)
    .maybeSingle();
  if (!data) return;
  const isGlobal = data.owner_id === null || data.is_system;
  if (isGlobal && !context.isAdmin) return;
  if (!isGlobal && data.owner_id !== user.id && !context.isAdmin) return;
  if (data.is_system) {
    await supabase
      .from("dropdown_options")
      .update({ is_active: false })
      .eq("id", id);
  } else {
    await supabase.from("dropdown_options").delete().eq("id", id);
  }
  revalidateSettings();
}

export async function saveVehicleModel(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireCrmAdmin();
  try {
    const parsed = vehicleModelSchema.parse(formToObject(formData));
    const id = n(formData.get("id"));
    const values = {
      name: parsed.name,
      make: parsed.make || "TOYOTA",
      model: parsed.model ?? null,
      variant: parsed.variant ?? null,
      sort_order: parsed.sort_order ?? 0,
      is_active: parsed.is_active,
    };
    if (id) {
      const { error } = await supabase
        .from("vehicle_models")
        .update(values)
        .eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("vehicle_models").insert(values);
      if (error) {
        if (error.code === "23505") {
          throw new Error("That model name already exists.");
        }
        throw new Error(error.message);
      }
    }
    revalidateSettings();
    return { ok: true, message: "Vehicle model saved" };
  } catch (error) {
    return actionError(error);
  }
}

export async function toggleVehicleModel(formData: FormData) {
  const { supabase } = await requireCrmAdmin();
  const id = n(formData.get("id"));
  const active = bool(formData.get("is_active"));
  if (!id) return;
  await supabase
    .from("vehicle_models")
    .update({ is_active: active })
    .eq("id", id);
  revalidateSettings();
}

export async function deleteVehicleModel(formData: FormData) {
  const { supabase } = await requireCrmAdmin();
  const id = n(formData.get("id"));
  if (!id) return;
  await supabase.from("vehicle_models").delete().eq("id", id);
  revalidateSettings();
}

export async function saveTarget(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  try {
    const parsed = targetSchema.parse(formToObject(formData));
    const { data: existing } = await supabase
      .from("monthly_targets")
      .select("id")
      .eq("owner_id", user.id)
      .eq("year", parsed.year)
      .eq("month", parsed.month)
      .maybeSingle();

    const values = {
      sales_target: parsed.sales_target,
      financing_target: parsed.financing_target,
      tfs_target: parsed.tfs_target,
    };
    if (existing) {
      const { error } = await supabase
        .from("monthly_targets")
        .update(values)
        .eq("id", existing.id)
        .eq("owner_id", user.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("monthly_targets").insert({
        owner_id: user.id,
        year: parsed.year,
        month: parsed.month,
        ...values,
      });
      if (error) throw new Error(error.message);
    }
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { ok: true, message: "Monthly target saved" };
  } catch (error) {
    return actionError(error);
  }
}

export async function saveProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  try {
    const parsed = profileSchema.parse(formToObject(formData));
    const values = {
      full_name: parsed.full_name ?? null,
      email: parsed.email ?? user.email ?? null,
      phone: parsed.phone ?? null,
      title: parsed.title ?? null,
      status: parsed.status ?? null,
    };
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (existing?.id) {
      const { error } = await supabase.from("profiles").update(values).eq("id", user.id);
      if (error) throw new Error(error.message);
    } else {
      // Let DB default role apply for compatibility across 0004/0006 states.
      const { error } = await supabase.from("profiles").insert({ id: user.id, ...values });
      if (error) throw new Error(error.message);
    }
    revalidateSettings();
    return { ok: true, message: "Profile saved" };
  } catch (error) {
    return actionError(error);
  }
}

export async function uploadProfileAvatar(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await requireAuthContext();
  const { supabase, user } = context;
  try {
    const file = formData.get("avatar");
    assertAvatarFile(file);
    const ext = avatarExtension(file);
    const path = `avatars/${user.id}/profile-${Date.now()}.${ext}`;
    const admin = createAdminClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage.from(AVATAR_BUCKET).upload(path, bytes, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600",
    });
    if (uploadError) throw new Error(uploadError.message);

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", user.id);
    if (error) {
      await admin.storage.from(AVATAR_BUCKET).remove([path]).catch(() => undefined);
      throw new Error(error.message);
    }

    const previous = profile?.avatar_url;
    if (previous && !/^https?:\/\//i.test(previous) && previous !== path) {
      await admin.storage.from(AVATAR_BUCKET).remove([previous]).catch(() => undefined);
    }

    revalidateSettings();
    return { ok: true, message: "Profile picture updated." };
  } catch (error) {
    return actionError(error);
  }
}

export async function removeProfileAvatar(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _prev;
  void _formData;
  const context = await requireAuthContext();
  const { supabase, user } = context;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);
    if (error) throw new Error(error.message);
    const previous = profile?.avatar_url;
    if (previous && !/^https?:\/\//i.test(previous)) {
      const admin = createAdminClient();
      await admin.storage.from(AVATAR_BUCKET).remove([previous]).catch(() => undefined);
    }
    revalidateSettings();
    return { ok: true, message: "Profile picture removed." };
  } catch (error) {
    return actionError(error);
  }
}
