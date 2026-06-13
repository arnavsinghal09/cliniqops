import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Prisma } from "@/lib/generated/prisma/client";

// Server-side route guard. Call at the top of a restricted page/Server Component.
// Hiding nav is cosmetic — THIS is the actual enforcement: a doctor typing
// /upload directly gets redirected, not just a hidden link.
export async function requireRole(allowed: string[]) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!allowed.includes(session.user.role)) redirect("/dashboard");
  return session;
}

// Structural type so we don't have to import next-auth's Session shape here.
type Scopeable = { user: { role: string; clinicId: string; id: string } };

// Appointment filter: always clinic-scoped (tenant isolation); doctors are
// further narrowed to only the appointments assigned to them.
export function appointmentScope(
  session: Scopeable,
): Prisma.AppointmentWhereInput {
  const where: Prisma.AppointmentWhereInput = {
    clinicId: session.user.clinicId,
  };
  if (session.user.role === "DOCTOR") where.doctorId = session.user.id;
  return where;
}

// Patient filter: a doctor sees only patients they've had an appointment with.
export function patientScope(session: Scopeable): Prisma.PatientWhereInput {
  const where: Prisma.PatientWhereInput = { clinicId: session.user.clinicId };
  if (session.user.role === "DOCTOR")
    where.appointments = { some: { doctorId: session.user.id } };
  return where;
}
