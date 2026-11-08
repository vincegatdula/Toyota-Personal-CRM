import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      className={cn(
        "mb-4 flex flex-col gap-2 rounded-xl border border-border bg-card p-2.5 lg:flex-row lg:flex-wrap lg:items-center",
        className,
      )}
    >
      {children}
    </form>
  );
}

export function SearchField({
  name = "q",
  placeholder = "Search…",
  defaultValue,
  className,
}: {
  name?: string;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-[180px] flex-1", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-8 w-full rounded-lg border border-input bg-card pr-3 pl-8 text-[13px] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:outline-none"
      />
    </div>
  );
}
