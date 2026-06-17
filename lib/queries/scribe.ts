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
