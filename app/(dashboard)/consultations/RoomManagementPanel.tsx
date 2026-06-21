"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Copy, Check, Plus, Video, X, Pencil } from "lucide-react";
import { createConsultationRoom, cancelConsultationRoom, renameRoomPatient, type CreateRoomInput } from "./room-actions";
import type {
  RoomSummary,
  PatientOption,
  RoomStatus,
} from "./ConsultationsClient";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return await fn();
  }
}
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
  selectedRoomId,
  onJoinRoom,
}: {
  rooms: RoomSummary[];
  patients: PatientOption[];
  selectedRoomId: string | null;
  onJoinRoom: (roomId: string) => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const prefillName = searchParams.get("newPatient") ?? "";
  const prefillId = searchParams.get("newPatientId") ?? "";
  const [pending, start] = useTransition();
  const [useExisting, setUseExisting] = useState(!!prefillId);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [localRooms, setLocalRooms] = useState<RoomSummary[]>(rooms);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setLocalRooms(rooms); }, [rooms]);

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

    const tempId = `temp-${Date.now()}`;
    const tempRoom: RoomSummary = {
      id: tempId,
      roomToken: "",
      patientName: input.patientName,
      status: "WAITING",
      scheduledAt: input.scheduledAt ?? null,
      hasSoapNote: false,
    };
    setLocalRooms(prev => [...prev, tempRoom]);

    start(async () => {
      try {
        const res = await withRetry(() => createConsultationRoom(input));
        setCreatedLink(res.patientLink);
        setCopied(false);
        form.reset();
        setUseExisting(false);
        router.refresh();
      } catch (err) {
        setLocalRooms(prev => prev.filter(r => r.id !== tempId));
        const msg = err instanceof Error ? err.message : "Couldn't create room.";
        setError(msg);
        toast.error(msg);
      }
    });
  };

  const copyLink = () => {
    if (!createdLink) return;
    navigator.clipboard.writeText(createdLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyRoomLink = (roomId: string, token: string) => {
    const link = `${window.location.origin}/consultation/${token}`;
    void navigator.clipboard.writeText(link);
    setCopiedIds((prev) => new Set(prev).add(roomId));
    setTimeout(() => setCopiedIds((prev) => { const s = new Set(prev); s.delete(roomId); return s; }), 2000);
  };

  const startEdit = (roomId: string, currentName: string) => {
    setEditingId(roomId);
    setEditName(currentName);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) { setEditingId(null); return; }
    const id = editingId;
    const newName = editName.trim();
    const prev = localRooms;
    setLocalRooms(rooms => rooms.map(r => r.id === id ? { ...r, patientName: newName } : r));
    setEditingId(null);
    setSavingName(true);
    try {
      const res = await withRetry(() => renameRoomPatient(id, newName));
      if (!res.ok) throw new Error(res.error);
    } catch (err) {
      setLocalRooms(prev);
      toast.error(err instanceof Error ? err.message : "Couldn't rename patient.");
    } finally {
      setSavingName(false);
    }
  };

  const handleCancel = async (roomId: string) => {
    if (confirmCancelId !== roomId) {
      setConfirmCancelId(roomId);
      setTimeout(() => setConfirmCancelId((c) => (c === roomId ? null : c)), 3000);
      return;
    }
    setConfirmCancelId(null);
    const prev = localRooms;
    setLocalRooms(rooms => rooms.filter(r => r.id !== roomId));
    try {
      const res = await withRetry(() => cancelConsultationRoom(roomId));
      if (!res.ok) throw new Error(res.error);
    } catch (err) {
      setLocalRooms(prev);
      toast.error(err instanceof Error ? err.message : "Couldn't cancel room.");
    }
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
    <div data-tour="new-consultation" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
              defaultValue={prefillName}
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
                defaultValue={prefillId || ""}
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
              Share via WhatsApp or email. The patient opens it to join, no
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

        {localRooms.length === 0 ? (
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
          localRooms.map((room) => {
            const badge = STATUS_BADGE[room.status];
            const joinable =
              room.status === "WAITING" || room.status === "ACTIVE";
            const cancellable = joinable;
            const schedule = fmtSchedule(room.scheduledAt);
            const isCopied = copiedIds.has(room.id);
            const isCancelling = room.id.startsWith("temp-");
            const isConfirmingCancel = confirmCancelId === room.id;
            const isThisCallActive = room.id === selectedRoomId;
            const isAnyCallActive = selectedRoomId !== null;
            const leftBorderColor = isThisCallActive
              ? C.ok
              : room.status === "ACTIVE"
                ? C.danger
                : room.status === "WAITING"
                  ? C.warning
                  : C.border2;
            return (
              <div
                key={room.id}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border2}`,
                  borderLeft: `3px solid ${leftBorderColor}`,
                  borderRadius: 6,
                  padding: "14px 16px",
                  boxShadow: "0 1px 2px rgba(40,30,20,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {editingId === room.id ? (
                      <form
                        onSubmit={(e) => { e.preventDefault(); void saveEdit(); }}
                        style={{ display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <input
                          ref={editInputRef}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => void saveEdit()}
                          onKeyDown={(e) => e.key === "Escape" && setEditingId(null)}
                          style={{ ...inputStyle, padding: "4px 8px", fontSize: 13, width: 140 }}
                          disabled={savingName}
                        />
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(room.id, room.patientName)}
                        title="Edit patient name"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{room.patientName}</span>
                        <Pencil size={11} strokeWidth={2} style={{ color: C.ink3, opacity: 0.6 }} />
                      </button>
                    )}
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
                          style={{ width: 6, height: 6, borderRadius: "50%", background: badge.color }}
                        />
                      )}
                      {badge.label}
                    </span>
                  </div>
                  {schedule && (
                    <p style={{ fontSize: 12, color: C.ink3, margin: "3px 0 0" }}>{schedule}</p>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {/* Copy patient link */}
                  {joinable && (
                    <button
                      type="button"
                      title={isCopied ? "Copied!" : "Copy patient link"}
                      onClick={() => copyRoomLink(room.id, room.roomToken)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: isCopied ? C.okBg : C.accentMut,
                        color: isCopied ? C.ok : C.accentDk,
                        border: `1px solid ${isCopied ? C.ok : C.border2}`,
                        borderRadius: 6,
                        width: 32,
                        height: 32,
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                    >
                      {isCopied ? <Check size={13} strokeWidth={2.4} /> : <Copy size={13} strokeWidth={2.2} />}
                    </button>
                  )}

                  {/* Join call / In call indicator */}
                  {joinable && (
                    isThisCallActive ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: C.okBg,
                          color: C.ok,
                          border: `1px solid ${C.ok}`,
                          borderRadius: 6,
                          padding: "7px 13px",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        <Video size={13} strokeWidth={2.2} />
                        In call
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onJoinRoom(room.id)}
                        disabled={isAnyCallActive}
                        title={isAnyCallActive ? "Finish your current call first" : undefined}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: C.accent,
                          color: C.surface,
                          border: "none",
                          borderRadius: 6,
                          padding: "7px 13px",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: isAnyCallActive ? "not-allowed" : "pointer",
                          opacity: isAnyCallActive ? 0.4 : 1,
                        }}
                      >
                        <Video size={13} strokeWidth={2.2} />
                        Join
                      </button>
                    )
                  )}

                  {/* Cancel room — hidden while actively in this call */}
                  {cancellable && !isThisCallActive && (
                    <button
                      type="button"
                      title={isConfirmingCancel ? "Click again to confirm" : "Cancel room"}
                      onClick={() => void handleCancel(room.id)}
                      disabled={isCancelling}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        background: isConfirmingCancel ? C.dangerBg : "transparent",
                        color: isConfirmingCancel ? C.danger : C.ink3,
                        border: `1px solid ${isConfirmingCancel ? C.danger : C.border}`,
                        borderRadius: 6,
                        padding: isConfirmingCancel ? "5px 10px" : "0",
                        width: isConfirmingCancel ? "auto" : 32,
                        height: 32,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: isCancelling ? "not-allowed" : "pointer",
                        opacity: isCancelling ? 0.5 : 1,
                        whiteSpace: "nowrap",
                        transition: "all 0.15s",
                      }}
                    >
                      {isCancelling ? (
                        "…"
                      ) : isConfirmingCancel ? (
                        "Confirm?"
                      ) : (
                        <X size={13} strokeWidth={2.2} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
