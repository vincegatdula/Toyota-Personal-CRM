import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/status";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral:
          "border-border bg-muted/60 text-muted-foreground",
        slate:
          "border-slate-300/70 bg-slate-500/10 text-slate-700 dark:border-slate-600/60 dark:text-slate-300",
        blue:
          "border-blue-300/70 bg-blue-500/10 text-blue-700 dark:border-blue-500/40 dark:text-blue-300",
        green:
          "border-emerald-300/70 bg-success/100/10 text-success dark:border-emerald-500/40 dark:text-emerald-300",
        teal:
          "border-teal-300/70 bg-teal-500/10 text-teal-700 dark:border-teal-500/40 dark:text-teal-300",
        amber:
          "border-amber-300/70 bg-warning/100/10 text-warning dark:border-amber-500/40 dark:text-amber-300",
        red:
          "border-red-300/70 bg-destructive/100/10 text-destructive dark:border-red-500/40 dark:text-red-300",
        purple:
          "border-purple-300/70 bg-purple-500/10 text-purple-700 dark:border-purple-500/40 dark:text-purple-300",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  tone?: Tone;
}

function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
