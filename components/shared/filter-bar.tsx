import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterBar({
  children,
  className,
  compact = false,
}: {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <form
      className={cn(
        "mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-end",
        compact && "mb-0 p-2.5",
        className,
      )}
    >
      {children}
    </form>
  );
}

export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex w-full flex-col gap-1 text-[11px] font-medium text-muted-foreground sm:w-auto",
        className,
      )}
    >
      <span>{label}</span>
      {children}
    </label>
  );
}

export function SearchField({
  name = "q",
  placeholder = "Search…",
  defaultValue,
  className,
  label = "Search",
}: {
  name?: string;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
  label?: string;
}) {
  return (
    <FilterField label={label} className={cn("min-w-[200px] flex-1", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-input bg-card pr-3 pl-8 text-[13px] text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:outline-none"
        />
      </div>
    </FilterField>
  );
}
