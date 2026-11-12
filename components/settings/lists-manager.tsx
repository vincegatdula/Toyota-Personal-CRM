"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Save } from "lucide-react";
import {
  deleteDropdownOption,
  moveDropdownOption,
  saveDropdownOption,
  toggleDropdownOption,
} from "@/app/actions/settings";
import { initialActionState } from "@/lib/actions-helpers";
import { OPTION_CATEGORY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { DeleteForm } from "@/components/shared/delete-form";
import type { OptionMap } from "@/lib/data/options";
import type { DropdownOption } from "@/types/database";

function OptionRow({
  option,
  first,
  last,
}: {
  option: DropdownOption;
  first: boolean;
  last: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    saveDropdownOption,
    initialActionState,
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-2 py-1.5 last:border-b-0">
      <form action={formAction} className="flex flex-1 flex-wrap items-center gap-1.5">
        <input type="hidden" name="id" value={option.id} />
        <input type="hidden" name="category" value={option.category} />
        <Input
          name="label"
          defaultValue={option.label}
          className="h-7 min-w-40 flex-1 text-[12px]"
          aria-label="Option label"
        />
        <Input
          name="sort_order"
          type="number"
          defaultValue={option.sort_order}
          className="h-7 w-16 text-[11px]"
          aria-label="Sort order"
        />
        <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={option.is_active}
            className="h-3 w-3"
          />
          Active
        </label>
        <Button type="submit" size="sm" variant="ghost" disabled={pending} title="Save">
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
        </Button>
        {!state.ok && state.error ? (
          <span className="w-full text-[10px] text-red-600">{state.error}</span>
        ) : null}
      </form>
      <div className="flex items-center gap-0.5">
        <form action={moveDropdownOption}>
          <input type="hidden" name="id" value={option.id} />
          <input type="hidden" name="direction" value="up" />
          <Button type="submit" size="icon-sm" variant="ghost" disabled={first} title="Move up">
            <ArrowUp />
          </Button>
        </form>
        <form action={moveDropdownOption}>
          <input type="hidden" name="id" value={option.id} />
          <input type="hidden" name="direction" value="down" />
          <Button type="submit" size="icon-sm" variant="ghost" disabled={last} title="Move down">
            <ArrowDown />
          </Button>
        </form>
        <form action={toggleDropdownOption}>
          <input type="hidden" name="id" value={option.id} />
          <input type="hidden" name="is_active" value={String(!option.is_active)} />
          <Button type="submit" size="sm" variant="ghost">
            {option.is_active ? "Hide" : "Show"}
          </Button>
        </form>
        {option.is_system ? (
          <Badge tone="neutral">System</Badge>
        ) : (
          <DeleteForm
            action={deleteDropdownOption}
            id={option.id}
            label=""
            message={`Delete "${option.label}"? Records already using it keep their stored value.`}
          />
        )}
      </div>
    </div>
  );
}

function AddOptionForm({ category }: { category: string }) {
  const [state, formAction, pending] = useActionState(
    saveDropdownOption,
    initialActionState,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-1.5 border-t border-border bg-secondary/40 p-2">
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="is_active" value="on" />
      <div className="min-w-40 flex-1 space-y-1">
        <Label htmlFor={`new-option-${category}`} className="text-[10px]">
          Add option
        </Label>
        <Input
          id={`new-option-${category}`}
          name="label"
          placeholder="New option label"
          className="h-7 text-[12px]"
          required
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />}
        Add
      </Button>
      {!state.ok && state.error ? (
        <span className="w-full text-[10px] text-red-600">{state.error}</span>
      ) : null}
      {state.ok && state.message ? (
        <span className="w-full text-[10px] text-success">{state.message}</span>
      ) : null}
    </form>
  );
}

export function ListsManager({ options }: { options: OptionMap }) {
  const categories = useMemo(
    () =>
      Object.keys(OPTION_CATEGORY_LABELS).filter(
        (key) => (options[key]?.length ?? 0) > 0,
      ),
    [options],
  );
  const [category, setCategory] = useState(categories[0] ?? "lead_source");
  const rows = (options[category] ?? []).slice().sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));
  const total = Object.values(options).reduce(
    (sum, list) => sum + list.length,
    0,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="space-y-1">
          <Label htmlFor="option-category">Dropdown list</Label>
          <Select
            id="option-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-8 min-w-56"
          >
            {categories.map((key) => (
              <option key={key} value={key}>
                {OPTION_CATEGORY_LABELS[key]} ({(options[key] ?? []).length})
              </option>
            ))}
          </Select>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {rows.length} options · {total} total configured
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-border bg-secondary/60 px-2 py-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          <span>Label · sort · visibility</span>
          <span>Order / actions</span>
        </div>
        {rows.length ? (
          rows.map((option, index) => (
            <OptionRow
              key={option.id}
              option={option}
              first={index === 0}
              last={index === rows.length - 1}
            />
          ))
        ) : (
          <p className="p-4 text-center text-[12px] text-muted-foreground">
            No options in this list yet.
          </p>
        )}
        <AddOptionForm key={category} category={category} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Hiding an option removes it from entry forms but preserves historical
        records. System options are owned by the workbook and cannot be deleted.
      </p>
    </div>
  );
}
