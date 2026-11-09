"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2, Save, UserPlus, KeyRound } from "lucide-react";
import { adminCreateUser, adminSaveTargetForUser, adminSetUserPassword, adminUpdateUser } from "@/app/actions/admin";
import { initialActionState } from "@/lib/actions-helpers";
import { MONTH_NAMES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AvatarImage } from "@/components/shared/avatar-image";
import type { Profile } from "@/types/database";

type AdminProfile = Profile & { avatar_signed_url?: string | null };

function ActionMessage({ state }: { state: { ok: boolean; error?: string; message?: string } }) {
  if (state.error) return <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{state.error}</p>;
  if (state.ok && state.message) return <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">{state.message}</p>;
  return null;
}

export function AdminUsersManager({
  profiles,
  initialYear,
  initialMonth,
  currentUserId,
}: {
  profiles: AdminProfile[];
  initialYear: number;
  initialMonth: number;
  currentUserId: string;
}) {
  const [createState, createAction, createPending] = useActionState(adminCreateUser, initialActionState);
  const [updateState, updateAction, updatePending] = useActionState(adminUpdateUser, initialActionState);
  const [passwordState, passwordAction, passwordPending] = useActionState(adminSetUserPassword, initialActionState);
  const [targetState, targetAction, targetPending] = useActionState(adminSaveTargetForUser, initialActionState);
  const [selectedId, setSelectedId] = useState(profiles[0]?.id ?? "");
  const selected = useMemo(() => profiles.find((profile) => profile.id === selectedId) ?? profiles[0] ?? null, [profiles, selectedId]);

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>Admin: create account</CardTitle>
          <CardDescription>
            Creates a secure account through the server-side Supabase Admin API. Public invite-only registration remains enabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="new_full_name">Full name</Label><Input id="new_full_name" name="full_name" /></div>
            <div className="space-y-1.5"><Label htmlFor="new_email">Email</Label><Input id="new_email" name="email" type="email" required /></div>
            <div className="space-y-1.5"><Label htmlFor="new_password">Temporary password</Label><Input id="new_password" name="password" type="password" minLength={8} required /></div>
            <div className="space-y-1.5">
              <Label htmlFor="new_role">Role</Label>
              <Select id="new_role" name="role" defaultValue="user" className="h-9">
                <option value="user">User</option>
                <option value="admin">Administrator</option>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="new_phone">Mobile number</Label><Input id="new_phone" name="phone" /></div>
            <div className="space-y-1.5"><Label htmlFor="new_title">Title / position</Label><Input id="new_title" name="title" /></div>
            <div className="sm:col-span-2"><ActionMessage state={createState} /></div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" size="sm" disabled={createPending}>{createPending ? <Loader2 className="animate-spin" /> : <UserPlus />}Create user</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Manage accounts, roles, profiles, and targets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => setSelectedId(profile.id)}
                className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left ${selected?.id === profile.id ? "border-brand/40 bg-brand/5" : "border-border hover:bg-secondary/50"}`}
              >
                <AvatarImage name={profile.full_name || profile.email} avatarUrl={profile.avatar_signed_url} className="h-8 w-8 text-[10px]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium">{profile.full_name || profile.email || profile.id}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{profile.email || "No email"}</span>
                </span>
                <Badge tone={profile.role === "owner" || profile.role === "admin" ? "red" : "neutral"}>{profile.role}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {selected ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>User profile & role</CardTitle>
                  <CardDescription>
                    Changes are applied server-side. The last administrator cannot be demoted.
                    {selected.id === currentUserId ? " You are editing your own account." : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={updateAction} key={`user-${selected.id}`} className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="user_id" value={selected.id} />
                    <div className="space-y-1.5"><Label htmlFor="edit_full_name">Full name</Label><Input id="edit_full_name" name="full_name" defaultValue={selected.full_name ?? ""} /></div>
                    <div className="space-y-1.5"><Label htmlFor="edit_email">Email</Label><Input id="edit_email" name="email" type="email" defaultValue={selected.email ?? ""} required /></div>
                    <div className="space-y-1.5"><Label htmlFor="edit_phone">Mobile number</Label><Input id="edit_phone" name="phone" defaultValue={selected.phone ?? ""} /></div>
                    <div className="space-y-1.5"><Label htmlFor="edit_title">Title / position</Label><Input id="edit_title" name="title" defaultValue={selected.title ?? ""} /></div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit_role">Role</Label>
                      <Select id="edit_role" name="role" defaultValue={selected.role === "owner" ? "admin" : selected.role === "admin" ? "admin" : "user"} className="h-9">
                        <option value="user">User</option>
                        <option value="admin">Administrator</option>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label htmlFor="edit_status">Status line</Label><Input id="edit_status" name="status" defaultValue={selected.status ?? ""} /></div>
                    <div className="sm:col-span-2"><ActionMessage state={updateState} /></div>
                    <div className="sm:col-span-2 flex justify-end">
                      <Button type="submit" size="sm" disabled={updatePending}>{updatePending ? <Loader2 className="animate-spin" /> : <Save />}Save user</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Set password</CardTitle>
                  <CardDescription>Admin-only password reset through the service-role API. Existing passwords are never exposed.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={passwordAction} key={`pw-${selected.id}`} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="user_id" value={selected.id} />
                    <div className="min-w-[240px] flex-1 space-y-1.5"><Label htmlFor="edit_password">New password</Label><Input id="edit_password" name="password" type="password" minLength={8} required /></div>
                    <Button type="submit" size="sm" variant="outline" disabled={passwordPending}>{passwordPending ? <Loader2 className="animate-spin" /> : <KeyRound />}Update password</Button>
                    <div className="w-full"><ActionMessage state={passwordState} /></div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Individual monthly target</CardTitle>
                  <CardDescription>Set or override a selected user&apos;s target for a specific month.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={targetAction} key={`target-${selected.id}`} className="grid gap-3 sm:grid-cols-3">
                    <input type="hidden" name="user_id" value={selected.id} />
                    <div className="space-y-1.5"><Label htmlFor="target_year">Year</Label><Input id="target_year" name="year" type="number" defaultValue={initialYear} min={2000} max={2100} /></div>
                    <div className="space-y-1.5">
                      <Label htmlFor="target_month">Month</Label>
                      <Select id="target_month" name="month" defaultValue={String(initialMonth)} className="h-9">
                        {MONTH_NAMES.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
                      </Select>
                    </div>
                    <div />
                    <div className="space-y-1.5"><Label htmlFor="admin_sales_target">Sales target</Label><Input id="admin_sales_target" name="sales_target" type="number" min={0} defaultValue={0} /></div>
                    <div className="space-y-1.5"><Label htmlFor="admin_financing_target">Financing target</Label><Input id="admin_financing_target" name="financing_target" type="number" min={0} defaultValue={0} /></div>
                    <div className="space-y-1.5"><Label htmlFor="admin_tfs_target">TFS target</Label><Input id="admin_tfs_target" name="tfs_target" type="number" min={0} defaultValue={0} /></div>
                    <div className="sm:col-span-3"><ActionMessage state={targetState} /></div>
                    <div className="sm:col-span-3 flex justify-end">
                      <Button type="submit" size="sm" disabled={targetPending}>{targetPending ? <Loader2 className="animate-spin" /> : <Save />}Save user target</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
