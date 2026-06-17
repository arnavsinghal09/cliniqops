"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export type CreateRoomInput = {
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  scheduledAt?: string;
  existingPatientId?: string;
};

export async function createConsultationRoom(
  input: CreateRoomInput,
): Promise<{ roomId: string; roomToken: string; patientLink: string }> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const clinicId = session.user.clinicId;
  const doctorId = session.user.id;

  const patientName = input.patientName?.trim();
  if (!patientName) throw new Error("Patient name is required");

  // If an existing patient was chosen, verify it belongs to this clinic.
  let patientId: string | null = null;
  if (input.existingPatientId) {
    const patient = await prisma.patient.findUnique({
      where: { id: input.existingPatientId },
    });
    if (!patient || patient.clinicId !== clinicId) {
      throw new Error("Selected patient not found in your clinic");
    }
    patientId = patient.id;
  }

  const room = await prisma.consultationRoom.create({
    data: {
      clinicId,
      doctorId,
      patientId,
      patientName,
      patientEmail: input.patientEmail?.trim() || null,
      patientPhone: input.patientPhone?.trim() || null,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      status: "WAITING",
    },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const patientLink = `${base}/consultation/${room.roomToken}`;

  revalidatePath("/scribe");
  return { roomId: room.id, roomToken: room.roomToken, patientLink };
}

export async function startConsultation(roomId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const room = await prisma.consultationRoom.findUnique({
    where: { id: roomId },
  });
  if (
    !room ||
    room.clinicId !== session.user.clinicId ||
    room.doctorId !== session.user.id
  ) {
    throw new Error("Room not found");
  }

  await prisma.consultationRoom.update({
    where: { id: roomId },
    data: { status: "ACTIVE", startedAt: room.startedAt ?? new Date() },
  });

  revalidatePath("/scribe");
}

export async function endConsultation(roomId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const room = await prisma.consultationRoom.findUnique({
    where: { id: roomId },
  });
  if (
    !room ||
    room.clinicId !== session.user.clinicId ||
    room.doctorId !== session.user.id
  ) {
    throw new Error("Room not found");
  }

  await prisma.consultationRoom.update({
    where: { id: roomId },
    data: { status: "COMPLETED", endedAt: new Date() },
  });

  revalidatePath("/scribe");
}

export async function getRoomForDoctor(roomId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const room = await prisma.consultationRoom.findUnique({
    where: { id: roomId },
    include: {
      scribeSession: { include: { soapNote: true } },
    },
  });

  if (!room || room.clinicId !== session.user.clinicId) {
    throw new Error("Room not found");
  }

  return room;
}

export async function saveScribeTranscript(
  roomId: string | null,
  patientId: string | null,
  rawTranscript: string,
): Promise<{ scribeSessionId: string }> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const clinicId = session.user.clinicId;

  // Verify the patient (if provided) belongs to this clinic.
  let safePatientId: string | null = null;
  if (patientId) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (patient && patient.clinicId === clinicId) safePatientId = patient.id;
  }

  // Verify the room (if provided) belongs to this clinic.
  let safeRoomId: string | null = null;
  if (roomId) {
    const room = await prisma.consultationRoom.findUnique({
      where: { id: roomId },
    });
    if (room && room.clinicId === clinicId) safeRoomId = room.id;
  }

  const created = await prisma.scribeSession.create({
    data: {
      clinicId,
      doctorId: session.user.id,
      patientId: safePatientId,
      consultationRoomId: safeRoomId,
      rawTranscript,
      status: "DRAFT",
    },
  });

  return { scribeSessionId: created.id };
}
