import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AVATAR_BUCKET } from "@/lib/brand";

const SIGNED_URL_TTL = 60 * 60; // 1 hour

export function normalizeAvatarPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Already an absolute URL (legacy/manual). Do not rewrite.
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return trimmed.replace(/^\/+/, "");
}

export function isAvatarStoragePath(value: string | null | undefined): value is string {
  const normalized = normalizeAvatarPath(value);
  return Boolean(normalized && !/^https?:\/\//i.test(normalized));
}

export function isAllowedAvatarPath(path: string, userId: string): boolean {
  return path.startsWith(`avatars/${userId}/`) && !path.includes("..");
}

export async function createAvatarSignedUrl(
  pathOrUrl: string | null | undefined,
  allowedUserId?: string,
): Promise<string | null> {
  const normalized = normalizeAvatarPath(pathOrUrl);
  if (!normalized) return null;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (allowedUserId && !isAllowedAvatarPath(normalized, allowedUserId)) return null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(normalized, SIGNED_URL_TTL);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
