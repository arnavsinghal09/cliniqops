"use client";

import { useState } from "react";
import RoomManagementPanel from "./RoomManagementPanel";
import ActiveSessionPanel from "./ActiveSessionPanel";

export type RoomStatus = "WAITING" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export type RoomSummary = {
  id: string;
  roomToken: string;
  patientName: string;
  status: RoomStatus;
  scheduledAt: string | null;
  hasSoapNote: boolean;
};

export type PatientOption = { id: string; name: string };

export default function ScribePageClient({
  patients,
  rooms,
}: {
  patients: PatientOption[];
  rooms: RoomSummary[];
}) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 65fr) minmax(0, 35fr)",
        gap: 20,
        alignItems: "start",
      }}
    >
      <ActiveSessionPanel
        initialPatients={patients}
        selectedRoomId={selectedRoomId}
        onClearRoom={() => setSelectedRoomId(null)}
      />
      <RoomManagementPanel
        rooms={rooms}
        patients={patients}
        onJoinRoom={setSelectedRoomId}
      />
    </div>
  );
}
