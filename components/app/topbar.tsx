import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/app/global-search";
import { MobileNav } from "@/components/app/mobile-nav";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { UserMenu } from "@/components/app/user-menu";
import { BrandMark } from "@/components/shared/brand-mark";
import type { AlertSummary } from "@/lib/data/alerts";

export function Topbar({
  name,
  email,
  avatarUrl,
  alerts,
  isAdmin,
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
  alerts: AlertSummary;
  isAdmin?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-[#fbfbfa]/90 backdrop-blur">
      <div className="flex h-12 items-center gap-2 px-3 sm:px-4">
        <MobileNav name={name} email={email} avatarUrl={avatarUrl} isAdmin={isAdmin} />
        <Link href="/dashboard" className="hidden items-center gap-2 lg:flex" aria-label="Dashboard">
          <BrandMark className="h-7 w-7 border border-border/60" />
        </Link>
        <GlobalSearch />
        <div className="ml-auto flex items-center gap-1">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/prospects/new">
              <Plus /> New prospect
            </Link>
          </Button>
          <Button asChild size="icon-sm" className="sm:hidden">
            <Link href="/prospects/new" aria-label="New prospect">
              <Plus />
            </Link>
          </Button>
          <NotificationsMenu alerts={alerts} />
          <UserMenu name={name} email={email} avatarUrl={avatarUrl} isAdmin={isAdmin} />
        </div>
      </div>
    </header>
  );
}
