"use client";

import { useActionState } from "react";
import { Loader2, UserRoundCog } from "lucide-react";
import { adminReassignLead } from "@/app/actions/admin";
import { initialActionState } from "@/lib/actions-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function ReassignLeadCard({
  leadId,
  currentOwnerId,
  owners,
}: {
  leadId: string;
  currentOwnerId: string;
  owners: { id: string; full_name: string | null; email: string | null; role: string | null }[];
}) {
  const [state, formAction, pending] = useActionState(adminReassignLead, initialActionState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin: reassign lead</CardTitle>
        <CardDescription>
          Moves the lead and its related CRM records to another user in one transactional database operation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="lead_id" value={leadId} />
          {state.error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{state.error}</p> : null}
          {state.ok && state.message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">{state.message}</p> : null}
          <div className="space-y-1.5">
            <Label htmlFor="new_owner_id">Assign to user</Label>
            <Select id="new_owner_id" name="new_owner_id" defaultValue={currentOwnerId} className="h-9" required>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {(owner.full_name || owner.email || owner.id)}{owner.id === currentOwnerId ? " (current owner)" : ""}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Reassignment note (optional)</Label>
            <Textarea id="note" name="note" rows={2} placeholder="Reason or handoff note" />
          </div>
          <Button type="submit" size="sm" variant="outline" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <UserRoundCog />}
            Reassign lead
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
