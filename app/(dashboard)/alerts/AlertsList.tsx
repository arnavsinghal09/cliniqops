"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type AlertRow = {
  id: string;
  metric: string;
  currentValue: number;
  baselineValue: number;
  deviationPercent: number;
  severity: string;
  weekOf: string;
  isRead: boolean;
  trend: number[];
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
  danger: "#B4423A",
  dangerBg: "#F7ECEA",
  warning: "#B07A2E",
  warningBg: "#F7F0E4",
} as const;

const SEV = {
  HIGH: { color: C.danger, bg: C.dangerBg, label: "High" },
  MEDIUM: { color: C.warning, bg: C.warningBg, label: "Medium" },
  LOW: { color: C.ink3, bg: C.bg, label: "Low" },
} as const;

const THRESHOLD: Record<string, string> = {
  HIGH: "exceeded 25%",
  MEDIUM: "exceeded 15%",
  LOW: "exceeded 10%",
};

const METRIC_TIP: Record<string, string> = {
  noShowRate:
    "Review reminder delivery and over-booking. A spike here often traces back to failed reminders or schedule density.",
  cancellationRate:
    "Look for scheduling conflicts or external drivers (holidays, weather). Repeated cancellations from the same slots are worth auditing.",
  totalRevenue:
    "Confirm billing was completed for this week's visits — a drop is frequently unbilled work rather than lost volume.",
  unbilledCount:
    "Cross-check completed visits missing a CPT code in the billing queue and clear the backlog.",
};

