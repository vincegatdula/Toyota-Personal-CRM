"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { LogOut, Moon, Settings, Shield, UserRound } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AvatarImage } from "@/components/shared/avatar-image";
import { cn } from "@/lib/utils";

export function UserMenu({
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
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const darkMode = mounted && resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Account menu">
          <AvatarImage name={name} avatarUrl={avatarUrl} className="h-6 w-6 text-[10px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
        <div className="px-2 pb-2">
          <p className="truncate text-[12px] font-medium">{name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings?tab=profile">
            <UserRound /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings?tab=targets">
            <Settings /> Targets &amp; settings
          </Link>
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/user-management">
              <Shield /> User management
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setTheme(darkMode ? "light" : "dark");
          }}
          className="justify-between"
        >
          <span className="flex items-center gap-2">
            <Moon /> Dark mode
          </span>
          <span
            role="switch"
            aria-checked={darkMode}
            aria-label="Dark mode"
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-border transition-colors",
              darkMode ? "bg-brand" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
                darkMode ? "translate-x-[18px]" : "translate-x-[2px]",
              )}
            />
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] outline-none hover:bg-secondary"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
            Sign out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
