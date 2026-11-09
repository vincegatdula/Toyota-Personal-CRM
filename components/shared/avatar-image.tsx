"use client";

import { useState } from "react";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AvatarImage({
  name,
  avatarUrl,
  className,
  textClassName,
}: {
  name: string | null | undefined;
  avatarUrl?: string | null;
  className?: string;
  textClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const label = initials(name);
  if (avatarUrl && !failed) {
    return (
      <span className={cn("relative block overflow-hidden rounded-full bg-[#e8e6e2]", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- signed/public avatar URLs may vary by environment */}
        <img
          src={avatarUrl}
          alt={name || "Profile picture"}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-[#e8e6e2] font-semibold text-stone-700",
        className,
        textClassName,
      )}
      aria-label={name || "Profile"}
    >
      {label}
    </span>
  );
}
