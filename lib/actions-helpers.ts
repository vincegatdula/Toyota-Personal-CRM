import { ZodError } from "zod";
import { firstError } from "@/lib/validation";

export interface ActionState {
  ok: boolean;
  error?: string;
  message?: string;
  values?: Record<string, string>;
}

export const initialActionState: ActionState = { ok: true };

export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue;
    if (value instanceof File) continue;
    values[key] = String(value);
  }
  return values;
}

export function actionError(
  error: unknown,
  values?: Record<string, string>,
): ActionState {
  if (error instanceof ZodError) {
    return { ok: false, error: firstError(error), values };
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message, values };
  }
  return { ok: false, error: "Something went wrong. Please try again.", values };
}

export function n(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

export function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function bool(value: unknown): boolean {
  return value === "on" || value === "true" || value === true || value === "1";
}
