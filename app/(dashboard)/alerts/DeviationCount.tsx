"use client";

import CountUp from "@/components/ui-kit/CountUp";

export default function DeviationCount({ value }: { value: number }) {
  const sign = value >= 0 ? "+" : "-";
  return (
    <CountUp
      value={Math.round(Math.abs(value) * 10)}
      format={(n) => `${sign}${(n / 10).toFixed(1)}%`}
    />
  );
}
