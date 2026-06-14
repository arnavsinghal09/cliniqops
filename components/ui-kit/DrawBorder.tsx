"use client";

import { motion, useReducedMotion } from "framer-motion";
import { drawBorder } from "@/lib/motion";

// Wraps any content and draws a hairline rectangle border that TRACES ITSELF
// (pathLength 0→1) the first time it scrolls into view — the literal "// draw
// border paths" effect from tennr.com's feature blocks. The wrapped content
// supplies its own background/padding; this only adds the animated outline.

type Props = {
  children: React.ReactNode;
  radius?: number; // corner radius in px (match the card, default 6)
  className?: string;
  color?: string; // stroke color; defaults to the warm hairline token
};

export default function DrawBorder({
  children,
  radius = 6,
  className = "",
  color = "var(--color-line-2)",
}: Props) {
  const reduce = useReducedMotion();

  return (
    <div className={`relative ${className}`}>
      {children}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      >
        <motion.rect
          x="0.5"
          y="0.5"
          width="99%"
          height="99%"
          rx={radius}
          fill="none"
          stroke={color}
          strokeWidth={1}
          variants={drawBorder}
          initial={reduce ? "show" : "hidden"}
          whileInView="show"
          viewport={{ once: true, margin: "-15%" }}
        />
      </svg>
    </div>
  );
}
