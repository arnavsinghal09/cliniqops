import prisma from "../prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { metricValueSql, type MetricKey } from "@/lib/anomaly-detection";

export async function getAlertsForClinic(clinicId: string) {
  return prisma.alert.findMany({
    where: { clinicId },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
  });
}

/** Last 4 weeks of raw values for the metric, oldest → newest. */
export async function getWeeklyTrendForMetric(
  clinicId: string,
  metric: string,
): Promise<number[]> {
  if (!(metric in metricValueSql)) return [];
  const expr = metricValueSql[metric as MetricKey];

  const rows = await prisma.$queryRaw<{ value: number | null }[]>(Prisma.sql`
    SELECT date_trunc('week', "appointmentDate") AS week,
           CAST((${expr}) AS double precision) AS value
    FROM "Appointment"
    WHERE "clinicId" = ${clinicId}
      AND "appointmentDate" >= date_trunc('week', CURRENT_DATE) - INTERVAL '3 weeks'
    GROUP BY week
    ORDER BY week ASC
  `);

  return rows.map((r) => Number(r.value ?? 0));
}
