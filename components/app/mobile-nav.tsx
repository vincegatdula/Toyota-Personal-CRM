"use client";

import { useState } from "react";
import Link from "next/link";
import { Car, Menu, X } from "lucide-react";
import { NavItems } from "@/components/app/nav-items";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

export function MobileNav({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu />
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full w-[268px] flex-col border-r border-border bg-card p-3">
            <div className="mb-5 flex items-center justify-between px-1">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Car className="h-4 w-4" />
                </span>
                <span className="text-[13px] font-semibold">{APP_NAME}</span>
              </Link>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
              >
                <X />
              </Button>
            </div>
            <NavItems onNavigate={() => setOpen(false)} />
            <div className="mt-auto border-t border-border pt-3 text-[11px] text-muted-foreground">
              <p className="truncate font-medium text-foreground">{name}</p>
              <p className="truncate">{email}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
