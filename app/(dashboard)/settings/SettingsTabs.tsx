"use client";

import { useState } from "react";
import { Users, UserCog, Building2, ScrollText } from "lucide-react";
import TeamSection, { type TeamUser } from "./sections/TeamSection";
import AccountSection, { type MeProfile } from "./sections/AccountSection";

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
} as const;

type ClinicProfile = {
  name: string;
  addressLine: string | null;
  city: string | null;
  phone: string | null;
  timezone: string;
} | null;

type AuditEntry = {
  id: string;
  action: string;
  detail: string | null;
  actorName: string;
  createdAt: string;
};

type Tab = {
  id: string;
  label: string;
  icon: typeof Users;
  adminOnly: boolean;
};

const TABS: Tab[] = [
  { id: "account", label: "My account", icon: UserCog, adminOnly: false },
  { id: "team", label: "Team", icon: Users, adminOnly: true },
  { id: "clinic", label: "Clinic profile", icon: Building2, adminOnly: true },
  { id: "audit", label: "Activity log", icon: ScrollText, adminOnly: true },
];

export default function SettingsTabs({
  isAdmin,
  currentUserId,
  me,
  users,
  clinic,
  audit,
}: {
  isAdmin: boolean;
  currentUserId: string;
  me: MeProfile;
  users: TeamUser[];
  clinic: ClinicProfile;
  audit: AuditEntry[];
}) {
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);
  const [active, setActive] = useState(visibleTabs[0].id);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        gap: 28,
        alignItems: "start",
      }}
    >
      {/* Tab rail */}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          position: "sticky",
          top: 0,
        }}
      >
        {visibleTabs.map((t) => {
          const on = active === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 6,
                border: "none",
                background: on ? C.accent : "transparent",
                color: on ? C.surface : C.ink2,
                fontSize: 13.5,
                fontWeight: on ? 600 : 500,
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition: "background 150ms",
              }}
            >
              <Icon size={16} strokeWidth={2} />
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Panel */}
      <div style={{ minWidth: 0 }}>
        {active === "account" && <AccountSection me={me} />}
        {active === "team" && isAdmin && (
          <TeamSection users={users} currentUserId={currentUserId} />
        )}
        {active === "clinic" && isAdmin && (
          <ClinicPlaceholder clinic={clinic} />
        )}
        {active === "audit" && isAdmin && <AuditPlaceholder audit={audit} />}
      </div>
    </div>
  );
}

/* Clinic + Audit are wired with real data but I'll send their full
   interactive section files next turn; these render the data now. */
function ClinicPlaceholder({ clinic }: { clinic: ClinicProfile }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border2}`,
        borderRadius: 6,
        padding: 24,
      }}
    >
      <p style={{ fontSize: 14, color: C.ink2, margin: 0 }}>
        Clinic profile editor loads here — currently showing:{" "}
        <strong style={{ color: C.ink }}>{clinic?.name ?? "—"}</strong>
        {clinic?.city ? `, ${clinic.city}` : ""} ({clinic?.timezone}).
      </p>
    </div>
  );
}

function AuditPlaceholder({ audit }: { audit: AuditEntry[] }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border2}`,
        borderRadius: 6,
        padding: 24,
      }}
    >
      {audit.length === 0 ? (
        <p style={{ fontSize: 14, color: C.ink3, margin: 0 }}>
          No activity yet.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {audit.map((a) => (
            <li key={a.id} style={{ fontSize: 13, color: C.ink2 }}>
              <strong style={{ color: C.ink }}>{a.actorName}</strong> ·{" "}
              {a.action}
              {a.detail ? ` · ${a.detail}` : ""}{" "}
              <span style={{ color: C.ink3, fontSize: 11.5 }}>
                {new Date(a.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
