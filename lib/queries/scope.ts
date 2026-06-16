import type { Session } from "next-auth";

export type Scope = { clinicId: string; doctorId?: string };

export function getScope(session: Session): Scope {
  if (session.user.role === "DOCTOR") {
    return { clinicId: session.user.clinicId, doctorId: session.user.id };
  }
  return { clinicId: session.user.clinicId };
}
