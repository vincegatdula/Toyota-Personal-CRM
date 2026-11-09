import { BrandMark } from "@/components/shared/brand-mark";
import { APP_NAME } from "@/lib/constants";

export function DashboardBrand() {
  return (
    <div className="hidden items-center gap-2 rounded-xl border border-border/70 bg-card px-2.5 py-1.5 sm:flex">
      <BrandMark className="h-7 w-7 border border-border/60" />
      <div className="leading-tight">
        <p className="text-[11px] font-semibold">{APP_NAME}</p>
        <p className="text-[10px] text-muted-foreground">Toyota sales workspace</p>
      </div>
    </div>
  );
}
