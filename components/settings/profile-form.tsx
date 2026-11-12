"use client";

import { useActionState } from "react";
import { ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { removeProfileAvatar, saveProfile, uploadProfileAvatar } from "@/app/actions/settings";
import { initialActionState } from "@/lib/actions-helpers";
import { AVATAR_ACCEPT } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AvatarImage } from "@/components/shared/avatar-image";
import type { Profile } from "@/types/database";

export function ProfileForm({
  profile,
  email,
  avatarUrl,
}: {
  profile: Profile | null;
  email: string;
  avatarUrl?: string | null;
}) {
  const [state, formAction, pending] = useActionState(saveProfile, initialActionState);
  const [uploadState, uploadAction, uploadPending] = useActionState(uploadProfileAvatar, initialActionState);
  const [removeState, removeAction, removePending] = useActionState(removeProfileAvatar, initialActionState);
  const displayName = profile?.full_name || email || "Profile";

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>Profile picture</CardTitle>
          <CardDescription>
            Upload a PNG, JPEG, or WebP image (max 3 MB). Your picture appears in the app shell.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {uploadState.error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{uploadState.error}</p>
          ) : null}
          {removeState.error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{removeState.error}</p>
          ) : null}
          {uploadState.ok && uploadState.message ? (
            <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-[12px] text-success">{uploadState.message}</p>
          ) : null}
          {removeState.ok && removeState.message ? (
            <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-[12px] text-success">{removeState.message}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-4">
            <AvatarImage name={displayName} avatarUrl={avatarUrl} className="h-16 w-16 text-[16px]" />
            <form action={uploadAction} className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="avatar">Upload image</Label>
                <Input id="avatar" name="avatar" type="file" accept={AVATAR_ACCEPT} className="max-w-[280px]" />
              </div>
              <Button type="submit" size="sm" variant="outline" disabled={uploadPending}>
                {uploadPending ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                Upload
              </Button>
            </form>
            <form action={removeAction}>
              <Button type="submit" size="sm" variant="ghost" disabled={removePending || !avatarUrl}>
                {removePending ? <Loader2 className="animate-spin" /> : <Trash2 />}
                Remove
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <form action={formAction}>
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Your name appears on the app shell and activity records.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {state.error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive sm:col-span-2">
                {state.error}
              </p>
            ) : null}
            {state.ok && state.message ? (
              <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-[12px] text-success sm:col-span-2">
                {state.message}
              </p>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} placeholder="Your full name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={profile?.email ?? email} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Mobile number</Label>
              <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} placeholder="09xx xxx xxxx" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Title / position</Label>
              <Input id="title" name="title" defaultValue={profile?.title ?? ""} placeholder="Sales consultant" />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="status">Status line</Label>
              <Input id="status" name="status" defaultValue={profile?.status ?? ""} placeholder="e.g. Available for client calls" />
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border pt-3 sm:col-span-2">
              <p className="text-[11px] text-muted-foreground">Signed in as {email}</p>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Save />}
                Save profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
