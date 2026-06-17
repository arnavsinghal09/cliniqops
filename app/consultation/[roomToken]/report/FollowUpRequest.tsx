"use client";

import { useState } from "react";
import { CalendarPlus, Check } from "lucide-react";

const C = {
  surface: "#FBFAF7",
  bg: "#F4F1EB",
  ink: "#1A1714",
  ink2: "#4A453F",
  ink3: "#8A827A",
  border: "#E3DDD3",
  border2: "#D8D0C4",
  accent: "#72554D",
  danger: "#B4423A",
  ok: "#4E6B4F",
  okBg: "#ECF0EA",
};

export default function FollowUpRequest({
  roomToken,
  patientName,
}: {
  roomToken: string;
  patientName: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(
    "I'd like to book my follow-up appointment.",
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/consultation/${roomToken}/followup-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        },
      );
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError(
        "Couldn't send your request. Please contact the clinic directly.",
      );
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div
        style={{
          background: C.okBg,
          border: `1px solid ${C.ok}`,
          borderRadius: 6,
          padding: "16px 18px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Check size={18} color={C.ok} />
        <span style={{ fontSize: 14, color: C.ink2 }}>
          Request sent — your clinic will reach out to schedule your follow-up.
        </span>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: C.accent,
          color: C.surface,
          border: "none",
          borderRadius: 6,
          padding: "11px 20px",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <CalendarPlus size={16} /> Request follow-up
      </button>
    );
  }

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border2}`,
        borderRadius: 6,
        padding: 20,
      }}
    >
      <p
        style={{
          fontSize: 14.5,
          fontWeight: 600,
          color: C.ink,
          margin: "0 0 4px",
        }}
      >
        Request a follow-up appointment
      </p>
      <p style={{ fontSize: 13, color: C.ink3, margin: "0 0 14px" }}>
        We&apos;ll pass this to {patientName ? "your clinic" : "the clinic"} and
        they&apos;ll contact you to schedule.
      </p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          padding: "10px 12px",
          fontSize: 14,
          color: C.ink,
          background: C.bg,
          resize: "vertical",
          fontFamily: "inherit",
          lineHeight: 1.5,
        }}
      />
      {error && (
        <p style={{ fontSize: 13, color: C.danger, margin: "10px 0 0" }}>
          {error}
        </p>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button
          type="button"
          onClick={submit}
          disabled={sending}
          style={{
            background: C.accent,
            color: C.surface,
            border: "none",
            borderRadius: 6,
            padding: "9px 18px",
            fontSize: 14,
            fontWeight: 600,
            cursor: sending ? "not-allowed" : "pointer",
            opacity: sending ? 0.6 : 1,
          }}
        >
          {sending ? "Sending…" : "Send request"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={sending}
          style={{
            background: "transparent",
            color: C.ink3,
            border: "none",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
