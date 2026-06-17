"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, Check, Save, FileText } from "lucide-react";
import {
  generateSoapNote,
  updateSoapNote,
  approveSoapNote,
} from "./room-actions";
import type { PastConsultation, SoapData } from "./ConsultationsClient";

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
  danger: "#B4423A",
} as const;

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: C.ink3,
  marginBottom: 6,
  display: "block",
};
const inputStyle: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "10px 12px",
  fontSize: 14,
  background: C.surface,
  color: C.ink,
  width: "100%",
  boxSizing: "border-box",
  lineHeight: 1.5,
  fontFamily: "inherit",
};

export default function SoapEditor({
  consultation,
}: {
  consultation: PastConsultation;
}) {
  const [soap, setSoap] = useState<SoapData | null>(consultation.soap);
  const [pending, start] = useTransition();
  const published = !!soap?.approvedAt;

  // Local editable copies of array/text fields.
  const [icd, setIcd] = useState(soap?.icd10Codes.join(", ") ?? "");
  const [rx, setRx] = useState(soap?.prescriptions.join("\n") ?? "");

  const generate = () => {
    start(async () => {
      const res = await generateSoapNote(consultation.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Note generated — review and edit below");
      // Reload by reading the freshly written note via a full refresh.
      window.location.reload();
    });
  };

  const field = (k: keyof SoapData, v: string) => {
    if (!soap) return;
    setSoap({ ...soap, [k]: v });
  };

  const save = () => {
    if (!soap) return;
    start(async () => {
      const res = await updateSoapNote(soap.id, {
        subjective: soap.subjective,
        objective: soap.objective,
        assessment: soap.assessment,
        plan: soap.plan,
        icd10Codes: icd
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        suggestedCptCode: soap.suggestedCptCode,
        cptRationale: soap.cptRationale,
        patientInstructions: soap.patientInstructions,
        followUpDate: soap.followUpDate || null,
        prescriptions: rx
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      if (res.ok) toast.success("Saved");
      else toast.error(res.error);
    });
  };

  const approve = () => {
    if (!soap) return;
    start(async () => {
      // Save edits first, then approve, so published == what's on screen.
      await updateSoapNote(soap.id, {
        subjective: soap.subjective,
        objective: soap.objective,
        assessment: soap.assessment,
        plan: soap.plan,
        icd10Codes: icd
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        suggestedCptCode: soap.suggestedCptCode,
        cptRationale: soap.cptRationale,
        patientInstructions: soap.patientInstructions,
        followUpDate: soap.followUpDate || null,
        prescriptions: rx
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      const res = await approveSoapNote(soap.id);
      if (res.ok) {
        toast.success("Published — the patient can now see their summary");
        setSoap({ ...soap, approvedAt: new Date().toISOString() });
      } else toast.error(res.error);
    });
  };

  const card = (children: React.ReactNode) => (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border2}`,
        borderRadius: 6,
        padding: 22,
      }}
    >
      {children}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
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
            VISIT NOTE
          </p>
          <h2
            style={{ fontSize: 22, fontWeight: 600, color: C.ink, margin: 0 }}
          >
            {consultation.patientName}
          </h2>
        </div>
        {soap && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "5px 11px",
              borderRadius: 4,
              background: published ? C.okBg : C.warningBg,
              color: published ? C.ok : C.warning,
            }}
          >
            {published ? "Published" : "Draft"}
          </span>
        )}
      </div>

      {/* Transcript */}
      {card(
        <>
          <p style={labelStyle}>Transcript</p>
          {consultation.hasTranscript ? (
            <p
              style={{
                fontSize: 13.5,
                color: C.ink2,
                lineHeight: 1.6,
                margin: 0,
                maxHeight: 160,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {consultation.transcript}
            </p>
          ) : (
            <p style={{ fontSize: 13.5, color: C.ink3, margin: 0 }}>
              No transcript was captured for this consultation. Scribe may have
              been off during the call.
            </p>
          )}
        </>,
      )}

      {/* No note yet → generate */}
      {!soap && (
        <div
          style={{
            background: C.accentMut,
            border: `1px solid ${C.border2}`,
            borderRadius: 6,
            padding: 28,
            textAlign: "center",
          }}
        >
          <FileText
            size={26}
            color={C.accentDk}
            strokeWidth={1.6}
            style={{ margin: "0 auto 10px" }}
          />
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: C.ink,
              margin: "0 0 6px",
            }}
          >
            No note yet
          </p>
          <p style={{ fontSize: 13, color: C.ink2, margin: "0 0 18px" }}>
            Generate a structured SOAP note from the transcript using AI. You
            can edit everything before publishing.
          </p>
          <button
            type="button"
            onClick={generate}
            disabled={pending || !consultation.hasTranscript}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: C.accent,
              color: C.surface,
              border: "none",
              borderRadius: 6,
              padding: "11px 22px",
              fontSize: 14,
              fontWeight: 600,
              cursor:
                pending || !consultation.hasTranscript
                  ? "not-allowed"
                  : "pointer",
              opacity: pending || !consultation.hasTranscript ? 0.6 : 1,
            }}
          >
            <Sparkles size={16} />
            {pending ? "Generating…" : "Generate note with AI"}
          </button>
          {!consultation.hasTranscript && (
            <p style={{ fontSize: 12, color: C.ink3, margin: "12px 0 0" }}>
              A transcript is required to generate a note.
            </p>
          )}
        </div>
      )}

      {/* Editable SOAP form */}
      {soap && (
        <>
          {(["subjective", "objective", "assessment", "plan"] as const).map(
            (k) =>
              card(
                <div key={k}>
                  <label style={labelStyle}>
                    {k === "subjective"
                      ? "Subjective — what the patient reported"
                      : k === "objective"
                        ? "Objective — exam findings"
                        : k === "assessment"
                          ? "Assessment — diagnosis"
                          : "Plan — treatment & next steps"}
                  </label>
                  <textarea
                    value={soap[k] as string}
                    onChange={(e) => field(k, e.target.value)}
                    disabled={published}
                    rows={k === "plan" || k === "subjective" ? 4 : 3}
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                      opacity: published ? 0.7 : 1,
                    }}
                  />
                </div>,
              ),
          )}

          {card(
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div>
                <label style={labelStyle}>ICD-10 codes (comma-separated)</label>
                <input
                  value={icd}
                  onChange={(e) => setIcd(e.target.value)}
                  disabled={published}
                  placeholder="E11.9, I10"
                  style={{ ...inputStyle, opacity: published ? 0.7 : 1 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Suggested CPT code</label>
                <input
                  value={soap.suggestedCptCode}
                  onChange={(e) => field("suggestedCptCode", e.target.value)}
                  disabled={published}
                  placeholder="99214"
                  style={{ ...inputStyle, opacity: published ? 0.7 : 1 }}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>CPT rationale</label>
                <input
                  value={soap.cptRationale}
                  onChange={(e) => field("cptRationale", e.target.value)}
                  disabled={published}
                  style={{ ...inputStyle, opacity: published ? 0.7 : 1 }}
                />
              </div>
            </div>,
          )}

          {card(
            <div>
              <label style={labelStyle}>
                Patient instructions (plain language — shown to the patient)
              </label>
              <textarea
                value={soap.patientInstructions}
                onChange={(e) => field("patientInstructions", e.target.value)}
                disabled={published}
                rows={4}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  opacity: published ? 0.7 : 1,
                }}
              />
            </div>,
          )}

          {card(
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div>
                <label style={labelStyle}>Follow-up date</label>
                <input
                  type="date"
                  value={soap.followUpDate ?? ""}
                  onChange={(e) => field("followUpDate", e.target.value)}
                  disabled={published}
                  style={{ ...inputStyle, opacity: published ? 0.7 : 1 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Prescriptions (one per line)</label>
                <textarea
                  value={rx}
                  onChange={(e) => setRx(e.target.value)}
                  disabled={published}
                  rows={3}
                  placeholder="Metformin 500mg twice daily"
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    opacity: published ? 0.7 : 1,
                  }}
                />
              </div>
            </div>,
          )}

          {/* Actions */}
          {!published ? (
            <div
              style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
            >
              <button
                type="button"
                onClick={save}
                disabled={pending}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  background: C.surface,
                  color: C.ink2,
                  border: `1px solid ${C.border2}`,
                  borderRadius: 6,
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: pending ? "not-allowed" : "pointer",
                }}
              >
                <Save size={15} /> Save draft
              </button>
              <button
                type="button"
                onClick={approve}
                disabled={pending}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  background: C.accent,
                  color: C.surface,
                  border: "none",
                  borderRadius: 6,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: pending ? "not-allowed" : "pointer",
                  opacity: pending ? 0.6 : 1,
                }}
              >
                <Check size={16} /> Approve & publish
              </button>
            </div>
          ) : (
            <div
              style={{
                background: C.okBg,
                border: `1px solid ${C.ok}`,
                borderRadius: 6,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Check size={18} color={C.ok} />
              <span style={{ fontSize: 13.5, color: C.ink2 }}>
                Published. The patient can now view this summary from their
                consultation link.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
