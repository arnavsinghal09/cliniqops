"use client";

// Thin component wrapper around the useCountUp hook from lib/motion.ts so JSX
// can drop in <CountUp value={n} /> directly. Counts 0 → value once when it
// scrolls into view; snaps straight to the value under reduced motion (the hook
// already handles that). Renders an inline <span> so it sits inside headings.
import { useCountUp } from "@/lib/motion";

type Props = {
  value: number;
  durationMs?: number;
  className?: string;
};

export default function CountUp({ value, durationMs, className }: Props) {
  const { ref, value: current } = useCountUp(value, durationMs);
  return (
    <span ref={ref} className={className}>
      {current}
    </span>
  );
}
