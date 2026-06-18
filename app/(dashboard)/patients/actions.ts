"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getPatientHistory, getFollowUps } from "@/lib/queries/patients";
import { getScope } from "@/lib/queries/scope";

export async function markPatientContacted(patientId: string, notes: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { clinicId: true },
  });
  if (!patient) throw new Error("Patient not found");
  if (patient.clinicId !== session.user.clinicId) throw new Error("Forbidden");

  await prisma.followUpAction.create({
    data: {
      patientId,
      clinicId: session.user.clinicId,
      notes: notes.trim(),
      createdByUserId: session.user.id,
    },
  });

  revalidatePath("/patients");
}

// One call returns the visit history AND the logged follow-ups for the drawer.
export async function getPatientDrawerData(patientId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const scope = getScope(session);

  const [history, followUps] = await Promise.all([
    getPatientHistory(patientId, scope),
    getFollowUps(patientId, scope),
  ]);

  return { history, followUps };
}
