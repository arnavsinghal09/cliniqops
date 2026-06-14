"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { chart } from "./chartTheme";

type Row = { day: string; cancellationRate: number; total: number };

export default function CancellationChart({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
      >
        <CartesianGrid stroke={chart.line()} vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: chart.ink3(), fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: chart.line() }}
        />
        <YAxis
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fill: chart.ink3(), fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ stroke: chart.line() }}
          formatter={(v) => [
            `${Number(v).toFixed(1)}%`,
            "Cancellation",
          ]}
          contentStyle={{
            borderRadius: 4,
            border: `1px solid ${chart.line()}`,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="cancellationRate"
          stroke={chart.brand()}
          strokeWidth={2}
          dot={{ fill: chart.clay(), r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
