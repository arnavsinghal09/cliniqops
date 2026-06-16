"use client";

import { useState, useTransition } from "react";
import { updateUserRole } from "@/app/(dashboard)/settings/actions";
import type { Role } from "@/lib/permissions";

export default function RoleSelect({
  userId,
  current,
}: {
  userId: string;
  current: Role;
}) {
  const [role, setRole] = useState<Role>(current);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onChange = (next: Role) => {
    const prev = role;
    setRole(next); // optimistic
    setError(null);
    startTransition(async () => {
      const res = await updateUserRole(userId, next);
      if (res?.error) {
        setRole(prev); // rollback
        setError(res.error);
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <select
        value={role}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as Role)}
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-ctrl)",
          padding: "6px 10px",
          fontSize: 13,
          background: "var(--color-surface)",
          color: "var(--color-ink)",
          cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.6 : 1,
        }}
      >
        <option value="ADMIN">Admin</option>
        <option value="DOCTOR">Doctor</option>
        <option value="BILLING">Billing</option>
      </select>
      {error && (
        <span style={{ fontSize: 11, color: "var(--color-danger)" }}>
          {error}
        </span>
      )}
    </div>
  );
}
