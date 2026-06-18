"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Toast = {
  id: string;
  metric: string;
  deviationPercent: number;
  severity: string;
};

type AlertRecord = {
  id?: string;
  metric: string;
  deviationPercent: number;
  severity: string;
};

export default function AlertToastListener({ clinicId }: { clinicId: string }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    const channel = supabase
      .channel("alert-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Alert",
          filter: `clinicId=eq.${clinicId}`,
        },
        (payload) => {
          const a = payload.new as AlertRecord;
          const id = a.id ?? String(Date.now());
          setToasts((prev) => [
            ...prev,
            {
              id,
              metric: a.metric,
              deviationPercent: a.deviationPercent,
              severity: a.severity,
            },
          ]);
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
          }, 6000);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {toasts.map((t) => {
        const high = t.severity === "HIGH";
        return (
          <div
            key={t.id}
            style={{
              background: "#FBFAF7",
              border: "1px solid #E3DDD3",
              borderLeft: `4px solid ${high ? "#B4423A" : "#B07A2E"}`,
              borderRadius: 6,
              padding: "12px 16px",
              minWidth: 260,
              boxShadow: "0 8px 24px rgba(40,30,20,0.1)",
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#1A1714",
                margin: "0 0 2px",
              }}
            >
              New anomaly detected
            </p>
            <p style={{ fontSize: 12.5, color: "#4A453F", margin: 0 }}>
              {t.metric} — {t.deviationPercent.toFixed(1)}% deviation
            </p>
          </div>
        );
      })}
    </div>
  );
}
