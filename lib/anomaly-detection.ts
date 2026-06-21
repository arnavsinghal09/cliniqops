import { startOfWeek, getISOWeek } from "date-fns";
import prisma from "./prisma";
import { Prisma } from "@/lib/generated/prisma/client";

// ── ML sidecar types ──────────────────────────────────────────────────────────
export type MLFeatures = {
  no_show_rate: number;
  sms_sent_rate: number;
  avg_lead_time_days: number;
  week_of_year: number;
  rolling_mean_4w: number;
};

export type MLPrediction = {
  is_anomaly: boolean;
  anomaly_score: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | null;
};

export type MetricKey =
  | "noShowRate"
  | "cancellationRate"
  | "totalRevenue"
  | "unbilledCount";

export const METRICS: MetricKey[] = [
  "noShowRate",
  "cancellationRate",
  "totalRevenue",
  "unbilledCount",
];

// Per-metric weekly value expression. Parameter-free SQL fragments (no user
// input) composed into a parameterized Prisma.sql query — never string concat.
export const metricValueSql: Record<MetricKey, Prisma.Sql> = {
  noShowRate: Prisma.sql`COUNT(*) FILTER (WHERE status = 'NO_SHOW')::float / NULLIF(COUNT(*), 0)`,
  cancellationRate: Prisma.sql`COUNT(*) FILTER (WHERE status = 'CANCELLED')::float / NULLIF(COUNT(*), 0)`,
  totalRevenue: Prisma.sql`COALESCE(SUM("billedAmount") FILTER (WHERE status = 'COMPLETED'), 0)`,
  unbilledCount: Prisma.sql`COUNT(*) FILTER (WHERE status = 'COMPLETED' AND "billedCptCode" IS NULL)`,
};

type Severity = "LOW" | "MEDIUM" | "HIGH";

/** Most recent Monday at 00:00:00 UTC. */
export function currentWeekOf(): Date {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  return new Date(
    Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()),
  );
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function severityFor(deviationPercent: number): Severity | null {
  const abs = Math.abs(deviationPercent);
  if (abs > 25) return "HIGH";
  if (abs > 15) return "MEDIUM";
  if (abs > 10) return "LOW";
  return null;
}

async function weeklyValues(
  clinicId: string,
  metric: MetricKey,
): Promise<number[]> {
  // Current week + the 12 prior weeks, oldest → newest.
  const rows = await prisma.$queryRaw<{ value: number | null }[]>(Prisma.sql`
    SELECT date_trunc('week', "appointmentDate") AS week,
           CAST((${metricValueSql[metric]}) AS double precision) AS value
    FROM "Appointment"
    WHERE "clinicId" = ${clinicId}
      AND "appointmentDate" >= date_trunc('week', CURRENT_DATE) - INTERVAL '12 weeks'
    GROUP BY week
    ORDER BY week ASC
  `);
  return rows.map((r) => Number(r.value ?? 0));
}

async function callMLService(
  features: MLFeatures,
): Promise<MLPrediction | null> {
  const base =
    process.env.ML_SERVICE_URL ?? "http://localhost:8000";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(`${base}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(features),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as MLPrediction;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Returns the count of HIGH-severity alerts created/updated this run. */
export async function detectAnomaliesForClinic(
  clinicId: string,
): Promise<number> {
  const weekOf = currentWeekOf();
  let highCount = 0;

  for (const metric of METRICS) {
    const values = await weeklyValues(clinicId, metric);
    if (values.length < 2) continue; // need current + at least one baseline week

    const currentValue = values[values.length - 1];
    const baselinePool = values.slice(0, -1).slice(-12); // up to 12 prior weeks
    const baselineValue = median(baselinePool);

    if (baselineValue === 0) continue; // avoid divide-by-zero

    const deviationPercent =
      ((currentValue - baselineValue) / baselineValue) * 100;

    // ── ML path (non-blocking; falls back to statistical on any failure) ──
    const noShowValues = await weeklyValues(clinicId, "noShowRate");
    const rollingSlice = noShowValues.slice(-5, -1); // 4 weeks before current
    const rolling_mean_4w =
      rollingSlice.length > 0
        ? rollingSlice.reduce((a, b) => a + b, 0) / rollingSlice.length
        : noShowValues[noShowValues.length - 1] ?? 0;

    const mlFeatures: MLFeatures = {
      no_show_rate: noShowValues[noShowValues.length - 1] ?? 0,
      sms_sent_rate: 0, // not available in Prisma aggregates; ML model handles 0
      avg_lead_time_days: 0, // same — no lead-time column in Appointment yet
      week_of_year: getISOWeek(weekOf),
      rolling_mean_4w,
    };

    const mlPrediction = await callMLService(mlFeatures);
    const mlDetected = mlPrediction?.severity != null;
    const severity: Severity | null =
      mlPrediction?.severity ?? severityFor(deviationPercent);

    if (!severity) continue;

    await prisma.alert.upsert({
      where: {
        clinicId_metric_weekOf: { clinicId, metric, weekOf },
      },
      create: {
        clinicId,
        alertType: "WEEKLY_METRIC_DEVIATION",
        metric,
        currentValue,
        baselineValue,
        deviationPercent,
        severity,
        weekOf,
        mlDetected,
      },
      update: {
        currentValue,
        baselineValue,
        deviationPercent,
        severity,
        mlDetected,
        // isRead deliberately left untouched on re-runs
      },
    });

    if (severity === "HIGH") highCount++;
  }

  return highCount;
}
