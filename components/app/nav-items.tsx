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
import { isSettingsNavActive, isUserManagementNavActive } from "@/lib/settings-tabs";

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
    ? [
        ...NAV_ITEMS.slice(0, -1),
        { href: "/user-management", label: "User management", icon: "Shield" as const },
        { href: "/settings", label: "Settings", icon: "Settings" as const },
      ]
    : [...NAV_ITEMS];

  return (
    <nav className={cn("flex flex-col gap-0.5", className)}>
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active =
          item.href === "/user-management"
            ? isUserManagementNavActive(pathname)
            : item.href === "/settings"
              ? isSettingsNavActive(pathname)
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
              active
                ? "bg-[#f2f1ef] text-foreground"
                : "text-stone-600 hover:bg-[#f6f5f3] hover:text-foreground",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-brand" : "text-stone-400")} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
