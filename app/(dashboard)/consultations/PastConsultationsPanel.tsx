"use client";

import { useEffect, useState } from "react";
import { FileText, ChevronRight, Clock } from "lucide-react";
import type { PastConsultation } from "./ConsultationsClient";
import SoapEditor from "./SoapEditor";
import { toast } from "sonner";

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
  ok: "#4E6B4F",
  okBg: "#ECF0EA",
  warning: "#B07A2E",
  warningBg: "#F7F0E4",
} as const;

export default function PastConsultationsPanel({
  consultations,
  autoOpenId,
}: {
  consultations: PastConsultation[];
  autoOpenId?: string | null;
}) {
   const [openId, setOpenId] = useState<string | null>(null);

   useEffect(() => {
     if (autoOpenId && consultations.some((c) => c.id === autoOpenId)) {
       // eslint-disable-next-line react-hooks/set-state-in-effect
       setOpenId(autoOpenId);
       toast.success("Call ended — generate your note now");
     }
   }, [autoOpenId, consultations]);
   
  const open = consultations.find((c) => c.id === openId) ?? null;

  if (consultations.length === 0) {
    return (
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border2}`,
          borderRadius: 6,
          padding: "48px 24px",
          textAlign: "center",
          color: C.ink3,
          fontSize: 14,
        }}
      >
        No completed consultations yet. Once you end a call, it&apos;ll appear
        here for note generation.
      </div>
    );
  }

  if (open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpenId(null)}
          style={{
            background: "transparent",
            border: "none",
            color: C.accent,
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: 16,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Back to all consultations
        </button>
        <SoapEditor consultation={open} />
      </div>
    );
  }

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString(undefined, {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {consultations.map((c) => {
        const noteState = c.soap?.approvedAt
          ? { label: "Published", bg: C.okBg, color: C.ok }
          : c.soap
            ? { label: "Draft note", bg: C.warningBg, color: C.warning }
            : c.hasTranscript
              ? { label: "Needs note", bg: C.accentMut, color: C.accentDk }
              : { label: "No transcript", bg: C.bg, color: C.ink3 };
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => setOpenId(c.id)}
            style={{
              background: C.surface,
              border: `1px solid ${C.border2}`,
              borderRadius: 6,
              padding: "16px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  background: C.accentMut,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <FileText size={18} color={C.accentDk} strokeWidth={2} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: C.ink,
                    margin: 0,
                  }}
                >
                  {c.patientName}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: C.ink3,
                    margin: "3px 0 0",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Clock size={12} /> {fmt(c.endedAt)}
                </p>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  padding: "4px 10px",
                  borderRadius: 4,
                  background: noteState.bg,
                  color: noteState.color,
                }}
              >
                {noteState.label}
              </span>
              <ChevronRight size={18} color={C.ink3} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
