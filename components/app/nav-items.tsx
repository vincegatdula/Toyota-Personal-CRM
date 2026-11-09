"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  Car,
  KanbanSquare,
  Landmark,
  LayoutDashboard,
  Settings,
  Shield,
  TrendingDown,
  Users,
  type LucideIcon,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  KanbanSquare,
  Landmark,
  CalendarClock,
  Car,
  TrendingDown,
  BarChart3,
  Settings,
  Shield,
};

export function NavItems({
  onNavigate,
  className,
  isAdmin,
}: {
  onNavigate?: () => void;
  className?: string;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const items = isAdmin
    ? [...NAV_ITEMS.slice(0, -1), { href: "/settings?tab=admin", label: "Admin", icon: "Shield" as const }, NAV_ITEMS[NAV_ITEMS.length - 1]]
    : [...NAV_ITEMS];

  return (
    <nav className={cn("flex flex-col gap-0.5", className)}>
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active =
          item.href === "/settings?tab=admin"
            ? pathname.startsWith("/settings")
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const label = item.href === "/settings?tab=admin" ? "User management" : item.label;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
              active && (item.href !== "/settings?tab=admin" || pathname.startsWith("/settings"))
                ? "bg-[#f2f1ef] text-foreground"
                : "text-stone-600 hover:bg-[#f6f5f3] hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                active && (item.href !== "/settings?tab=admin" || pathname.startsWith("/settings")) ? "text-brand" : "text-stone-400",
              )}
            />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
