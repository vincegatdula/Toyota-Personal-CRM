"use server";

import { revalidatePath } from "next/cache";
import { requireCrmAdmin, requireUser } from "@/lib/auth";
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

export async function saveDropdownOption(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  try {
    const parsed = dropdownOptionSchema.parse(formToObject(formData));
    const id = n(formData.get("id"));
    if (id) {
      const { error } = await supabase
        .from("dropdown_options")
        .update({
          label: parsed.label,
          sort_order: parsed.sort_order ?? 0,
          is_active: parsed.is_active,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    } else {
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
  const { supabase } = await requireUser();
  const id = n(formData.get("id"));
  const direction = n(formData.get("direction"));
  if (!id || !direction) return;

  const { data: current } = await supabase
    .from("dropdown_options")
    .select("id, category")
    .eq("id", id)
    .maybeSingle();
  if (!current) return;

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
  const { supabase } = await requireUser();
  const id = n(formData.get("id"));
  const active = bool(formData.get("is_active"));
  if (!id) return;
  await supabase
    .from("dropdown_options")
    .update({ is_active: active })
    .eq("id", id);
  revalidateSettings();
}

export async function deleteDropdownOption(formData: FormData) {
  const { supabase } = await requireUser();
  const id = n(formData.get("id"));
  if (!id) return;
  const { data } = await supabase
    .from("dropdown_options")
    .select("is_system")
    .eq("id", id)
    .maybeSingle();
  if (data?.is_system) {
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
  const { supabase, user } = await requireUser();
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
  const { supabase, user } = await requireUser();
  try {
    const parsed = profileSchema.parse(formToObject(formData));
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: parsed.full_name ?? null,
      email: parsed.email ?? user.email ?? null,
      phone: parsed.phone ?? null,
      title: parsed.title ?? null,
      status: parsed.status ?? null,
    });
    if (error) throw new Error(error.message);
    revalidateSettings();
    return { ok: true, message: "Profile saved" };
  } catch (error) {
    return actionError(error);
  }
}
