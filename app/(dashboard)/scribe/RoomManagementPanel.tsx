"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Plus, Video } from "lucide-react";
import { createConsultationRoom, type CreateRoomInput } from "./room-actions";
import type {
  RoomSummary,
  PatientOption,
  RoomStatus,
} from "./ScribePageClient";

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
  danger: "#B4423A",
  dangerBg: "#F7ECEA",
  warning: "#B07A2E",
  warningBg: "#F7F0E4",
  ok: "#4E6B4F",
  okBg: "#ECF0EA",
} as const;

const STATUS_BADGE: Record<
  RoomStatus,
  { bg: string; color: string; label: string; pulse: boolean }
> = {
  WAITING: {
    bg: C.warningBg,
    color: C.warning,
    label: "Waiting",
    pulse: false,
  },
  ACTIVE: { bg: C.dangerBg, color: C.danger, label: "Live", pulse: true },
  COMPLETED: { bg: C.okBg, color: C.ok, label: "Completed", pulse: false },
  CANCELLED: { bg: C.bg, color: C.ink3, label: "Cancelled", pulse: false },
};

const inputStyle: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "9px 12px",
  fontSize: 14,
  background: C.surface,
  color: C.ink,
  width: "100%",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: C.ink3,
  marginBottom: 5,
  display: "block",
};

export default function RoomManagementPanel({
  rooms,
  patients,
  onJoinRoom,
}: {
  rooms: RoomSummary[];
  patients: PatientOption[];
  onJoinRoom: (roomId: string) => void;
}) {
  const [pending, start] = useTransition();
  const [useExisting, setUseExisting] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const input: CreateRoomInput = {
      patientName: String(fd.get("patientName") ?? "").trim(),
      patientEmail: String(fd.get("patientEmail") ?? "").trim() || undefined,
      scheduledAt: String(fd.get("scheduledAt") ?? "").trim() || undefined,
      existingPatientId: useExisting
        ? String(fd.get("existingPatientId") ?? "").trim() || undefined
        : undefined,
    };

    if (!input.patientName) {
      setError("Patient name is required.");
      return;
    }
    setError(null);

    start(async () => {
      try {
        const res = await createConsultationRoom(input);
        setCreatedLink(res.patientLink);
        setCopied(false);
        form.reset();
        setUseExisting(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't create room.");
      }
    });
  };

  const copyLink = () => {
    if (!createdLink) return;
    navigator.clipboard.writeText(createdLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmtSchedule = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        @keyframes rmp-dot { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }
        .rmp-pulse { animation: rmp-dot 1.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .rmp-pulse { animation: none; } }
      `}</style>

      {/* New consultation */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border2}`,
          borderRadius: 6,
          padding: 20,
          boxShadow: "0 1px 2px rgba(40,30,20,0.05)",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: C.ink3,
            margin: "0 0 2px",
          }}
        >
          ROOMS
        </p>
        <p
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: C.ink,
            margin: "0 0 16px",
            letterSpacing: "-0.01em",
          }}
        >
          New consultation
        </p>

        <form
          onSubmit={submit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div>
            <label style={labelStyle}>Patient name *</label>
            <input
              name="patientName"
              required
              placeholder="Riya Patel"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Patient email (optional)</label>
            <input
              name="patientEmail"
              type="email"
              placeholder="patient@email.com"
              style={inputStyle}
            />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: C.ink2,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={useExisting}
              onChange={(e) => setUseExisting(e.target.checked)}
            />
            Link to existing patient record
          </label>

          {useExisting && (
            <div>
              <label style={labelStyle}>Existing patient</label>
              <select
                name="existingPatientId"
                style={inputStyle}
                defaultValue=""
              >
                <option value="" disabled>
                  Select a patient…
                </option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Schedule for (optional)</label>
            <input
              name="scheduledAt"
              type="datetime-local"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              background: C.accent,
              color: C.surface,
              border: "none",
              borderRadius: 6,
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 600,
              cursor: pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.6 : 1,
            }}
          >
            <Plus size={16} strokeWidth={2.4} />
            {pending ? "Creating…" : "Create room & copy link"}
          </button>
        </form>

        {error && (
          <p style={{ fontSize: 13, color: C.danger, margin: "12px 0 0" }}>
            {error}
          </p>
        )}

        {createdLink && (
          <div
            style={{
              marginTop: 14,
              background: C.accentMut,
              borderRadius: 6,
              padding: "12px 14px",
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: C.accentDk,
                margin: "0 0 8px",
              }}
            >
              Patient link
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                readOnly
                value={createdLink}
                style={{ ...inputStyle, background: C.surface, fontSize: 12.5 }}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                onClick={copyLink}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: copied ? C.okBg : C.surface,
                  color: copied ? C.ok : C.accentDk,
                  border: `1px solid ${copied ? C.ok : C.border2}`,
                  borderRadius: 6,
                  padding: "9px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {copied ? (
                  <Check size={14} strokeWidth={2.4} />
                ) : (
                  <Copy size={14} strokeWidth={2.2} />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p style={{ fontSize: 11.5, color: C.ink3, margin: "8px 0 0" }}>
              Share via WhatsApp or email. The patient opens it to join — no
              login needed.
            </p>
          </div>
        )}
      </div>

      {/* Recent rooms */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: C.ink3,
            margin: "4px 2px",
          }}
        >
          Active & upcoming
        </p>

        {rooms.length === 0 ? (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border2}`,
              borderRadius: 6,
              padding: "24px 18px",
              textAlign: "center",
              color: C.ink3,
              fontSize: 13,
            }}
          >
            No consultation rooms yet.
          </div>
        ) : (
          rooms.map((room) => {
            const badge = STATUS_BADGE[room.status];
            const joinable =
              room.status === "WAITING" || room.status === "ACTIVE";
            const schedule = fmtSchedule(room.scheduledAt);
            return (
              <div
                key={room.id}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border2}`,
                  borderRadius: 6,
                  padding: "14px 16px",
                  boxShadow: "0 1px 2px rgba(40,30,20,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: C.ink,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {room.patientName}
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: badge.bg,
                        color: badge.color,
                      }}
                    >
                      {badge.pulse && (
                        <span
                          className="rmp-pulse"
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: badge.color,
                          }}
                        />
                      )}
                      {badge.label}
                    </span>
                  </div>
                  {schedule && (
                    <p
                      style={{ fontSize: 12, color: C.ink3, margin: "3px 0 0" }}
                    >
                      {schedule}
                    </p>
                  )}
                </div>

                {joinable && (
                  <button
                    type="button"
                    onClick={() => onJoinRoom(room.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      flexShrink: 0,
                      background: C.accent,
                      color: C.surface,
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 14px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Video size={14} strokeWidth={2.2} />
                    Join call
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
