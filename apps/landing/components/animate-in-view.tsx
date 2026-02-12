"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type AnimateInViewProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  as?: "div" | "section" | "li" | "span";
  /** Starting y offset in px (default 16) */
  y?: number;
  /** Starting scale (default 0.98) */
  scale?: number;
  /** Set false to replay every time element enters viewport */
  once?: boolean;
  /** Viewport margin for earlier triggering (default "-60px") */
  margin?: string;
};

export const AnimateInView = ({
  children,
  className,
  delay = 0,
  duration = 0.5,
  as = "div",
  y = 16,
  scale = 0.98,
  once = true,
  margin = "-60px",
}: AnimateInViewProps) => {
  const shouldReduceMotion = useReducedMotion();

  const Component = motion[as] as typeof motion.div;

  if (shouldReduceMotion) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Component
      className={cn(className)}
      initial={{ opacity: 0, y, scale }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once, margin }}
      transition={{
        duration,
        delay,
        ease: [0.23, 1, 0.32, 1], // ease-out-quint
      }}
    >
      {children}
    </Component>
  );
};
