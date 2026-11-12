"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { saveFinancing } from "@/app/actions/financing";
import { initialActionState } from "@/lib/actions-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FINANCING_STATUS_FALLBACK,
  LEAD_SOURCE_FALLBACK,
  OPTION_CATEGORIES,
} from "@/lib/constants";
import type { OptionMap } from "@/lib/data/options";
import type { LeadPicker } from "@/lib/data/records";
import type { FinancingApplication, VehicleModel } from "@/types/database";

function labels(
  options: OptionMap,
  category: string,
  fallback: string[],
  current?: string | null,
) {
  const values = (options[category] ?? []).map((row) => row.label);
  const base = values.length ? values : fallback;
  return current && !base.includes(current) ? [current, ...base] : base;
}

export function FinancingForm({
  record,
  leads,
  options,
  models,
  defaultLeadId,
  today,
}: {
  record?: FinancingApplication;
  leads: LeadPicker[];
  options: OptionMap;
  models: VehicleModel[];
  defaultLeadId?: string;
  today: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveFinancing,
    initialActionState,
  );
  const [leadId, setLeadId] = useState(record?.lead_id ?? defaultLeadId ?? "");
  const [source, setSource] = useState(record?.lead_source ?? "");
  const [model, setModel] = useState(record?.preferred_model ?? "");

  const banks = labels(options, OPTION_CATEGORIES.financingBank, []);
  const statuses = labels(
    options,
    OPTION_CATEGORIES.financingStatus,
    FINANCING_STATUS_FALLBACK,
    record?.application_status,
  );
  const sources = labels(
    options,
    OPTION_CATEGORIES.leadSource,
    LEAD_SOURCE_FALLBACK,
    record?.lead_source,
  );

  function onLeadChange(value: string) {
    setLeadId(value);
    const lead = leads.find((row) => row.id === value);
    if (lead) {
      setSource(lead.lead_source ?? "");
      setModel(lead.preferred_model ?? "");
    }
  }

  return (
    <form action={formAction} className="space-y-3">
      {record ? <input type="hidden" name="id" value={record.id} /> : null}
      {state.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
          {state.error}
        </p>
      ) : null}

      <Card>
        <CardHeader className="p-3.5">
          <CardTitle>Application</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-3.5 pt-0 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lead_id">Prospect *</Label>
            <Select
              id="lead_id"
              name="lead_id"
              required
              value={leadId}
              onChange={(event) => onLeadChange(event.target.value)}
            >
              <option value="">Select a prospect</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.prospect_name} ({lead.lead_code})
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date_submitted">Date submitted</Label>
            <Input
              id="date_submitted"
              name="date_submitted"
              type="date"
              defaultValue={record?.date_submitted ?? today}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="application_status">Application status *</Label>
            <Select
              id="application_status"
              name="application_status"
              required
              defaultValue={record?.application_status ?? statuses[0]}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead_source">Lead source</Label>
            <Select
              id="lead_source"
              name="lead_source"
              value={source}
              onChange={(event) => setSource(event.target.value)}
            >
              <option value="">—</option>
              {sources.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="preferred_model">Preferred model</Label>
            <Input
              id="preferred_model"
              name="preferred_model"
              list="financing-model-options"
              value={model}
              onChange={(event) => setModel(event.target.value)}
            />
            <datalist id="financing-model-options">
              {models.map((row) => (
                <option key={row.id} value={row.name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bank">Bank / financing channel</Label>
            <Select id="bank" name="bank" defaultValue={record?.bank ?? ""}>
              <option value="">—</option>
              {banks.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date_approval">Date approved</Label>
            <Input
              id="date_approval"
              name="date_approval"
              type="date"
              defaultValue={record?.date_approval ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="approved_dp">Approved DP (rate or amount)</Label>
            <Input
              id="approved_dp"
              name="approved_dp"
              type="number"
              step="0.01"
              min="0"
              defaultValue={record?.approved_dp ?? ""}
              placeholder="0.20"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date_released">Date released</Label>
            <Input
              id="date_released"
              name="date_released"
              type="date"
              defaultValue={record?.date_released ?? ""}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              name="remarks"
              rows={3}
              defaultValue={record?.remarks ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline" type="button">
          <Link href="/financing">Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          {record ? "Save application" : "Add application"}
        </Button>
      </div>
    </form>
  );
}
