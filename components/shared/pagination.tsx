import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Params = Record<string, string | string[] | undefined>;

export function Pagination({
  basePath,
  params,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  params: Params;
  page: number;
  pageSize: number;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) {
    return (
      <p className="px-1 py-2 text-[12px] text-muted-foreground">
        {total} {total === 1 ? "record" : "records"}
      </p>
    );
  }

  function href(target: number) {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || key === "page") continue;
      if (Array.isArray(value)) {
        value.forEach((v) => sp.append(key, v));
      } else {
        sp.set(key, value);
      }
    }
    sp.set("page", String(target));
    return `${basePath}?${sp.toString()}`;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-col items-center justify-between gap-2 px-1 py-2 sm:flex-row">
      <p className="text-[12px] text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <Link
          aria-disabled={page <= 1}
          href={href(Math.max(1, page - 1))}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[12px] font-medium hover:bg-secondary",
            page <= 1 && "pointer-events-none opacity-40",
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Previous
        </Link>
        <span className="px-2 text-[12px] text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Link
          aria-disabled={page >= totalPages}
          href={href(Math.min(totalPages, page + 1))}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[12px] font-medium hover:bg-secondary",
            page >= totalPages && "pointer-events-none opacity-40",
          )}
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
