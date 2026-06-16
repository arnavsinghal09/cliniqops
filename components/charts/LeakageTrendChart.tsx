"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const CURRENCY = "₹";

function fmt(n: number): string {
  return `${CURRENCY}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

type Datum = { month: string; totalLeakage: number };

export default function LeakageTrendChart({ data }: { data: Datum[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ left: 4, right: 16, top: 8, bottom: 4 }}>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--color-ink-3)", fontSize: 11 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--color-ink-3)", fontSize: 11 }}
          tickFormatter={(v: number) => fmt(v)}
        />
        <Tooltip
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-card)",
            fontSize: 12,
          }}
          formatter={(v) => [fmt(Number(v)), "Leakage"]}
        />
        <Line
          type="monotone"
          dataKey="totalLeakage"
          stroke="var(--color-danger)"
          strokeWidth={2}
          dot={{ fill: "var(--color-danger)", r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "var(--color-danger)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
