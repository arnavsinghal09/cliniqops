import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function requireRole(allowed: string[]) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!allowed.includes(session.user.role)) redirect("/dashboard");
  return session;
}

type Scopeable = { user: { role: string; clinicId: string; id: string } };

export function appointmentScope(
  session: Scopeable,
): Prisma.AppointmentWhereInput {
  const where: Prisma.AppointmentWhereInput = {
    clinicId: session.user.clinicId,
  };
  if (session.user.role === "DOCTOR") where.doctorId = session.user.id;
  return where;
}

export function patientScope(session: Scopeable): Prisma.PatientWhereInput {
  const where: Prisma.PatientWhereInput = { clinicId: session.user.clinicId };
  if (session.user.role === "DOCTOR")
    where.appointments = { some: { doctorId: session.user.id } };
  return where;
}
