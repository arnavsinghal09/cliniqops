import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomToken: string }> },
) {
  const { roomToken } = await params;

  const room = await prisma.consultationRoom.findUnique({
    where: { roomToken },
    include: {
      doctor: { select: { email: true, name: true } },
      clinic: { select: { name: true } },
      scribeSession: { select: { soapNote: { select: { approvedAt: true } } } },
    },
  });

  if (!room) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }

  // Only expose patient-safe fields — never internal ids or clinicId/doctorId.
  return Response.json({
    patientName: room.patientName,
    doctorName: room.doctor.name ?? room.doctor.email,
    doctorEmail: room.doctor.email,
    clinicName: room.clinic.name,
    status: room.status,
    scheduledAt: room.scheduledAt,
    hasSoapNote: !!room.scribeSession?.soapNote?.approvedAt,
  });
}
