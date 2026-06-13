"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

export const easeOut = [0.25, 1, 0.5, 1] as const;
export const easeExpo = [0.16, 1, 0.3, 1] as const;

// Workhorse fade+rise for cards, sections, list items.
export const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } },
};

// Container that staggers its children's reveals.
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

// Per-word headline mask reveal (translate up from inside overflow-hidden).
export const wordReveal = {
  hidden: { y: "110%" },
  show: { y: "0%", transition: { duration: 0.6, ease: easeExpo } },
};

/**
 * Count a number up from 0 → target the first time it scrolls into view.
 * Plain requestAnimationFrame (no extra dependency). Respects reduced motion
 * by snapping straight to the target.
 */
export function useCountUp(target: number, durationMs = 900) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      // easeOutExpo for a snappy-then-settle feel.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, target, durationMs]);

  return { ref, value };
}
