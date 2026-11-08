"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { saveLostSale } from "@/app/actions/lost-sales";
import { initialActionState } from "@/lib/actions-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LEAD_SOURCE_FALLBACK,
  LOST_SALE_REASON_FALLBACK,
  LOST_SALE_STAGE_FALLBACK,
  OPTION_CATEGORIES,
  OPTION_CATEGORY_LABELS,
} from "@/lib/constants";
import type { OptionMap } from "@/lib/data/options";
import type { LeadPicker } from "@/lib/data/records";
import type { LostSale, VehicleModel } from "@/types/database";

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

export function LostSaleForm({
  record,
  leads,
  options,
  models,
  defaultLeadId,
  today,
}: {
  record?: LostSale;
  leads: LeadPicker[];
  options: OptionMap;
  models: VehicleModel[];
  defaultLeadId?: string;
  today: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveLostSale,
    initialActionState,
  );
  const [leadId, setLeadId] = useState(record?.lead_id ?? defaultLeadId ?? "");
  const [source, setSource] = useState(record?.lead_source ?? "");
  const [model, setModel] = useState(record?.preferred_model ?? "");

  const reasons = labels(
    options,
    OPTION_CATEGORIES.lostSaleReason,
    LOST_SALE_REASON_FALLBACK,
    record?.primary_loss_reason,
  );
  const stages = labels(
    options,
    OPTION_CATEGORIES.lostSaleStage,
    LOST_SALE_STAGE_FALLBACK,
    record?.pipeline_stage_when_lost,
  );
  const sources = labels(
    options,
    OPTION_CATEGORIES.leadSource,
    LEAD_SOURCE_FALLBACK,
    record?.lead_source,
  );
  const recoveryStatuses = labels(
    options,
    OPTION_CATEGORIES.recoveryStatus,
    ["open", "recovered", "closed"],
    record?.recovery_status,
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
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {state.error}
        </p>
      ) : null}

      <Card>
        <CardHeader className="p-3.5">
          <CardTitle>Lost sale</CardTitle>
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
            <Label htmlFor="date_marked_lost">Date marked lost *</Label>
            <Input
              id="date_marked_lost"
              name="date_marked_lost"
              type="date"
              required
              defaultValue={record?.date_marked_lost ?? today}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="primary_loss_reason">Primary loss reason *</Label>
            <Select
              id="primary_loss_reason"
              name="primary_loss_reason"
              required
              defaultValue={record?.primary_loss_reason ?? reasons[0]}
            >
              {reasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
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
              list="lost-model-options"
              value={model}
              onChange={(event) => setModel(event.target.value)}
            />
            <datalist id="lost-model-options">
              {models.map((row) => (
                <option key={row.id} value={row.name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pipeline_stage_when_lost">Stage when lost</Label>
            <Select
              id="pipeline_stage_when_lost"
              name="pipeline_stage_when_lost"
              defaultValue={record?.pipeline_stage_when_lost ?? ""}
            >
              <option value="">—</option>
              {stages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estimated_units_lost">Estimated units lost</Label>
            <Input
              id="estimated_units_lost"
              name="estimated_units_lost"
              type="number"
              min={1}
              step={1}
              defaultValue={record?.estimated_units_lost ?? 1}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="competitor_alternative">Competitor / alternative</Label>
            <Input
              id="competitor_alternative"
              name="competitor_alternative"
              defaultValue={record?.competitor_alternative ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="financing_payment_issue">Financing / payment issue</Label>
            <Input
              id="financing_payment_issue"
              name="financing_payment_issue"
              defaultValue={record?.financing_payment_issue ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="recovery_status">
              Recovery status ({OPTION_CATEGORY_LABELS.recovery_status})
            </Label>
            <Select
              id="recovery_status"
              name="recovery_status"
              defaultValue={record?.recovery_status ?? "open"}
            >
              {recoveryStatuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="recovery_next_action">Recovery next action</Label>
            <Input
              id="recovery_next_action"
              name="recovery_next_action"
              defaultValue={record?.recovery_next_action ?? ""}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="coaching_notes">Coaching notes</Label>
            <Textarea
              id="coaching_notes"
              name="coaching_notes"
              rows={3}
              defaultValue={record?.coaching_notes ?? ""}
            />
          </div>
          <label className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-[12px] sm:col-span-2">
            <input
              type="checkbox"
              name="recoverable"
              defaultChecked={record?.recoverable ?? false}
              className="mt-0.5"
            />
            <span>This loss looks recoverable — keep a recovery action.</span>
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline" type="button">
          <Link href="/lost-sales">Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          {record ? "Save lost sale" : "Mark lost"}
        </Button>
      </div>
    </form>
  );
}
