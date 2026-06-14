"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { chart } from "./chartTheme";

type Row = { doctorName: string; avgMinutes: number };

export default function AvgDurationChart({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
      >
        <CartesianGrid stroke={chart.line()} horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v: number) => `${v}min`}
          tick={{ fill: chart.ink3(), fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: chart.line() }}
        />
        <YAxis
          dataKey="doctorName"
          type="category"
          width={120}
          tick={{ fill: chart.ink3(), fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "transparent" }}
          formatter={(v) => [`$${Number(v ?? 0)} min`, "Avg duration"]}
          contentStyle={{
            borderRadius: 4,
            border: `1px solid ${chart.line()}`,
            fontSize: 12,
          }}
        />
        <Bar dataKey="avgMinutes" fill={chart.brand()} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
