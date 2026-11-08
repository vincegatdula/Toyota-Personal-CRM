"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";
import { saveProfile } from "@/app/actions/settings";
import { initialActionState } from "@/lib/actions-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Profile } from "@/types/database";

export function ProfileForm({
  profile,
  email,
}: {
  profile: Profile | null;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(saveProfile, initialActionState);

  return (
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
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700 sm:col-span-2">
              {state.error}
            </p>
          ) : null}
          {state.ok && state.message ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700 sm:col-span-2">
              {state.message}
            </p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={profile?.full_name ?? ""}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={profile?.email ?? email}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Mobile number</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={profile?.phone ?? ""}
              placeholder="09xx xxx xxxx"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title / position</Label>
            <Input
              id="title"
              name="title"
              defaultValue={profile?.title ?? ""}
              placeholder="Sales consultant"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="status">Status line</Label>
            <Input
              id="status"
              name="status"
              defaultValue={profile?.status ?? ""}
              placeholder="e.g. Available for client calls"
            />
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border pt-3 sm:col-span-2">
            <p className="text-[11px] text-muted-foreground">
              Signed in as {email}
            </p>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Save />}
              Save profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
