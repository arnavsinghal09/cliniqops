"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { loadDemoData } from "./seed-action";

const C = {
  surface: "#FBFAF7",
  bg: "#F4F1EB",
  ink: "#1A1714",
  ink2: "#4A453F",
  ink3: "#8A827A",
  border2: "#D8D0C4",
  accent: "#72554D",
  accentMut: "#EDE6DF",
  accentDk: "#4A352E",
};

export default function EmptyState() {
  const [pending, start] = useTransition();

  const seed = () => {
    start(async () => {
      const res = await loadDemoData();
      if (res.ok) {
        toast.success(`Loaded ${res.created} demo appointments`);
        window.location.href = "/dashboard?fresh=true";
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 460,
          width: "100%",
          background: C.surface,
          border: `1px solid ${C.border2}`,
          borderRadius: 6,
          padding: 32,
          textAlign: "center",
          boxShadow: "0 8px 24px rgba(40,30,20,0.06)",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: C.ink3,
            margin: "0 0 6px",
          }}
        >
          GETTING STARTED
        </p>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: C.ink,
            margin: "0 0 10px",
          }}
        >
          Your dashboard is empty
        </h1>
        <p
          style={{
            fontSize: 14,
            color: C.ink2,
            margin: "0 0 24px",
            lineHeight: 1.55,
          }}
        >
          Upload your clinic&apos;s appointment data to see no-show rates,
          revenue, alerts, and more. Or load demo data to explore.
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href="/upload"
            style={{
              display: "inline-block",
              background: C.accent,
              color: C.surface,
              borderRadius: 6,
              padding: "11px 22px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Upload your data
          </a>
          <button
            type="button"
            onClick={seed}
            disabled={pending}
            style={{
              background: C.accentMut,
              color: C.accentDk,
              border: "none",
              borderRadius: 6,
              padding: "11px 22px",
              fontSize: 14,
              fontWeight: 600,
              cursor: pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? "Loading…" : "Load demo data"}
          </button>
        </div>
      </div>
    </div>
  );
}
