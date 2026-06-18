"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateMyProfile, changeMyPassword, changeMyEmail } from "../actions";
import type { Role } from "@/lib/permissions";

export type MeProfile = {
  id: string;
  email: string;
  name: string | null;
  title: string | null;
  phone: string | null;
  role: Role;
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
} as const;

function Card({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border2}`,
        borderRadius: 6,
        padding: 24,
        marginBottom: 16,
      }}
    >
      <p style={{ fontSize: 15, fontWeight: 600, color: C.ink, margin: 0 }}>
        {title}
      </p>
      <p style={{ fontSize: 13, color: C.ink3, margin: "4px 0 18px" }}>
        {desc}
      </p>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "9px 12px",
  fontSize: 14,
  background: C.bg,
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
function Btn({
  children,
  pending,
}: {
  children: React.ReactNode;
  pending: boolean;
}) {
  return (
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
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.6 : 1,
      }}
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

export default function AccountSection({ me }: { me: MeProfile }) {
  const [pending, start] = useTransition();

  const run = (
    fn: (fd: FormData) => Promise<{ ok: boolean; error?: string }>,
    fd: FormData,
    okMsg: string,
  ) => {
    start(async () => {
      const res = await fn(fd);
      if (res.ok) toast.success(okMsg);
      else toast.error(res.error ?? "Something went wrong.");
    });
  };

  return (
    <div>
      <Card
        title="Profile"
        desc="Your name and contact details, visible to your clinic."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(
              updateMyProfile,
              new FormData(e.currentTarget),
              "Profile updated",
            );
          }}
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          <div>
            <label style={labelStyle}>Display name</label>
            <input
              name="name"
              defaultValue={me.name ?? ""}
              placeholder="Dr. A. Sharma"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Title / specialty</label>
            <input
              name="title"
              defaultValue={me.title ?? ""}
              placeholder="Cardiologist"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input
              name="phone"
              defaultValue={me.phone ?? ""}
              placeholder="+91 …"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <input
              value={me.role}
              disabled
              style={{ ...inputStyle, color: C.ink3, cursor: "not-allowed" }}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <Btn pending={pending}>Save profile</Btn>
          </div>
        </form>
      </Card>

      <Card title="Change password" desc="Use at least 8 characters.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(changeMyPassword, fd, "Password changed");
            e.currentTarget.reset();
          }}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 14,
          }}
        >
          <div>
            <label style={labelStyle}>Current</label>
            <input name="current" type="password" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>New</label>
            <input name="next" type="password" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Confirm new</label>
            <input name="confirm" type="password" required style={inputStyle} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <Btn pending={pending}>Update password</Btn>
          </div>
        </form>
      </Card>

      <Card
        title="Email address"
        desc="Used to sign in. Changing it takes effect on next login."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(changeMyEmail, new FormData(e.currentTarget), "Email updated");
          }}
          style={{ display: "flex", gap: 12, alignItems: "flex-end" }}
        >
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Email</label>
            <input
              name="email"
              type="email"
              defaultValue={me.email}
              required
              style={inputStyle}
            />
          </div>
          <Btn pending={pending}>Update email</Btn>
        </form>
      </Card>
    </div>
  );
}
