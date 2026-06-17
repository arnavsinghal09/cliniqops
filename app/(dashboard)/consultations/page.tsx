import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SectionLabel from "@/components/ui-kit/SectionLabel";
import {
  getPatientsForSelector,
  getActiveRoomsForDoctor,
  getPastRoomsForDoctor,
} from "@/lib/queries/scribe";
import ConsultationsClient, {
  type RoomSummary,
  type PastConsultation,
} from "./ConsultationsClient";
import { Suspense } from "react";

export default async function ConsultationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const clinicId = session.user.clinicId;
  const doctorId = session.user.id;

  const [patients, activeRooms, pastRooms] = await Promise.all([
    getPatientsForSelector(clinicId),
    getActiveRoomsForDoctor(clinicId, doctorId),
    getPastRoomsForDoctor(clinicId, doctorId),
  ]);

  const active: RoomSummary[] = activeRooms.map((r) => ({
    id: r.id,
    roomToken: r.roomToken,
    patientName: r.patientName,
    status: r.status,
    scheduledAt: r.scheduledAt ? r.scheduledAt.toISOString() : null,
    hasSoapNote: false,
  }));

  const past: PastConsultation[] = pastRooms.map((r) => {
    const note = r.scribeSession?.soapNote ?? null;
    return {
      id: r.id,
      roomToken: r.roomToken,
      patientName: r.patientName,
      status: r.status,
      endedAt: r.endedAt ? r.endedAt.toISOString() : null,
      hasTranscript: !!r.scribeSession?.rawTranscript?.trim(),
      transcript: r.scribeSession?.rawTranscript ?? null,
      soap: note
        ? {
            id: note.id,
            subjective: note.subjective,
            objective: note.objective,
            assessment: note.assessment,
            plan: note.plan,
            icd10Codes: note.icd10Codes,
            suggestedCptCode: note.suggestedCptCode,
            cptRationale: note.cptRationale,
            patientInstructions: note.patientInstructions,
            followUpDate: note.followUpDate
              ? note.followUpDate.toISOString().slice(0, 10)
              : null,
            prescriptions: note.prescriptions,
            approvedAt: note.approvedAt ? note.approvedAt.toISOString() : null,
          }
        : null,
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionLabel eyebrow="CONSULTATION SUITE" title="Consultations" />
      <Suspense fallback={null}>
        <ConsultationsClient patients={patients} active={active} past={past} />
      </Suspense>
    </div>
  );
}
