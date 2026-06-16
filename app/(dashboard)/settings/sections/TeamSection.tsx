"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserPlus, KeyRound, Ban, CheckCircle2 } from "lucide-react";
import {
  createUser,
  updateUserRole,
  setUserStatus,
  resetUserPassword,
} from "../actions";
import type { Role } from "@/lib/permissions";

export type TeamUser = {
  id: string;
  email: string;
  name: string | null;
  title: string | null;
  phone: string | null;
  role: Role;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
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
  danger: "#B4423A",
  dangerBg: "#F7ECEA",
  warning: "#B07A2E",
  warningBg: "#F7F0E4",
  ok: "#4E6B4F",
  okBg: "#ECF0EA",
} as const;

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  ADMIN: { bg: C.accentMut, color: C.accentDk },
  DOCTOR: { bg: C.okBg, color: C.ok },
  BILLING: { bg: C.warningBg, color: C.warning },
};

const inputStyle: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "9px 12px",
  fontSize: 14,
  background: C.surface,
  color: C.ink,
  boxSizing: "border-box",
  width: "100%",
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

export default function TeamSection({
  users,
  currentUserId,
}: {
  users: TeamUser[];
  currentUserId: string;
}) {
  const [pending, start] = useTransition();
  const [tempPw, setTempPw] = useState<{ email: string; pw: string } | null>(
    null,
  );

  const act = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) => {
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(okMsg);
      else toast.error(res.error ?? "Action failed.");
    });
  };

  const invite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const res = await createUser(fd);
      if (res.ok) {
        toast.success("Member invited");
        setTempPw({ email: String(fd.get("email")), pw: res.tempPassword });
        form.reset();
      } else toast.error(res.error ?? "Couldn't invite.");
    });
  };

  return (
    <div>
      {/* Invite card */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border2}`,
          borderRadius: 6,
          padding: 24,
          marginBottom: 16,
        }}
      >
        <p
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: C.ink,
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <UserPlus size={17} strokeWidth={2} /> Invite team member
        </p>
        <p style={{ fontSize: 13, color: C.ink3, margin: "4px 0 18px" }}>
          Creates an account with a temporary password you&apos;ll share once.
        </p>
        <form
          onSubmit={invite}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 14,
          }}
        >
          <div>
            <label style={labelStyle}>Email *</label>
            <input
              name="email"
              type="email"
              required
              placeholder="name@clinic.com"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Full name</label>
            <input
              name="name"
              placeholder="Dr. Riya Patel"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Title / specialty</label>
            <input name="title" placeholder="Pediatrician" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input name="phone" placeholder="+91 …" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <select name="role" defaultValue="DOCTOR" style={inputStyle}>
              <option value="ADMIN">Admin</option>
              <option value="DOCTOR">Doctor</option>
              <option value="BILLING">Billing</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="submit"
              disabled={pending}
              style={{
                background: C.accent,
                color: C.surface,
                border: "none",
                borderRadius: 6,
                padding: "9px 18px",
                fontSize: 14,
                fontWeight: 600,
                width: "100%",
                cursor: pending ? "not-allowed" : "pointer",
                opacity: pending ? 0.6 : 1,
              }}
            >
              {pending ? "Inviting…" : "Send invite"}
            </button>
          </div>
        </form>

        {tempPw && (
          <div
            style={{
              marginTop: 16,
              borderLeft: `3px solid ${C.warning}`,
              background: C.warningBg,
              borderRadius: 6,
              padding: "14px 16px",
            }}
          >
            <p style={{ fontSize: 13, color: C.ink2, margin: "0 0 8px" }}>
              Temporary password for <strong>{tempPw.email}</strong> — shown
              once, copy it now:
            </p>
            <code
              style={{
                display: "inline-block",
                background: C.ink,
                color: C.surface,
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {tempPw.pw}
            </code>
          </div>
        )}
      </div>

      {/* Member table */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border2}`,
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Member", "Role", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    style={{
                      background: C.accentMut,
                      color: C.accentDk,
                      padding: "10px 14px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const badge = ROLE_BADGE[u.role] ?? ROLE_BADGE.DOCTOR;
                const isSelf = u.id === currentUserId;
                const suspended = u.status === "SUSPENDED";
                return (
                  <tr
                    key={u.id}
                    style={{
                      background: i % 2 ? C.bg : C.surface,
                      opacity: suspended ? 0.6 : 1,
                    }}
                  >
                    <td
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        padding: "12px 14px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: C.ink,
                        }}
                      >
                        {u.name ?? u.email.split("@")[0]}
                        {isSelf && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 10.5,
                              color: C.ink3,
                            }}
                          >
                            (you)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: C.ink3 }}>
                        {u.email}
                        {u.title ? ` · ${u.title}` : ""}
                      </div>
                    </td>
                    <td
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        padding: "12px 14px",
                      }}
                    >
                      <select
                        value={u.role}
                        disabled={pending}
                        onChange={(e) =>
                          act(
                            () => updateUserRole(u.id, e.target.value as Role),
                            "Role updated",
                          )
                        }
                        style={{
                          ...inputStyle,
                          padding: "6px 10px",
                          fontSize: 13,
                          width: "auto",
                        }}
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="DOCTOR">Doctor</option>
                        <option value="BILLING">Billing</option>
                      </select>
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          padding: "2px 7px",
                          borderRadius: 4,
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        padding: "12px 14px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          padding: "3px 9px",
                          borderRadius: 4,
                          background: suspended ? C.dangerBg : C.okBg,
                          color: suspended ? C.danger : C.ok,
                        }}
                      >
                        {suspended ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        padding: "12px 14px",
                      }}
                    >
                      <div style={{ display: "flex", gap: 8 }}>
                        <IconBtn
                          label="Reset password"
                          icon={<KeyRound size={14} />}
                          disabled={pending}
                          onClick={() =>
                            start(async () => {
                              const res = await resetUserPassword(u.id);
                              if (res.ok)
                                setTempPw({
                                  email: u.email,
                                  pw: res.tempPassword,
                                });
                              else toast.error(res.error ?? "Failed.");
                            })
                          }
                        />
                        {!isSelf &&
                          (suspended ? (
                            <IconBtn
                              label="Reactivate"
                              icon={<CheckCircle2 size={14} />}
                              disabled={pending}
                              onClick={() =>
                                act(
                                  () => setUserStatus(u.id, "ACTIVE"),
                                  "Reactivated",
                                )
                              }
                            />
                          ) : (
                            <IconBtn
                              label="Suspend"
                              icon={<Ban size={14} />}
                              danger
                              disabled={pending}
                              onClick={() =>
                                act(
                                  () => setUserStatus(u.id, "SUSPENDED"),
                                  "Suspended",
                                )
                              }
                            />
                          ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  label,
  icon,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        border: `1px solid ${danger ? "#E7C9C6" : C.border2}`,
        background: C.surface,
        color: danger ? C.danger : C.ink2,
        borderRadius: 6,
        padding: "5px 9px",
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}
