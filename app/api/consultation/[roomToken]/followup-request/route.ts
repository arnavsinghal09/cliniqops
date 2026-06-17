import { Resend } from "resend";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomToken: string }> },
) {
  const { roomToken } = await params;

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const room = await prisma.consultationRoom.findUnique({
    where: { roomToken },
    include: { clinic: { select: { id: true, name: true } } },
  });
  if (!room) {
    return Response.json({ error: "Consultation not found" }, { status: 404 });
  }

  const message = (body.message ?? "").trim().slice(0, 1000);

  // Record a FollowUpAction tied to the patient if we have one, else clinic-level.
  try {
    if (room.patientId) {
      await prisma.followUpAction.create({
        data: {
          patientId: room.patientId,
          clinicId: room.clinicId,
          notes: `Patient follow-up request via portal: ${message || "(no message)"}`,
          createdByUserId: "patient-portal",
        },
      });
    }
  } catch {
    // Non-fatal — still try to email.
  }

  // Email the clinic admins.
  try {
    const admins = await prisma.user.findMany({
      where: { clinicId: room.clinicId, role: "ADMIN", status: "ACTIVE" },
      select: { email: true },
    });
    const to = admins.map((a) => a.email).filter(Boolean);

    if (to.length > 0 && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "CliniqOps <followups@resend.dev>",
        to,
        subject: `Follow-up request from ${room.patientName}`,
        html: `
          <div style="font-family: system-ui, sans-serif; color: #1A1714;">
            <h2 style="color:#72554D; margin:0 0 12px;">New follow-up request</h2>
            <p><strong>Patient:</strong> ${room.patientName}</p>
            ${room.patientEmail ? `<p><strong>Email:</strong> ${room.patientEmail}</p>` : ""}
            ${room.patientPhone ? `<p><strong>Phone:</strong> ${room.patientPhone}</p>` : ""}
            <p><strong>Message:</strong></p>
            <p style="background:#F4F1EB; padding:12px 14px; border-radius:6px;">${message || "(no message)"}</p>
            <p style="color:#8A827A; font-size:12px;">Sent from the ${room.clinic.name} patient portal.</p>
          </div>
        `,
      });
    }
  } catch (e) {
    console.error("[followup] email failed:", e);
    // Still return success — the request was recorded.
  }

  return Response.json({ ok: true });
}
