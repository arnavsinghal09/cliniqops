"use client";

import { useState } from "react";
import { Radio, History } from "lucide-react";
import ActiveSessionPanel from "./ActiveSessionPanel";
import RoomManagementPanel from "./RoomManagementPanel";
import PastConsultationsPanel from "./PastConsultationsPanel";

export type RoomStatus = "WAITING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type PatientOption = { id: string; name: string };

export type RoomSummary = {
  id: string;
  roomToken: string;
  patientName: string;
  status: RoomStatus;
  scheduledAt: string | null;
  hasSoapNote: boolean;
};

export type SoapData = {
  id: string;
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
  approvedAt: string | null;
};

export type PastConsultation = {
  id: string;
  roomToken: string;
  patientName: string;
  status: RoomStatus;
  endedAt: string | null;
  hasTranscript: boolean;
  transcript: string | null;
  soap: SoapData | null;
};

const C = {
  surface: "#FBFAF7",
  bg: "#F4F1EB",
  ink: "#1A1714",
  ink2: "#4A453F",
  ink3: "#8A827A",
  border: "#E3DDD3",
  border2: "#D8D0C4",
  accent: "#72554D",
  accentDk: "#4A352E",
  accentMut: "#EDE6DF",
} as const;

type Tab = "active" | "past";

export default function ConsultationsClient({
  patients,
  active,
  past,
}: {
  patients: PatientOption[];
  active: RoomSummary[];
  past: PastConsultation[];
}) {
  const [tab, setTab] = useState<Tab>("active");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [autoOpenPastId, setAutoOpenPastId] = useState<string | null>(null);

  const handleCallEnded = (roomId: string) => {
    setSelectedRoomId(null);
    setAutoOpenPastId(roomId);
    setTab("past");
  };

  const tabBtn = (
    id: Tab,
    label: string,
    icon: React.ReactNode,
    count: number,
  ) => {
    const on = tab === id;
    return (
      <button
        type="button"
        onClick={() => setTab(id)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 16px",
          borderRadius: 6,
          border: "none",
          background: on ? C.accent : "transparent",
          color: on ? C.surface : C.ink2,
          fontSize: 14,
          fontWeight: on ? 600 : 500,
          cursor: "pointer",
        }}
      >
        {icon}
        {label}
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "1px 7px",
            borderRadius: 10,
            background: on ? "rgba(255,255,255,0.22)" : C.accentMut,
            color: on ? C.surface : C.accentDk,
          }}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          gap: 6,
          borderBottom: `1px solid ${C.border}`,
          paddingBottom: 12,
        }}
      >
        {tabBtn(
          "active",
          "Active",
          <Radio size={16} strokeWidth={2.2} />,
          active.length,
        )}
        {tabBtn(
          "past",
          "Past consultations",
          <History size={16} strokeWidth={2.2} />,
          past.length,
        )}
      </div>

      {tab === "active" ? (
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
            onCallEnded={handleCallEnded}
          />
          <RoomManagementPanel
            rooms={active}
            patients={patients}
            onJoinRoom={setSelectedRoomId}
          />
        </div>
      ) : (
        <PastConsultationsPanel
          consultations={past}
          autoOpenId={autoOpenPastId}
        />
      )}
    </div>
  );
}
