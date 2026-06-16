"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const CURRENCY = "₹"; // flip to "$" to relabel all amounts app-wide

function shortDoctor(email: string): string {
  return email.includes("@") ? email.split("@")[0] : email;
}
function fmt(n: number): string {
  return `${CURRENCY}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

type Datum = { doctorName: string; totalLeakage: number };

export default function LeakageByDoctorChart({ data }: { data: Datum[] }) {
  const chartData = data.map((d) => ({
    name: shortDoctor(d.doctorName),
    totalLeakage: d.totalLeakage,
  }));

  return (
    <ResponsiveContainer
      width="100%"
      height={Math.max(220, chartData.length * 46)}
    >
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 8, right: 40, top: 4, bottom: 4 }}
      >
        <CartesianGrid
          stroke="var(--color-border)"
          strokeDasharray="3 3"
          horizontal={false}
        />
        <XAxis
          type="number"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--color-ink-3)", fontSize: 11 }}
          tickFormatter={(v: number) => fmt(v)}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--color-ink-2)", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-card)",
            fontSize: 12,
          }}
          cursor={{ fill: "var(--color-accent-mut)", opacity: 0.4 }}
          formatter={(v) => [fmt(Number(v)), "Leakage"]}
        />
        <Bar
          dataKey="totalLeakage"
          fill="var(--color-danger)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
