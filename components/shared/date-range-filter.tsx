import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { normalizedDateRangeForInput, resolveDateRange, type DateRangePreset } from "@/lib/date-range";
import { cn } from "@/lib/utils";

const PRESETS: { label: string; value: DateRangePreset }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "This Year", value: "this_year" },
  { label: "All Time", value: "all_time" },
];

export function DateRangeFilter({
  from,
  to,
  preset,
  className,
  showPresets = true,
}: {
  from?: string;
  to?: string;
  preset?: string;
  className?: string;
  showPresets?: boolean;
}) {
  const resolved = resolveDateRange({
    from,
    to,
    preset: preset as DateRangePreset | undefined,
  });
  const normalized = normalizedDateRangeForInput(resolved);
  return (
    <div className={cn("flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-end", className)}>
      {showPresets ? (
        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
          <span>Range</span>
          <Select name="range" defaultValue={normalized.preset || ""} className="h-8 w-full sm:w-auto sm:min-w-36">
            <option value="">Custom / All</option>
            {PRESETS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
        <span>From</span>
        <Input
          type="date"
          name="from"
          defaultValue={normalized.from}
          className="h-8 w-full sm:w-[150px]"
          aria-label="From date"
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
        <span>To</span>
        <Input
          type="date"
          name="to"
          defaultValue={normalized.to}
          className="h-8 w-full sm:w-[150px]"
          aria-label="To date"
        />
      </label>
    </div>
  );
}

export function DateRangeActions({ resetHref }: { resetHref: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Button type="submit" size="sm" variant="outline">Apply</Button>
      <Button asChild type="button" size="sm" variant="ghost">
        <a href={resetHref}>Reset</a>
      </Button>
    </div>
  );
}
