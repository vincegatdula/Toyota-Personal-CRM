import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "brand" | "positive" | "warning" | "danger";
  className?: string;
}) {
  const iconTone = {
    default: "bg-secondary text-muted-foreground",
    brand: "bg-brand/10 text-brand",
    positive: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
  }[tone];

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-xl border border-border bg-card p-3.5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md",
              iconTone,
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <div className="mt-2">
        <p className="text-[24px] leading-none font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        {hint ? (
          <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
