import Link from "next/link";
import { Car } from "lucide-react";
import { NavItems } from "@/components/app/nav-items";
import { APP_NAME, APP_SUBTITLE } from "@/lib/constants";
import { initials } from "@/lib/format";

export function Sidebar({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col border-r border-border bg-[#fbfbfa] px-3 py-4 lg:flex">
      <Link href="/dashboard" className="mb-5 flex items-center gap-2 px-1.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Car className="h-4 w-4" />
        </span>
        <span>
          <span className="block text-[13px] leading-tight font-semibold">
            {APP_NAME}
          </span>
          <span className="block text-[10px] leading-tight text-muted-foreground">
            {APP_SUBTITLE}
          </span>
        </span>
      </Link>

      <NavItems />

      <div className="mt-auto border-t border-border pt-3">
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-[#f2f1ef]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e8e6e2] text-[10px] font-semibold text-stone-700">
            {initials(name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12px] font-medium">{name}</span>
            <span className="block truncate text-[10px] text-muted-foreground">
              {email}
            </span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
