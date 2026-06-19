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
        className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          on
            ? "bg-brand text-surface font-semibold shadow-sm"
            : "text-ink-2 hover:bg-sand/60 hover:text-ink"
        }`}
      >
        {icon}
        {label}
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
            on ? "bg-white/20 text-surface" : "bg-brand-muted text-brand-dk"
          }`}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1.5 border-b border-line pb-3">
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
            gap: 0,
            alignItems: "start",
          }}
        >
          <div className="border-r border-line pr-5">
            <ActiveSessionPanel
              initialPatients={patients}
              selectedRoomId={selectedRoomId}
              onClearRoom={() => setSelectedRoomId(null)}
              onCallEnded={handleCallEnded}
            />
          </div>
          <div className="pl-5">
            <RoomManagementPanel
              rooms={active}
              patients={patients}
              onJoinRoom={setSelectedRoomId}
            />
          </div>
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
