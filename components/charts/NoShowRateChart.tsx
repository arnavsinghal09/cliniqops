"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { chart } from "./chartTheme";

type Row = { doctorName: string; noShowRate: number; total: number };

function NoShowTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-sm border border-line bg-surface px-3 py-2 text-xs shadow-card">
      <p className="font-semibold text-ink">{label}</p>
      <p className="mt-0.5 text-ink-2">
        {r.noShowRate.toFixed(1)}% no-show rate
      </p>
      <p className="text-ink-3">{r.total} appointments</p>
    </div>
  );
}

export default function NoShowRateChart({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={chart.line()} vertical={false} />
        <XAxis
          dataKey="doctorName"
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
        <Tooltip cursor={{ fill: "transparent" }} content={<NoShowTooltip />} />
        <ReferenceLine
          y={15}
          stroke={chart.danger()}
          strokeDasharray="4 4"
          label={{
            value: "15% threshold",
            fill: chart.danger(),
            fontSize: 11,
            position: "insideTopRight",
          }}
        />
        <Bar dataKey="noShowRate" fill={chart.brand()} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
