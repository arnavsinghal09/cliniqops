"use client";

import { useState, useTransition } from "react";
import {
  Receipt,
  Sparkles,
  Check,
  X,
  Pencil,
  Plus,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import type { CptCodeData } from "./ConsultationsClient";
import {
  suggestCptCodes,
  approveCptCode,
  rejectCptCode,
  addManualCptCode,
  updateCptCode,
} from "./room-actions";

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
  okBorder: "#BDD4BE",
  warning: "#B07A2E",
  warningBg: "#F7F0E4",
  danger: "#B4423A",
  dangerBg: "#FAEAE9",
} as const;

const inputStyle: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 13,
  background: C.surface,
  color: C.ink,
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

function ConfidenceChip({ value }: { value: number | null }) {
  if (value === null) return null;
  const pct = Math.round(value * 100);
  const color = pct >= 90 ? C.ok : pct >= 70 ? C.warning : C.danger;
  const bg = pct >= 90 ? C.okBg : pct >= 70 ? C.warningBg : C.dangerBg;
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 4,
        background: bg,
        color,
        flexShrink: 0,
      }}
    >
      {pct}%
    </span>
  );
}

type EditFields = { code: string; description: string; rationale: string };

function SuggestedRow({
  c,
  expanded,
  editing,
  editFields,
  pending,
  onToggle,
  onApprove,
  onReject,
  onEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
}: {
  c: CptCodeData;
  expanded: boolean;
  editing: boolean;
  editFields: EditFields;
  pending: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onEditChange: (f: Partial<EditFields>) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  return (
    <div
      style={{
        border: `1px solid ${C.border2}`,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {/* Main row */}
      <div
        style={{
          padding: "10px 12px",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          disabled={!c.rationale}
          style={{
            color: C.ink3,
            background: "none",
            border: "none",
            cursor: c.rationale ? "pointer" : "default",
            display: "inline-flex",
            padding: 0,
            flexShrink: 0,
            opacity: c.rationale ? 1 : 0.2,
          }}
        >
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>

        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: C.ink,
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
            minWidth: 52,
          }}
        >
          {c.code}
        </span>
        <span
          style={{
            fontSize: 13,
            color: C.ink2,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {c.description}
        </span>
        <ConfidenceChip value={c.confidence} />

        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          <button
            type="button"
            title="Edit"
            onClick={onEdit}
            disabled={pending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 4,
              border: `1px solid ${C.border2}`,
              background: "transparent",
              color: C.ink3,
              cursor: "pointer",
            }}
          >
            <Pencil size={13} strokeWidth={2} />
          </button>
          <button
            type="button"
            title="Approve"
            onClick={onApprove}
            disabled={pending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 4,
              border: `1px solid ${C.okBorder}`,
              background: C.okBg,
              color: C.ok,
              cursor: "pointer",
            }}
          >
            <Check size={14} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            title="Reject"
            onClick={onReject}
            disabled={pending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 4,
              border: `1px solid ${C.danger}44`,
              background: C.dangerBg,
              color: C.danger,
              cursor: "pointer",
            }}
          >
            <X size={14} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* Expanded rationale */}
      {expanded && c.rationale && !editing && (
        <div
          style={{
            padding: "9px 14px 11px",
            borderTop: `1px solid ${C.border}`,
            background: C.surface,
            fontSize: 13,
            color: C.ink2,
            lineHeight: 1.55,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: C.ink3,
              marginRight: 8,
            }}
          >
            Rationale
          </span>
          {c.rationale}
        </div>
      )}

      {/* Inline edit form */}
      {editing && (
        <div
          style={{
            padding: "12px 14px",
            borderTop: `1px solid ${C.border}`,
            background: C.surface,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
            <div>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: C.ink3,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Code
              </label>
              <input
                value={editFields.code}
                onChange={(e) => onEditChange({ code: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: C.ink3,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Description
              </label>
              <input
                value={editFields.description}
                onChange={(e) => onEditChange({ description: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: C.ink3,
                display: "block",
                marginBottom: 4,
              }}
            >
              Rationale
            </label>
            <input
              value={editFields.rationale}
              onChange={(e) => onEditChange({ rationale: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={pending}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: C.accent,
                color: C.surface,
                border: "none",
                borderRadius: 5,
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Check size={13} /> Save
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "transparent",
                color: C.ink3,
                border: `1px solid ${C.border2}`,
                borderRadius: 5,
                padding: "7px 12px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CptCodingPanel({
  soapNoteId,
  initialCodes,
}: {
  soapNoteId: string;
  initialCodes: CptCodeData[];
}) {
  const [codes, setCodes] = useState<CptCodeData[]>(initialCodes);
  const [pending, start] = useTransition();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<EditFields>({
    code: "",
    description: "",
    rationale: "",
  });
  const [manCode, setManCode] = useState("");
  const [manDesc, setManDesc] = useState("");

  const suggested = codes.filter((c) => c.status === "SUGGESTED");
  const approved = codes.filter((c) => c.status === "APPROVED");

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const handleSuggest = () => {
    start(async () => {
      const res = await suggestCptCodes(soapNoteId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `${res.count} suggestion${res.count !== 1 ? "s" : ""} ready — review below`,
      );
      window.location.reload();
    });
  };

  const handleApprove = (id: string) => {
    start(async () => {
      const res = await approveCptCode(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setCodes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "APPROVED" } : c)),
      );
    });
  };

  const handleReject = (id: string) => {
    start(async () => {
      const res = await rejectCptCode(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setCodes((prev) => prev.filter((c) => c.id !== id));
    });
  };

  const startEdit = (c: CptCodeData) => {
    setEditingId(c.id);
    setEditFields({
      code: c.code,
      description: c.description,
      rationale: c.rationale ?? "",
    });
  };

  const saveEdit = (id: string) => {
    start(async () => {
      const res = await updateCptCode(id, editFields);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setCodes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...editFields } : c)),
      );
      setEditingId(null);
      toast.success("Code updated");
    });
  };

  const handleAddManual = () => {
    if (!manCode.trim() || !manDesc.trim()) {
      toast.error("Both code and description are required.");
      return;
    }
    start(async () => {
      const res = await addManualCptCode(soapNoteId, manCode, manDesc);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      window.location.reload();
    });
  };

  const hasAnyCodes = suggested.length > 0 || approved.length > 0;

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border2}`,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          borderBottom: `1px solid ${C.border}`,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Receipt size={17} color={C.accent} strokeWidth={2} />
          <span style={{ fontSize: 14.5, fontWeight: 600, color: C.ink }}>
            CPT Billing Codes
          </span>
          {approved.length > 0 && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 4,
                background: C.okBg,
                color: C.ok,
              }}
            >
              {approved.length} approved
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSuggest}
          disabled={pending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            background: C.accent,
            color: C.surface,
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          <Sparkles size={14} />
          {pending ? "Working…" : hasAnyCodes ? "Re-suggest" : "Suggest with AI"}
        </button>
      </div>

      <div
        style={{
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Disclaimer */}
        <div
          style={{
            display: "flex",
            gap: 10,
            background: C.warningBg,
            border: `1px solid ${C.warning}44`,
            borderRadius: 6,
            padding: "11px 14px",
          }}
        >
          <AlertTriangle
            size={14}
            color={C.warning}
            strokeWidth={2.2}
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <p
            style={{
              fontSize: 12.5,
              color: C.warning,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            <strong>For review only.</strong> AI-suggested CPT codes are not
            verified for billing. A qualified medical coder must confirm all
            codes before submission.
          </p>
        </div>

        {/* Suggested / pending review */}
        {suggested.length > 0 && (
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: C.ink3,
                margin: "0 0 8px",
              }}
            >
              Pending review ({suggested.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {suggested.map((c) => (
                <SuggestedRow
                  key={c.id}
                  c={c}
                  expanded={expanded.has(c.id)}
                  editing={editingId === c.id}
                  editFields={editFields}
                  pending={pending}
                  onToggle={() => toggleExpand(c.id)}
                  onApprove={() => handleApprove(c.id)}
                  onReject={() => handleReject(c.id)}
                  onEdit={() => startEdit(c)}
                  onEditChange={(f) =>
                    setEditFields((prev) => ({ ...prev, ...f }))
                  }
                  onSaveEdit={() => saveEdit(c.id)}
                  onCancelEdit={() => setEditingId(null)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Approved codes */}
        {approved.length > 0 && (
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: C.ok,
                margin: "0 0 8px",
              }}
            >
              Approved billing codes ({approved.length})
            </p>
            <div
              style={{
                border: `1px solid ${C.okBorder}`,
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              {approved.map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    padding: "11px 14px",
                    background: C.okBg,
                    borderTop: i > 0 ? `1px solid ${C.okBorder}` : undefined,
                  }}
                >
                  {editingId === c.id ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "120px 1fr",
                          gap: 8,
                        }}
                      >
                        <input
                          value={editFields.code}
                          onChange={(e) =>
                            setEditFields((prev) => ({
                              ...prev,
                              code: e.target.value,
                            }))
                          }
                          placeholder="Code"
                          style={inputStyle}
                        />
                        <input
                          value={editFields.description}
                          onChange={(e) =>
                            setEditFields((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Description"
                          style={inputStyle}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => saveEdit(c.id)}
                          disabled={pending}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: C.accent,
                            color: C.surface,
                            border: "none",
                            borderRadius: 5,
                            padding: "6px 12px",
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <Check size={13} /> Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: "transparent",
                            color: C.ink3,
                            border: `1px solid ${C.border2}`,
                            borderRadius: 5,
                            padding: "6px 10px",
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <Check
                        size={13}
                        color={C.ok}
                        strokeWidth={2.4}
                        style={{ flexShrink: 0 }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: C.ink,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {c.code}
                      </span>
                      <span style={{ fontSize: 13, color: C.ink2 }}>
                        {c.description}
                      </span>
                      {c.source === "MANUAL" && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            color: C.ink3,
                            padding: "1px 6px",
                            border: `1px solid ${C.border}`,
                            borderRadius: 3,
                          }}
                        >
                          Manual
                        </span>
                      )}
                      {c.confidence !== null && (
                        <ConfidenceChip value={c.confidence} />
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        disabled={pending}
                        title="Edit"
                        style={{
                          marginLeft: "auto",
                          color: C.ink3,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          display: "inline-flex",
                          padding: 2,
                        }}
                      >
                        <Pencil size={13} strokeWidth={2} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasAnyCodes && (
          <p style={{ fontSize: 13, color: C.ink3, margin: 0 }}>
            No CPT codes yet. Click &ldquo;Suggest with AI&rdquo; to generate
            suggestions from the approved SOAP note, or add a code manually
            below.
          </p>
        )}

        {/* Add manually */}
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: C.ink3,
              margin: "0 0 8px",
            }}
          >
            Add code manually
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "110px 1fr auto",
              gap: 8,
              alignItems: "center",
            }}
          >
            <input
              placeholder="99214"
              value={manCode}
              onChange={(e) => setManCode(e.target.value)}
              disabled={pending}
              style={{ ...inputStyle, opacity: pending ? 0.6 : 1 }}
            />
            <input
              placeholder="Office visit, moderate complexity"
              value={manDesc}
              onChange={(e) => setManDesc(e.target.value)}
              disabled={pending}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddManual();
              }}
              style={{ ...inputStyle, opacity: pending ? 0.6 : 1 }}
            />
            <button
              type="button"
              onClick={handleAddManual}
              disabled={pending}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: C.accentMut,
                color: C.accentDk,
                border: `1px solid ${C.border2}`,
                borderRadius: 6,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: pending ? "not-allowed" : "pointer",
                opacity: pending ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
