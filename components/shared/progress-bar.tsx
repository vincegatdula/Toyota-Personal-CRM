import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  tone = "default",
}: {
  value: number;
  className?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const fill = {
    default: "bg-primary",
    success: "bg-emerald-600",
    warning: "bg-warning/100",
    danger: "bg-red-600",
  }[tone];

  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all", fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
