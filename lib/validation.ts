import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const requiredDate = z.string().trim().min(1, "Date is required");
const requiredText = (label: string, max = 300) =>
  z.string().trim().min(1, `${label} is required`).max(max);

export const leadSchema = z.object({
  date_created: requiredDate,
  lead_source: requiredText("Lead source", 120),
  prospect_name: requiredText("Prospect name", 200),
  preferred_model: optionalText,
  transaction: optionalText,
  sales_channel: optionalText,
  purchase_timeline: optionalDate,
  pipeline_status: requiredText("Pipeline status", 120),
  last_contact_date: optionalDate,
  next_action: optionalText,
  next_action_due_date: optionalDate,
  contact_number: optionalText,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Enter a valid email address",
    }),
  location: optionalText,
  remarks: optionalText,
});

export const activitySchema = z.object({
  lead_id: z.string().uuid(),
  activity_type: requiredText("Activity type", 120),
  activity_at: z.string().trim().min(1, "Activity date and time is required"),
  summary: optionalText,
  notes: optionalText,
  outcome: optionalText,
});

export const financingSchema = z.object({
  lead_id: z.string().uuid("Select a prospect"),
  date_submitted: optionalDate,
  lead_source: optionalText,
  preferred_model: optionalText,
  bank: optionalText,
  application_status: requiredText("Application status", 120),
  date_approval: optionalDate,
  approved_dp: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return undefined;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : undefined;
    }),
  date_released: optionalDate,
  remarks: optionalText,
});

export const reservationSchema = z.object({
  lead_id: z.string().uuid("Select a prospect"),
  reservation_date: optionalDate,
  reserved_model: optionalText,
  sales_channel: optionalText,
  current_status: requiredText("Reservation status", 120),
  expected_release_date: optionalDate,
  last_customer_update: optionalText,
  next_action: optionalText,
  remarks: optionalText,
});

export const releaseSchema = z.object({
  lead_id: z.string().uuid("Select a prospect"),
  reservation_id: z
    .string()
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  release_date: requiredDate,
  transaction: optionalText,
  model_released: requiredText("Model released", 200),
  units_released: z
    .union([z.string(), z.number()])
    .transform((v) => {
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
    }),
  bank: optionalText,
  remarks: optionalText,
  update_lead_status: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => v === "on" || v === "true" || v === true),
  update_reservation_status: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => v === "on" || v === "true" || v === true),
});

const recoveryStatusInput = z
  .string()
  .trim()
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    const normalized = v.toLowerCase();
    return normalized === "open" ||
      normalized === "recovered" ||
      normalized === "closed"
      ? normalized
      : v;
  })
  .refine(
    (v) => v === undefined || ["open", "recovered", "closed"].includes(v),
    { message: "Select a valid recovery status" },
  );

export const lostSaleSchema = z.object({
  lead_id: z.string().uuid("Select a prospect"),
  date_marked_lost: requiredDate,
  lead_source: optionalText,
  preferred_model: optionalText,
  pipeline_stage_when_lost: optionalText,
  primary_loss_reason: requiredText("Primary loss reason", 200),
  competitor_alternative: optionalText,
  financing_payment_issue: optionalText,
  estimated_units_lost: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return 1;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) && n > 0 ? n : 1;
    }),
  recoverable: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => v === "on" || v === "true" || v === true),
  recovery_next_action: optionalText,
  coaching_notes: optionalText,
  recovery_status: recoveryStatusInput.transform((v) => v as "open" | "recovered" | "closed" | undefined),
});

export const targetSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  sales_target: z.coerce.number().int().min(0).max(100000),
  financing_target: z.coerce.number().int().min(0).max(100000),
  tfs_target: z.coerce.number().int().min(0).max(100000),
});

export const dropdownOptionSchema = z.object({
  category: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(160),
  sort_order: z.coerce.number().int().min(0).max(100000).optional(),
  is_active: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => v === "on" || v === "true" || v === true),
});

export const vehicleModelSchema = z.object({
  name: z.string().trim().min(1).max(200),
  make: z.string().trim().max(60).optional(),
  model: z.string().trim().max(120).optional(),
  variant: z.string().trim().max(160).optional(),
  sort_order: z.coerce.number().int().min(0).max(100000).optional(),
  is_active: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => v === "on" || v === "true" || v === true),
});

export const profileSchema = z.object({
  full_name: optionalText,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Enter a valid email address",
    }),
  phone: optionalText,
  title: optionalText,
  status: optionalText,
});

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue;
    if (value instanceof File) continue;
    if (key in obj) {
      const existing = obj[key];
      obj[key] = Array.isArray(existing)
        ? [...existing, value]
        : [existing, value];
    } else {
      obj[key] = value;
    }
  }
  return obj;
}

export function firstError(
  error: z.ZodError | { issues?: { message: string }[] },
): string {
  return error.issues?.[0]?.message || "Please check the form and try again.";
}
