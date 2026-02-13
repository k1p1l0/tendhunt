"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface SculptorIconProps {
  size?: number;
  animate?: boolean;
  className?: string;
}

export function SculptorIcon({ size = 24, animate = false, className }: SculptorIconProps) {
  return (
    <Image
      src="/sculptor.png"
      alt=""
      width={size}
      height={size}
      aria-hidden="true"
      priority={size > 40}
      className={cn(
        "dark:invert",
        animate && "sculptor-icon-animated",
        className
      )}
    />
  );
}
