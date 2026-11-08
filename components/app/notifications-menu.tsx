"use client";

import Link from "next/link";
import { Bell, CalendarClock, FileWarning, Landmark, ListChecks } from "lucide-react";
import type { AlertSummary } from "@/lib/data/alerts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function NotificationsMenu({ alerts }: { alerts: AlertSummary }) {
  const items = [
    {
      href: "/prospects?followUp=overdue",
      icon: CalendarClock,
      label: "Overdue follow-ups",
      count: alerts.overdueFollowUps,
    },
    {
      href: "/prospects?followUp=today",
      icon: ListChecks,
      label: "Follow-ups due today",
      count: alerts.dueToday,
    },
    {
      href: "/financing?status=Pending+documents",
      icon: FileWarning,
      label: "Pending financing documents",
      count: alerts.pendingDocuments,
    },
    {
      href: "/financing?status=pending",
      icon: Landmark,
      label: "Financing in progress",
      count: alerts.pendingFinancing,
    },
    {
      href: "/reservations?status=Pending+Unit",
      icon: CalendarClock,
      label: "Awaiting unit",
      count: alerts.awaitingUnit,
    },
    {
      href: "/reservations?overdue=1",
      icon: CalendarClock,
      label: "Overdue releases",
      count: alerts.overdueReleases,
    },
  ].filter((item) => item.count > 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label="Alerts"
        >
          <Bell />
          {alerts.total > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-semibold text-white">
              {alerts.total > 99 ? "99+" : alerts.total}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Needs attention</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length ? (
          items.map((item) => (
            <DropdownMenuItem key={item.label} asChild>
              <Link href={item.href} className="justify-between">
                <span className="flex items-center gap-2">
                  <item.icon />
                  {item.label}
                </span>
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                  {item.count}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        ) : (
          <p className="px-2 py-3 text-[12px] text-muted-foreground">
            Nothing needs attention right now.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
