"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateSoapFromTranscript } from "@/lib/soap";

export type CreateRoomInput = {
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  scheduledAt?: string;
  existingPatientId?: string;
};

// Generate a SOAP note (draft) from a completed consultation's transcript.
export async function generateSoapNote(
  roomId: string,
): Promise<{ ok: true; soapNoteId: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };

  const room = await prisma.consultationRoom.findUnique({
    where: { id: roomId },
    include: { scribeSession: { include: { soapNote: true } } },
  });
  if (!room || room.clinicId !== session.user.clinicId) {
    return { ok: false, error: "Room not found." };
  }

  const scribe = room.scribeSession;
  if (!scribe || !scribe.rawTranscript.trim()) {
    return { ok: false, error: "No transcript to generate from." };
  }
  if (scribe.soapNote) {
    return { ok: true, soapNoteId: scribe.soapNote.id }; // already exists
  }

  let gen;
  try {
    gen = await generateSoapFromTranscript(scribe.rawTranscript);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Generation failed.",
    };
  }

  const note = await prisma.soapNote.create({
    data: {
      scribeSessionId: scribe.id,
      clinicId: room.clinicId,
      subjective: gen.subjective,
      objective: gen.objective,
      assessment: gen.assessment,
      plan: gen.plan,
      icd10Codes: gen.icd10Codes,
      suggestedCptCode: gen.suggestedCptCode,
      cptRationale: gen.cptRationale,
      patientInstructions: gen.patientInstructions,
      followUpDate: gen.followUpDate ? new Date(gen.followUpDate) : null,
      prescriptions: gen.prescriptions,
    },
  });

  await prisma.scribeSession.update({
    where: { id: scribe.id },
    data: { status: "PROCESSED" },
  });

  revalidatePath("/consultations");
  return { ok: true, soapNoteId: note.id };
}

// Save doctor edits to a draft SOAP note (does NOT publish).
export async function updateSoapNote(
  soapNoteId: string,
  data: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    icd10Codes: string[];
    suggestedCptCode: string;
    cptRationale: string;
    patientInstructions: string;
    followUpDate: string | null;
    prescriptions: string[];
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };

  const note = await prisma.soapNote.findUnique({ where: { id: soapNoteId } });
  if (!note || note.clinicId !== session.user.clinicId) {
    return { ok: false, error: "Note not found." };
  }

  await prisma.soapNote.update({
    where: { id: soapNoteId },
    data: {
      subjective: data.subjective,
      objective: data.objective,
      assessment: data.assessment,
      plan: data.plan,
      icd10Codes: data.icd10Codes,
      suggestedCptCode: data.suggestedCptCode,
      cptRationale: data.cptRationale,
      patientInstructions: data.patientInstructions,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      prescriptions: data.prescriptions,
      editedAt: new Date(),
    },
  });

  revalidatePath("/consultations");
  return { ok: true };
}

// Approve & publish — THIS is what makes the patient report go live.
export async function approveSoapNote(
  soapNoteId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };

  const note = await prisma.soapNote.findUnique({ where: { id: soapNoteId } });
  if (!note || note.clinicId !== session.user.clinicId) {
    return { ok: false, error: "Note not found." };
  }

  await prisma.soapNote.update({
    where: { id: soapNoteId },
    data: { approvedAt: new Date(), approvedByUserId: session.user.id },
  });

  revalidatePath("/consultations");
  return { ok: true };
}

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

  revalidatePath("/consultations");
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

  revalidatePath("/consultations");
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

  revalidatePath("/consultations");
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
