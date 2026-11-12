"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import {
  deleteVehicleModel,
  saveVehicleModel,
  toggleVehicleModel,
} from "@/app/actions/settings";
import { initialActionState } from "@/lib/actions-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DeleteForm } from "@/components/shared/delete-form";
import type { VehicleModel } from "@/types/database";

function AddModelForm() {
  const [state, formAction, pending] = useActionState(
    saveVehicleModel,
    initialActionState,
  );

  return (
    <form
      action={formAction}
      className="grid gap-2 border-b border-border bg-secondary/40 p-3 sm:grid-cols-[1fr_150px_120px]"
    >
      <div className="space-y-1">
        <Label htmlFor="model-name" className="text-[10px]">
          Model name *
        </Label>
        <Input
          id="model-name"
          name="name"
          placeholder="e.g. Vios 1.3 XLE CVT"
          className="h-7 text-[12px]"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="model-variant" className="text-[10px]">
          Variant
        </Label>
        <Input
          id="model-variant"
          name="variant"
          placeholder="Optional"
          className="h-7 text-[12px]"
        />
      </div>
      <div className="flex items-end gap-1.5">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />}
          Add
        </Button>
      </div>
      {!state.ok && state.error ? (
        <span className="text-[10px] text-red-600 sm:col-span-3">{state.error}</span>
      ) : null}
      {state.ok && state.message ? (
        <span className="text-[10px] text-success sm:col-span-3">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

export function ModelsManager({
  models,
  canManage,
}: {
  models: VehicleModel[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return models;
    return models.filter(
      (model) =>
        model.name.toLowerCase().includes(needle) ||
        (model.variant ?? "").toLowerCase().includes(needle),
    );
  }, [models, query]);
  const activeCount = models.filter((model) => model.is_active).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="relative min-w-56 flex-1">
          <Label htmlFor="model-search" className="text-[10px]">
            Vehicle models
          </Label>
          <Search className="pointer-events-none absolute bottom-2 left-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            id="model-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search model or variant…"
            className="h-8 pl-7 text-[12px]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 bottom-2 text-muted-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {filtered.length} shown · {activeCount} active of {models.length}
        </p>
      </div>

      <div className="max-h-[520px] overflow-auto rounded-xl border border-border bg-card">
        {canManage ? (
          <AddModelForm />
        ) : (
          <p className="border-b border-border bg-secondary/40 p-3 text-[11px] text-muted-foreground">
            Only CRM owners and admins can edit the vehicle model catalogue.
          </p>
        )}
        {filtered.length ? (
          filtered.map((model) => (
            <div
              key={model.id}
              className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-1.5 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium">{model.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {[model.make, model.model, model.variant].filter(Boolean).join(" · ")}
                  {" · sort "}
                  {model.sort_order}
                </p>
              </div>
              <Badge tone={model.is_active ? "green" : "neutral"}>
                {model.is_active ? "Active" : "Hidden"}
              </Badge>
              {canManage ? (
                <>
                  <form action={toggleVehicleModel}>
                    <input type="hidden" name="id" value={model.id} />
                    <input
                      type="hidden"
                      name="is_active"
                      value={String(!model.is_active)}
                    />
                    <Button type="submit" size="sm" variant="ghost">
                      {model.is_active ? "Hide" : "Show"}
                    </Button>
                  </form>
                  <DeleteForm
                    action={deleteVehicleModel}
                    id={model.id}
                    label=""
                    message={`Delete "${model.name}" from the model list? Existing records keep their stored model text.`}
                  />
                </>
              ) : null}
            </div>
          ))
        ) : (
          <p className="p-4 text-center text-[12px] text-muted-foreground">
            No models match &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}
