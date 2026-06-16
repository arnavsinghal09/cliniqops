"use client";

import CountUp from "@/components/ui-kit/CountUp";

export default function LeakageHero({ amount }: { amount: number }) {
  return (
    <CountUp
      value={Math.round(amount)}
      format={(n) =>
        `₹${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      }
    />
  );
}
