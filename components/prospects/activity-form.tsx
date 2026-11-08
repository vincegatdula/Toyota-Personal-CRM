"use client";

import { useActionState } from "react";
import { Loader2, Plus } from "lucide-react";
import { addActivity } from "@/app/actions/leads";
import { initialActionState } from "@/lib/actions-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  ACTIVITY_TYPE_FALLBACK,
  OPTION_CATEGORIES,
} from "@/lib/constants";
import type { OptionMap } from "@/lib/data/options";

export function ActivityForm({
  leadId,
  options,
  now,
}: {
  leadId: string;
  options: OptionMap;
  now: string;
}) {
  const [state, formAction, pending] = useActionState(
    addActivity,
    initialActionState,
  );
  const types = (options[OPTION_CATEGORIES.activityType] ?? []).map(
    (row) => row.label,
  );
  const activityTypes = types.length ? types : ACTIVITY_TYPE_FALLBACK;

  return (
    <form action={formAction} className="space-y-2.5">
      <input type="hidden" name="lead_id" value={leadId} />
      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-700">
          {state.message}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="activity_type">Type</Label>
          <Select id="activity_type" name="activity_type" defaultValue={activityTypes[0]}>
            {activityTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="activity_at">When</Label>
          <Input
            id="activity_at"
            name="activity_at"
            type="datetime-local"
            defaultValue={now}
            required
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="summary">Summary</Label>
        <Input
          id="summary"
          name="summary"
          placeholder="What happened?"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="Details, objections, commitments…"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="outcome">Outcome</Label>
        <Input
          id="outcome"
          name="outcome"
          placeholder="e.g. Waiting for bank approval"
        />
      </div>
      <Button type="submit" size="sm" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />}
        Log activity
      </Button>
    </form>
  );
}