function sevOf(s: string) {
  return SEV[s as keyof typeof SEV] ?? SEV.LOW;
}
function prettyMetric(m: string): string {
  return m
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
function isRateMetric(m: string) {
  return /rate/i.test(m);
}
function isMoneyMetric(m: string) {
  return /revenue/i.test(m);
}
function fmtMetricValue(metric: string, v: number): string {
  if (isRateMetric(metric)) return `${(v * 100).toFixed(1)}%`;
  if (isMoneyMetric(metric))
    return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
}
function fmtDev(d: number): string {
  return `${d >= 0 ? "+" : "-"}${Math.abs(d).toFixed(1)}%`;
}

function linePoints(values: number[], w: number, h: number, pad = 2): string {
  if (values.length < 2) return `0,${h / 2} ${w},${h / 2}`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const n = values.length;
  return values
    .map((v, i) => {
      const x = (i / (n - 1)) * w;
      const y =
        range === 0
          ? h / 2
          : pad + (h - pad * 2) - ((v - min) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function AlertsList({ alerts }: { alerts: AlertRow[] }) {
  const [active, setActive] = useState<AlertRow | null>(null);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {alerts.map((a) => {
          const sev = sevOf(a.severity);
          const up = a.deviationPercent >= 0;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setActive(a)}
              style={{
                textAlign: "left",
                background: C.surface,
                border: `1px solid ${C.border2}`,
                borderLeft: `3px solid ${sev.color}`,
                borderRadius: 6,
                padding: "16px 20px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 22,
                boxShadow: "0 1px 2px rgba(40,30,20,0.05)",
                transition: "box-shadow 150ms, transform 150ms",
                width: "100%",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 2px 4px rgba(40,30,20,0.07), 0 10px 24px rgba(40,30,20,0.06)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 1px 2px rgba(40,30,20,0.05)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {/* Anchor: big deviation, fixed width so all rows align */}
              <div
                style={{
                  width: 132,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: sev.color,
                }}
              >
                {up ? (
                  <TrendingUp size={20} strokeWidth={2.4} />
                ) : (
                  <TrendingDown size={20} strokeWidth={2.4} />
                )}
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {fmtDev(a.deviationPercent)}
                </span>
              </div>

              {/* Divider */}
              <span
                style={{
                  width: 1,
                  alignSelf: "stretch",
                  background: C.border,
                  flexShrink: 0,
                }}
              />

              {/* Metric + severity + date */}
              <div style={{ minWidth: 0, flexShrink: 0, width: 230 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p
                    style={{
                      fontSize: 14.5,
                      fontWeight: 600,
                      color: C.ink,
                      margin: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {prettyMetric(a.metric)}
                  </p>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      background: sev.bg,
                      color: sev.color,
                      fontSize: 9.5,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      padding: "2px 6px",
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  >
                    <AlertTriangle size={10} strokeWidth={2.4} />
                    {sev.label}
                  </span>
                </div>
                <p style={{ fontSize: 11.5, color: C.ink3, margin: "3px 0 0" }}>
                  Week of {format(new Date(a.weekOf), "dd MMM yyyy")}
                </p>
              </div>

              {/* this week → baseline comparison pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginLeft: "auto",
                  flexShrink: 0,
                }}
              >
                <ValueChip
                  label="This week"
                  value={fmtMetricValue(a.metric, a.currentValue)}
                  emphasis={sev.color}
                />
                <ArrowRight
                  size={15}
                  strokeWidth={2}
                  color={C.ink3}
                  style={{ flexShrink: 0 }}
                />
                <ValueChip
                  label="Baseline"
                  value={fmtMetricValue(a.metric, a.baselineValue)}
                  emphasis={C.ink2}
                />
              </div>

              {/* affordance */}
              <ChevronRight
                size={18}
                strokeWidth={2}
                color={C.ink3}
                style={{ flexShrink: 0 }}
              />
            </button>
          );
        })}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent
          side="right"
          style={{
            background: C.surface,
            borderLeft: `1px solid ${C.border2}`,
            width: 460,
            maxWidth: "94vw",
            padding: 0,
          }}
        >
          <div
            style={{
              height: "100%",
              overflowY: "auto",
              padding: "28px 28px 40px",
              boxSizing: "border-box",
            }}
          >
            {active && <DetailBody alert={active} />}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function ValueChip({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis: string;
}) {
  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: "7px 12px",
        textAlign: "center",
        minWidth: 78,
      }}
    >
      <p
        style={{
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: C.ink3,
          fontWeight: 600,
          margin: 0,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: emphasis,
          margin: "2px 0 0",
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function DetailBody({ alert }: { alert: AlertRow }) {
  const sev = sevOf(alert.severity);
  const up = alert.deviationPercent >= 0;
  const direction = up ? "increased" : "decreased";
  const W = 396;
  const H = 96;
  const line = linePoints(alert.trend, W, H, 6);
  const area = `0,${H} ${line} ${W},${H}`;
  const tip =
    METRIC_TIP[alert.metric] ??
    "Investigate the underlying appointments driving this change.";

  return (
    <>
      <SheetHeader style={{ padding: 0, marginBottom: 20 }}>
        <p
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: C.ink3,
            fontWeight: 600,
            margin: 0,
          }}
        >
          Anomaly Detail
        </p>
        <SheetTitle
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: C.ink,
            letterSpacing: "-0.02em",
            margin: "6px 0 0",
          }}
        >
          {prettyMetric(alert.metric)}
        </SheetTitle>
      </SheetHeader>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: sev.bg,
          border: `1px solid ${sev.color}33`,
          borderRadius: 6,
          padding: "16px 18px",
          marginBottom: 22,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: sev.color,
          }}
        >
          <AlertTriangle size={14} strokeWidth={2.4} />
          {sev.label} severity
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: sev.color,
          }}
        >
          {up ? (
            <TrendingUp size={20} strokeWidth={2.4} />
          ) : (
            <TrendingDown size={20} strokeWidth={2.4} />
          )}
          {fmtDev(alert.deviationPercent)}
        </span>
      </div>

      <p
        style={{
          fontSize: 14,
          lineHeight: 1.55,
          color: C.ink2,
          margin: "0 0 22px",
        }}
      >
        {prettyMetric(alert.metric)} {direction} to{" "}
        <strong style={{ color: C.ink }}>
          {fmtMetricValue(alert.metric, alert.currentValue)}
        </strong>{" "}
        this week, against a 12-week baseline of{" "}
        <strong style={{ color: C.ink }}>
          {fmtMetricValue(alert.metric, alert.baselineValue)}
        </strong>
        .
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <StatBox
          label="This week"
          value={fmtMetricValue(alert.metric, alert.currentValue)}
          color={sev.color}
        />
        <StatBox
          label="Baseline (median)"
          value={fmtMetricValue(alert.metric, alert.baselineValue)}
          color={C.ink2}
        />
      </div>

      <p
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: C.ink3,
          fontWeight: 600,
          margin: "0 0 10px",
        }}
      >
        Last 4 weeks
      </p>
      <div
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          padding: 18,
          marginBottom: 24,
        }}
      >
        <svg
          width="100%"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ display: "block" }}
        >
          <polygon points={area} fill={sev.color} fillOpacity={0.08} />
          <polyline
            points={line}
            stroke={sev.color}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 10,
            fontSize: 11,
            color: C.ink3,
          }}
        >
          {alert.trend.map((v, i) => (
            <span key={i}>{fmtMetricValue(alert.metric, v)}</span>
          ))}
        </div>
      </div>

      <Section label="Why this was flagged">
        Deviation from baseline{" "}
        {THRESHOLD[alert.severity] ?? "exceeded the threshold"}, which
        classifies this week as{" "}
        <strong style={{ color: C.ink }}>{sev.label.toLowerCase()}</strong>{" "}
        severity.
      </Section>

      <Section label="Suggested next step">{tip}</Section>

      <p style={{ fontSize: 12, color: C.ink3, margin: "8px 0 0" }}>
        Week of {format(new Date(alert.weekOf), "dd MMM yyyy")}
      </p>
    </>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: C.ink3,
          fontWeight: 600,
          margin: "0 0 6px",
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: C.ink2, margin: 0 }}>
        {children}
      </p>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        boxSizing: "border-box",
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: "13px 15px",
      }}
    >
      <p
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: C.ink3,
          fontWeight: 600,
          margin: 0,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 20,
          fontWeight: 700,
          color,
          margin: "5px 0 0",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>
    </div>
  );
}
