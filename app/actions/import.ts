"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { analyzeWorkbook } from "@/lib/import/analyze";
import { commitWorkbookImport } from "@/lib/import/commit";
import type { CommitResult, ImportPreview } from "@/lib/import/types";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export interface PreviewResult {
  ok: boolean;
  error?: string;
  preview?: ImportPreview;
}

export interface CommitActionResult {
  ok: boolean;
  error?: string;
  result?: CommitResult;
}

export async function previewWorkbookImport(
  formData: FormData,
): Promise<PreviewResult> {
  await requireUser();
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Choose an .xlsx workbook to analyze." };
    }
    if (file.size > MAX_FILE_BYTES) {
      return { ok: false, error: "The workbook must be 10 MB or smaller." };
    }
    const buffer = await file.arrayBuffer();
    const preview = analyzeWorkbook(buffer, file.name);
    return { ok: true, preview };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? `Could not read the workbook: ${error.message}`
          : "Could not read the workbook.",
    };
  }
}

export async function commitWorkbookImportAction(
  preview: ImportPreview,
): Promise<CommitActionResult> {
  const { supabase, user } = await requireUser();
  try {
    if (!preview || !Array.isArray(preview.leads)) {
      return { ok: false, error: "The import preview is missing or invalid." };
    }
    const result = await commitWorkbookImport(supabase, user.id, preview);
    revalidatePath("/", "layout");
    revalidatePath("/import");
    revalidatePath("/dashboard");
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "The import could not be completed.",
    };
  }
}
