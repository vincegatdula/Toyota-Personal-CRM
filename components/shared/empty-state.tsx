import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/60 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      ) : null}
      <p className="text-[14px] font-medium">{title}</p>
      {description ? (
        <p className="max-w-md text-[12px] text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
