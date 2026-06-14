"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { chart } from "./chartTheme";

type Row = {
  doctorName: string;
  unbilledCount: number;
  estimatedRevenueLost: number;
};

export default function UnbilledVisitsChart({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={chart.line()} vertical={false} />
        <XAxis
          dataKey="doctorName"
          tick={{ fill: chart.ink3(), fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: chart.line() }}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: chart.ink3(), fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={(v: number) => `₹${v.toLocaleString("en-IN")}`}
          tick={{ fill: chart.ink3(), fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "transparent" }}
          contentStyle={{
            borderRadius: 4,
            border: `1px solid ${chart.line()}`,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          yAxisId="left"
          dataKey="unbilledCount"
          name="Unbilled visits"
          fill={chart.amber()}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          yAxisId="right"
          dataKey="estimatedRevenueLost"
          name="Est. ₹ lost"
          fill={chart.clay()}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
