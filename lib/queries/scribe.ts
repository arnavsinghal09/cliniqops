import prisma from "@/lib/prisma";

export async function getPatientsForSelector(clinicId: string) {
  return prisma.patient.findMany({
    where: { clinicId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getRecentRoomsForDoctor(
  clinicId: string,
  doctorId: string,
) {
  return prisma.consultationRoom.findMany({
    where: { clinicId, doctorId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      scribeSession: { include: { soapNote: true } },
    },
  });
}

// Active = still in progress; shown in the working view.
export async function getActiveRoomsForDoctor(clinicId: string, doctorId: string) {
  return prisma.consultationRoom.findMany({
    where: { clinicId, doctorId, status: { in: ["WAITING", "ACTIVE"] } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

// Past = completed/cancelled; shown in the "Past consultations" tab with notes.
export async function getPastRoomsForDoctor(clinicId: string, doctorId: string) {
  return prisma.consultationRoom.findMany({
    where: { clinicId, doctorId, status: { in: ["COMPLETED", "CANCELLED"] } },
    orderBy: { endedAt: "desc" },
    take: 30,
    include: {
      scribeSession: {
        include: {
          soapNote: { include: { cptCodes: { orderBy: { createdAt: "asc" } } } },
        },
      },
    },
  });
}