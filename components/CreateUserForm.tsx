"use client";

import { useActionState } from "react";
import { createUser } from "@/app/(dashboard)/settings/actions";
import LayeredCard from "@/components/ui-kit/LayeredCard";

type State = { tempPassword?: string; error?: string } | null;

async function action(_prev: State, formData: FormData): Promise<State> {
  return createUser(formData);
}

export default function CreateUserForm() {
  const [state, formAction, pending] = useActionState<State, FormData>(
    action,
    null,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <form
        action={formAction}
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: 12,
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "var(--track-eyebrow)",
              color: "var(--color-ink-3)",
            }}
          >
            Email
          </span>
          <input
            type="email"
            name="email"
            required
            placeholder="name@clinic.com"
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-ctrl)",
              padding: "9px 12px",
              fontSize: 14,
              background: "var(--color-surface)",
              color: "var(--color-ink)",
              minWidth: 240,
            }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "var(--track-eyebrow)",
              color: "var(--color-ink-3)",
            }}
          >
            Role
          </span>
          <select
            name="role"
            defaultValue="DOCTOR"
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-ctrl)",
              padding: "9px 12px",
              fontSize: 14,
              background: "var(--color-surface)",
              color: "var(--color-ink)",
            }}
          >
            <option value="ADMIN">Admin</option>
            <option value="DOCTOR">Doctor</option>
            <option value="BILLING">Billing</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={pending}
          style={{
            background: "var(--color-accent)",
            color: "var(--color-surface)",
            borderRadius: "var(--radius-ctrl)",
            padding: "9px 18px",
            fontSize: 14,
            fontWeight: 600,
            border: "none",
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Inviting…" : "Invite member"}
        </button>
      </form>

      {state?.error && (
        <p style={{ fontSize: 13, color: "var(--color-danger)", margin: 0 }}>
          {state.error}
        </p>
      )}

      {state?.tempPassword && (
        <LayeredCard>
          <div
            style={{
              borderLeft: "3px solid var(--color-warning)",
              padding: "14px 16px",
            }}
          >
            <p
              style={{
                fontSize: 13,
                color: "var(--color-ink-2)",
                margin: "0 0 8px",
              }}
            >
              This password is shown once — copy it now.
            </p>
            <code
              style={{
                display: "inline-block",
                background: "var(--color-ink)",
                color: "var(--color-surface)",
                padding: "6px 12px",
                borderRadius: "var(--radius-ctrl)",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}
            >
              {state.tempPassword}
            </code>
          </div>
        </LayeredCard>
      )}
    </div>
  );
}
