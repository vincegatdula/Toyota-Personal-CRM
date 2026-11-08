"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { saveRelease } from "@/app/actions/releases";
import { initialActionState } from "@/lib/actions-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  OPTION_CATEGORIES,
  TRANSACTION_FALLBACK,
} from "@/lib/constants";
import type { OptionMap } from "@/lib/data/options";
import type { LeadPicker } from "@/lib/data/records";
import type { VehicleModel, VehicleRelease } from "@/types/database";

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

interface ReservationOption {
  id: string;
  reservation_code: string;
  lead_id: string;
  reserved_model: string | null;
  current_status: string;
}

export function ReleaseForm({
  record,
  leads,
  reservations,
  options,
  models,
  defaultLeadId,
  today,
}: {
  record?: VehicleRelease;
  leads: LeadPicker[];
  reservations: ReservationOption[];
  options: OptionMap;
  models: VehicleModel[];
  defaultLeadId?: string;
  today: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveRelease,
    initialActionState,
  );
  const [leadId, setLeadId] = useState(record?.lead_id ?? defaultLeadId ?? "");
  const [model, setModel] = useState(record?.model_released ?? "");

  const transactions = labels(
    options,
    OPTION_CATEGORIES.transactionType,
    TRANSACTION_FALLBACK,
    record?.transaction,
  );
  const banks = labels(
    options,
    OPTION_CATEGORIES.financingBank,
    [],
    record?.bank,
  );
  const leadReservations = leadId
    ? reservations.filter((row) => row.lead_id === leadId)
    : reservations;

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
          <CardTitle>Release details</CardTitle>
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
            <Label htmlFor="release_date">Release date *</Label>
            <Input
              id="release_date"
              name="release_date"
              type="date"
              required
              defaultValue={record?.release_date ?? today}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="units_released">Units released</Label>
            <Input
              id="units_released"
              name="units_released"
              type="number"
              min={1}
              step={1}
              defaultValue={record?.units_released ?? 1}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model_released">Model released *</Label>
            <Input
              id="model_released"
              name="model_released"
              list="release-model-options"
              required
              value={model}
              onChange={(event) => setModel(event.target.value)}
            />
            <datalist id="release-model-options">
              {models.map((row) => (
                <option key={row.id} value={row.name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transaction">Transaction</Label>
            <Select
              id="transaction"
              name="transaction"
              defaultValue={record?.transaction ?? ""}
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
            <Label htmlFor="bank">Bank</Label>
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
            <Label htmlFor="reservation_id">Linked reservation</Label>
            <Select
              id="reservation_id"
              name="reservation_id"
              defaultValue={record?.reservation_id ?? ""}
            >
              <option value="">—</option>
              {leadReservations.map((reservation) => (
                <option key={reservation.id} value={reservation.id}>
                  {reservation.reservation_code} ·{" "}
                  {reservation.reserved_model || "No model"} ·{" "}
                  {reservation.current_status}
                </option>
              ))}
            </Select>
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
          <label className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-[12px]">
            <input
              type="checkbox"
              name="update_lead_status"
              defaultChecked={!record}
              className="mt-0.5"
            />
            <span>
              Mark the prospect as <strong>Vehicle Released</strong> and clear
              its next action.
            </span>
          </label>
          <label className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-[12px]">
            <input
              type="checkbox"
              name="update_reservation_status"
              defaultChecked={!record}
              className="mt-0.5"
            />
            <span>
              Set the linked reservation status to <strong>Released</strong>.
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline" type="button">
          <Link href="/releases">Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          {record ? "Save release" : "Record release"}
        </Button>
      </div>
    </form>
  );
}
