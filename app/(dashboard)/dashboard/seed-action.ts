"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function loadDemoData(): Promise<
  { ok: true; created: number } | { ok: false; error: string }
> {
  const session = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };

  const clinicId = session.user.clinicId;

  // Idempotency: if appointments already exist, don't seed again.
  const existing = await prisma.appointment.count({ where: { clinicId } });
  if (existing > 0) {
    return { ok: false, error: "Your clinic already has data." };
  }

  // Need at least one doctor to attach appointments to.
  const doctor = await prisma.user.findFirst({
    where: { clinicId },
    select: { id: true },
  });
  if (!doctor) return { ok: false, error: "No user found for this clinic." };

  const patientNames = [
    "Aarav Sharma",
    "Diya Patel",
    "Vivaan Mehta",
    "Anaya Singh",
    "Reyansh Kumar",
    "Ananya Reddy",
    "Kabir Nair",
    "Ishaan Gupta",
  ];

  const types = ["Consultation", "Follow-up", "New patient", "Check-up"];
  const statuses = [
    "COMPLETED",
    "COMPLETED",
    "COMPLETED",
    "NO_SHOW",
    "CANCELLED",
    "SCHEDULED",
  ] as const;
  const cptCodes = ["99212", "99213", "99214", "99215"];

  let created = 0;
  const now = new Date();

  for (const name of patientNames) {
    const patient = await prisma.patient.create({
      data: {
        clinicId,
        name,
        icd10Codes: Math.random() > 0.5 ? ["E11.9"] : [],
        lastVisitDate: new Date(now.getTime() - Math.random() * 60 * 86400000),
      },
    });

    // 3–5 appointments per patient over the last ~10 weeks.
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor(Math.random() * 70);
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const duration = [15, 20, 30, 35, 45][Math.floor(Math.random() * 5)];
      const billed = status === "COMPLETED" && Math.random() > 0.3;

      await prisma.appointment.create({
        data: {
          clinicId,
          doctorId: doctor.id,
          patientId: patient.id,
          appointmentDate: new Date(now.getTime() - daysAgo * 86400000),
          durationMinutes: duration,
          appointmentType: types[Math.floor(Math.random() * types.length)],
          status,
          billedCptCode: billed
            ? cptCodes[Math.floor(Math.random() * cptCodes.length)]
            : null,
          billedAmount: billed ? 50 + Math.floor(Math.random() * 100) : null,
        },
      });
      created++;
    }
  }

  revalidatePath("/dashboard");
  return { ok: true, created };
}
