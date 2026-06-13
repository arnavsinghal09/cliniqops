"use client";

import { useCountUp } from "@/lib/motion";

const STATS = [
  { value: 32, suffix: "%", label: "fewer no-shows in the first quarter" },
  {
    value: 14,
    suffix: " hrs",
    label: "saved per week on manual reconciliation",
  },
  { value: 25, suffix: "K", label: "in unbilled visits recovered, on average" },
];

function Stat({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix: string;
  label: string;
}) {
  const { ref, value: current } = useCountUp(value);
  return (
    <div className="text-center">
      <p className="font-display text-4xl font-semibold text-white md:text-5xl">
        <span ref={ref}>{current}</span>
        {suffix}
      </p>
      <p className="mx-auto mt-2 max-w-56 text-sm text-white/70">
        {label}
      </p>
    </div>
  );
}

export default function MetricsBand() {
  return (
    <section
      className="py-20"
      style={{
        background:
          "linear-gradient(135deg, var(--color-brand), var(--color-brand-grad-to))",
      }}
    >
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 px-6 md:grid-cols-3">
        {STATS.map((s) => (
          <Stat key={s.label} {...s} />
        ))}
      </div>
    </section>
  );
}
