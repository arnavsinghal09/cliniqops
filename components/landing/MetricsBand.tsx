"use client";

import { useCountUp } from "@/lib/motion";
import SectionLabel from "@/components/ui-kit/SectionLabel";

const STATS = [
  { value: 32, suffix: "%", label: "fewer no-shows in the first quarter" },
  {
    value: 14,
    suffix: " hrs",
    label: "saved per week on manual reconciliation",
  },
  {
    value: 25,
    prefix: "$",
    suffix: "K",
    label: "in unbilled visits recovered, on average",
  },
];

function Stat({
  value,
  prefix = "",
  suffix,
  label,
}: {
  value: number;
  prefix?: string;
  suffix: string;
  label: string;
}) {
  const { ref, value: current } = useCountUp(value);
  return (
    <div className="text-center">
      <p className="font-display text-5xl font-semibold tracking-tight text-surface">
        {prefix}
        <span ref={ref}>{current}</span>
        {suffix}
      </p>
      <p className="mx-auto mt-2 max-w-56 text-sm text-brand-muted/80">
        {label}
      </p>
    </div>
  );
}

export default function MetricsBand() {
  return (
    <section
      id="results"
      className="relative overflow-hidden bg-brand-dk py-24"
    >
      <span aria-hidden className="grain-tex opacity-[0.06]" />
      <div className="relative mx-auto max-w-5xl px-6">
        <SectionLabel
          eyebrow="The bottom line"
          title="Real numbers from real clinic teams"
          level={2}
          align="center"
          className="[&_p]:text-brand-muted [&_h2]:text-surface"
        />
        <div className="mt-14 grid grid-cols-1 gap-12 md:grid-cols-3">
          {STATS.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}
