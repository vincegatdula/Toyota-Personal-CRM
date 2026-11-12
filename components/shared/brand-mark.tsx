"use client";

import { useState } from "react";
import { Car } from "lucide-react";
import { TOYOTA_LOGO_CANDIDATES } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  imageClassName,
  fallbackClassName,
  alt = "Toyota",
  priorityHint = false,
}: {
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  alt?: string;
  priorityHint?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const src = TOYOTA_LOGO_CANDIDATES[index];
  if (!src) {
    return (
      <span
        className={cn(
          "flex items-center justify-center rounded-lg bg-primary text-primary-foreground",
          className,
          fallbackClassName,
        )}
        aria-label={alt}
      >
        <Car className="h-[55%] w-[55%]" />
      </span>
    );
  }

  const isSvg = src.endsWith(".svg");

  return (
    <span
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-lg bg-card text-foreground ring-1 ring-border/60",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local static brand asset with runtime fallback */}
      <img
        src={src}
        alt={alt}
        className={cn(
          "h-full w-full object-contain",
          isSvg && "p-1 dark:invert",
          imageClassName,
        )}
        loading={priorityHint ? "eager" : "lazy"}
        decoding="async"
        onError={() => setIndex((value) => value + 1)}
      />
    </span>
  );
}
