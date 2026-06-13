"use client";

import { motion } from "framer-motion";
import { useCountUp, rise, stagger } from "@/lib/motion";

type Metric = {
  label: string;
  value: number;
  suffix?: string;
  description: string;
  tone: "good" | "warn" | "alert";
};

function MetricCard({ m }: { m: Metric }) {
  // Number animates 0 -> value once, on mount/in-view.
  const { ref, value } = useCountUp(m.value);
  // Left border encodes the metric's mood: green good, amber watch, red alert.
  const border =
    m.tone === "alert"
      ? "border-l-danger"
      : m.tone === "warn"
        ? "border-l-warning"
        : "border-l-brand";

  return (
    <motion.div
      variants={rise}
      className={`rounded-card border-l-[3px] bg-surface p-5 shadow-card transition-transform duration-150 hover:-translate-y-0.5 ${border}`}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">
        {m.label}
      </p>
      <p className="mt-1 text-[32px] font-bold leading-tight text-ink">
        <span ref={ref}>{value}</span>
        {m.suffix}
      </p>
      <p className="mt-1 text-[13px] text-ink-4">{m.description}</p>
    </motion.div>
  );
}

export default function KpiCards({ metrics }: { metrics: Metric[] }) {
  // stagger container: each card rises+fades 60ms after the previous one.
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {metrics.map((m) => (
        <MetricCard key={m.label} m={m} />
      ))}
    </motion.div>
  );
}
