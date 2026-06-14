"use client";

import { motion } from "framer-motion";
import { useCountUp, rise, stagger } from "@/lib/motion";
import LayeredCard from "@/components/ui-kit/LayeredCard";

type Metric = {
  label: string;
  value: number;
  suffix?: string;
  description: string;
  tone: "good" | "warn" | "alert";
};

function MetricCard({ m }: { m: Metric }) {
  const { ref, value } = useCountUp(m.value);
  // Tone drives the left accent bar color (warm states, never pure red/green).
  const bar =
    m.tone === "alert"
      ? "bg-danger"
      : m.tone === "warn"
        ? "bg-warning"
        : "bg-ok";

  return (
    <motion.div variants={rise}>
      <LayeredCard interactive className="p-0">
        <div className="relative p-5">
          <span
            className={`absolute left-0 top-0 h-full w-[3px] ${bar}`}
            aria-hidden
          />
          <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-ink-3">
            {m.label}
          </p>
          <p className="mt-1.5 font-display text-[32px] font-semibold leading-none tracking-tight text-ink">
            <span ref={ref}>{value}</span>
            {m.suffix}
          </p>
          <p className="mt-1.5 text-[13px] text-ink-3">{m.description}</p>
        </div>
      </LayeredCard>
    </motion.div>
  );
}

export default function KpiCards({ metrics }: { metrics: Metric[] }) {
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
