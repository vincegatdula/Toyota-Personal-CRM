"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { NavItems } from "@/components/app/nav-items";
import { BrandMark } from "@/components/shared/brand-mark";
import { AvatarImage } from "@/components/shared/avatar-image";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

export function MobileNav({
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
  const [open, setOpen] = useState(false);
  const canUseDOM = typeof document !== "undefined";

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const drawer = open ? (
    <div className="lg:hidden" role="presentation">
      <button
        type="button"
        aria-label="Close navigation"
        data-mobile-nav-backdrop="true"
        className="fixed inset-0 z-[110] h-[100dvh] w-screen bg-black/50 backdrop-blur-[1px]"
        onClick={() => setOpen(false)}
      />
      <div
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        data-mobile-nav-drawer="true"
        className="fixed inset-y-0 left-0 z-[120] flex h-[100dvh] w-[min(20rem,calc(100vw-3rem))] flex-col overflow-y-auto overscroll-contain border-r border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pt-[max(0.75rem,env(safe-area-inset-top))] text-foreground shadow-xl"
      >
        <div className="mb-5 flex shrink-0 items-center justify-between px-1">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2"
          >
            <BrandMark className="h-8 w-8" />
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
        <NavItems isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
        <div className="mt-auto flex shrink-0 items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <AvatarImage name={name} avatarUrl={avatarUrl} className="h-7 w-7 text-[10px]" />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{name}</p>
            <p className="truncate">{email}</p>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
      >
        <Menu />
      </Button>
      {canUseDOM && drawer ? createPortal(drawer, document.body) : null}
    </>
  );
}
