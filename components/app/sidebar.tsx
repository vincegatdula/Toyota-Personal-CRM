import Link from "next/link";
import { NavItems } from "@/components/app/nav-items";
import { BrandMark } from "@/components/shared/brand-mark";
import { AvatarImage } from "@/components/shared/avatar-image";
import { APP_NAME, APP_SUBTITLE } from "@/lib/constants";

export function Sidebar({
  name,
  email,
  avatarUrl,
  isAdmin,
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
  isAdmin?: boolean;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col border-r border-border bg-[#fbfbfa] px-3 py-4 lg:flex">
      <Link href="/dashboard" className="mb-5 flex items-center gap-2 px-1.5">
        <BrandMark className="h-8 w-8 border border-border/60" priorityHint />
        <span>
          <span className="block text-[13px] leading-tight font-semibold">
            {APP_NAME}
          </span>
          <span className="block text-[10px] leading-tight text-muted-foreground">
            {APP_SUBTITLE}
          </span>
        </span>
      </Link>

      <NavItems isAdmin={isAdmin} />

      <div className="mt-auto border-t border-border pt-3">
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-[#f2f1ef]"
        >
          <AvatarImage name={name} avatarUrl={avatarUrl} className="h-7 w-7 text-[10px]" />
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
