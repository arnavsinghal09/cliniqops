import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SectionLabel from "@/components/ui-kit/SectionLabel";
import {
  getPatientsForSelector,
  getRecentRoomsForDoctor,
} from "@/lib/queries/scribe";
import ScribePageClient, { type RoomSummary } from "./ScribePageClient";

export default async function ScribePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const clinicId = session.user.clinicId;
  const doctorId = session.user.id;

  const [patients, rooms] = await Promise.all([
    getPatientsForSelector(clinicId),
    getRecentRoomsForDoctor(clinicId, doctorId),
  ]);

  const roomSummaries: RoomSummary[] = rooms.map((r) => ({
    id: r.id,
    roomToken: r.roomToken,
    patientName: r.patientName,
    status: r.status,
    scheduledAt: r.scheduledAt ? r.scheduledAt.toISOString() : null,
    hasSoapNote: !!r.scribeSession?.soapNote?.approvedAt,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionLabel eyebrow="CONSULTATION SUITE" title="Scribe & telehealth" />
      <ScribePageClient patients={patients} rooms={roomSummaries} />
    </div>
  );
}
