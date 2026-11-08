"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { saveReservation } from "@/app/actions/reservations";
import { initialActionState } from "@/lib/actions-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  OPTION_CATEGORIES,
  RESERVATION_STATUS_FALLBACK,
  SALES_CHANNEL_FALLBACK,
} from "@/lib/constants";
import type { OptionMap } from "@/lib/data/options";
import type { LeadPicker } from "@/lib/data/records";
import type { Reservation, VehicleModel } from "@/types/database";

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

export function ReservationForm({
  record,
  leads,
  options,
  models,
  defaultLeadId,
  today,
}: {
  record?: Reservation;
  leads: LeadPicker[];
  options: OptionMap;
  models: VehicleModel[];
  defaultLeadId?: string;
  today: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveReservation,
    initialActionState,
  );
  const [leadId, setLeadId] = useState(record?.lead_id ?? defaultLeadId ?? "");
  const [model, setModel] = useState(record?.reserved_model ?? "");

  const statuses = labels(
    options,
    OPTION_CATEGORIES.reservationStatus,
    RESERVATION_STATUS_FALLBACK,
    record?.current_status,
  );
  const channels = labels(
    options,
    OPTION_CATEGORIES.salesChannel,
    SALES_CHANNEL_FALLBACK,
    record?.sales_channel,
  );

  function onLeadChange(value: string) {
    setLeadId(value);
    const lead = leads.find((row) => row.id === value);
    if (lead) setModel(lead.preferred_model ?? "");
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
          <CardTitle>Reservation</CardTitle>
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
            <Label htmlFor="reservation_date">Reservation date</Label>
            <Input
              id="reservation_date"
              name="reservation_date"
              type="date"
              defaultValue={record?.reservation_date ?? today}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="current_status">Current status *</Label>
            <Select
              id="current_status"
              name="current_status"
              required
              defaultValue={record?.current_status ?? statuses[0]}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reserved_model">Reserved model</Label>
            <Input
              id="reserved_model"
              name="reserved_model"
              list="reservation-model-options"
              value={model}
              onChange={(event) => setModel(event.target.value)}
            />
            <datalist id="reservation-model-options">
              {models.map((row) => (
                <option key={row.id} value={row.name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sales_channel">Sales channel</Label>
            <Select
              id="sales_channel"
              name="sales_channel"
              defaultValue={record?.sales_channel ?? ""}
            >
              <option value="">—</option>
              {channels.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expected_release_date">Expected release date</Label>
            <Input
              id="expected_release_date"
              name="expected_release_date"
              type="date"
              defaultValue={record?.expected_release_date ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_customer_update">Last customer update</Label>
            <Input
              id="last_customer_update"
              name="last_customer_update"
              defaultValue={record?.last_customer_update ?? ""}
              placeholder="e.g. Unit ETA confirmed"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="next_action">Next action</Label>
            <Input
              id="next_action"
              name="next_action"
              defaultValue={record?.next_action ?? ""}
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
          <Link href="/reservations">Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          {record ? "Save reservation" : "Add reservation"}
        </Button>
      </div>
    </form>
  );
}
