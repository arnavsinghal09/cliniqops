import prisma from "@/lib/prisma";
import {
  detectAnomaliesForClinic,
  currentWeekOf,
} from "@/lib/anomaly-detection";
import { sendAnomalyDigest } from "@/lib/email/anomaly-digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const clinics = await prisma.clinic.findMany();
  const weekOf = currentWeekOf();

  // Sequential to avoid hammering the DB with parallel heavy aggregations.
  for (const clinic of clinics) {
    const highCount = await detectAnomaliesForClinic(clinic.id);
    if (highCount === 0) continue;

    const alerts = await prisma.alert.findMany({
      where: { clinicId: clinic.id, severity: "HIGH", weekOf },
    });

    const admins = await prisma.user.findMany({
      where: { clinicId: clinic.id, role: "ADMIN" },
    });

    const digestAlerts = alerts.map((a) => ({
      metric: a.metric,
      currentValue: a.currentValue,
      baselineValue: a.baselineValue,
      deviationPercent: a.deviationPercent,
      severity: a.severity as string,
    }));

    for (const admin of admins) {
      await sendAnomalyDigest(admin.email, clinic.name, digestAlerts);
    }
  }

  return Response.json({ clinicsProcessed: clinics.length });
}
