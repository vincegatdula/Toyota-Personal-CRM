"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { saveLead } from "@/app/actions/leads";
import { initialActionState } from "@/lib/actions-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LEAD_SOURCE_FALLBACK,
  OPTION_CATEGORIES,
  PIPELINE_STATUS_FALLBACK,
  SALES_CHANNEL_FALLBACK,
  TRANSACTION_FALLBACK,
} from "@/lib/constants";
import type { OptionMap } from "@/lib/data/options";
import type { Lead, VehicleModel } from "@/types/database";

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

export function LeadForm({
  lead,
  options,
  models,
  defaults,
  cancelHref = "/prospects",
}: {
  lead?: Lead;
  options: OptionMap;
  models: VehicleModel[];
  defaults?: { date_created?: string; lead_source?: string; pipeline_status?: string };
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState(saveLead, initialActionState);

  const sources = labels(options, OPTION_CATEGORIES.leadSource, LEAD_SOURCE_FALLBACK, lead?.lead_source);
  const transactions = labels(
    options,
    OPTION_CATEGORIES.transactionType,
    TRANSACTION_FALLBACK,
    lead?.transaction,
  );
  const channels = labels(
    options,
    OPTION_CATEGORIES.salesChannel,
    SALES_CHANNEL_FALLBACK,
    lead?.sales_channel,
  );
  const statuses = labels(
    options,
    OPTION_CATEGORIES.pipelineStatus,
    PIPELINE_STATUS_FALLBACK,
    lead?.pipeline_status,
  );

  return (
    <form action={formAction} className="space-y-3">
      {lead ? <input type="hidden" name="id" value={lead.id} /> : null}

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {state.error}
        </p>
      ) : null}

      <Card>
        <CardHeader className="p-3.5">
          <CardTitle>Prospect details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-3.5 pt-0 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="date_created">Date created *</Label>
            <Input
              id="date_created"
              name="date_created"
              type="date"
              required
              defaultValue={lead?.date_created ?? defaults?.date_created}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead_source">Lead source *</Label>
            <Select
              id="lead_source"
              name="lead_source"
              required
              defaultValue={lead?.lead_source ?? defaults?.lead_source ?? sources[0]}
            >
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="prospect_name">Prospect name *</Label>
            <Input
              id="prospect_name"
              name="prospect_name"
              required
              maxLength={200}
              defaultValue={lead?.prospect_name ?? ""}
              placeholder="Full name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="preferred_model">Preferred model</Label>
            <Input
              id="preferred_model"
              name="preferred_model"
              list="vehicle-model-options"
              defaultValue={lead?.preferred_model ?? ""}
              placeholder="e.g. Vios 1.3 XLE CVT"
            />
            <datalist id="vehicle-model-options">
              {models.map((model) => (
                <option key={model.id} value={model.name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transaction">Transaction</Label>
            <Select
              id="transaction"
              name="transaction"
              defaultValue={lead?.transaction ?? ""}
            >
              <option value="">—</option>
              {transactions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sales_channel">Sales channel</Label>
            <Select
              id="sales_channel"
              name="sales_channel"
              defaultValue={lead?.sales_channel ?? ""}
            >
              <option value="">—</option>
              {channels.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="purchase_timeline">Purchase timeline</Label>
            <Input
              id="purchase_timeline"
              name="purchase_timeline"
              type="date"
              defaultValue={lead?.purchase_timeline ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3.5">
          <CardTitle>Pipeline & next action</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-3.5 pt-0 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pipeline_status">Pipeline status *</Label>
            <Select
              id="pipeline_status"
              name="pipeline_status"
              required
              defaultValue={lead?.pipeline_status ?? defaults?.pipeline_status ?? "New Prospect"}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_contact_date">Last contact date</Label>
            <Input
              id="last_contact_date"
              name="last_contact_date"
              type="date"
              defaultValue={lead?.last_contact_date ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="next_action">Next action</Label>
            <Input
              id="next_action"
              name="next_action"
              defaultValue={lead?.next_action ?? ""}
              placeholder="e.g. Send quotation"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="next_action_due_date">Next action due date</Label>
            <Input
              id="next_action_due_date"
              name="next_action_due_date"
              type="date"
              defaultValue={lead?.next_action_due_date ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3.5">
          <CardTitle>Contact & notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-3.5 pt-0 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contact_number">Contact number</Label>
            <Input
              id="contact_number"
              name="contact_number"
              defaultValue={lead?.contact_number ?? ""}
              placeholder="09xx xxx xxxx"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={lead?.email ?? ""}
              placeholder="name@example.com"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              defaultValue={lead?.location ?? ""}
              placeholder="City / area"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              name="remarks"
              rows={4}
              defaultValue={lead?.remarks ?? ""}
              placeholder="Context, preferences, objections, and anything worth remembering."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline" type="button">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          {lead ? "Save changes" : "Create prospect"}
        </Button>
      </div>
    </form>
  );
}
