"use client";

import { useState, useMemo, useTransition, type CSSProperties } from "react";
import VoiceInput from "./VoiceInput";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";
import { toast } from "sonner";
import {
  Sparkles,
  Copy,
  Download,
  RotateCcw,
  Database,
  TableIcon,
  CornerDownLeft,
  SearchX,
  AlertTriangle,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  runNlQuery,
  type NlQueryResult,
  type QueryRow,
  type CellValue,
} from "./actions";

/* ──────────────────────────────────────────────────────────────────────────
   Palette hard-coded from the locked design tokens (globals.css uses
   --color-brand / --color-line names, so var() lookups washed out). Hex values
   are identical to the locked tokens.
   ────────────────────────────────────────────────────────────────────────── */
const C = {
  bg: "#F4F1EB",
  surface: "#FBFAF7",
  accent: "#72554D",
  accentDk: "#4A352E",
  accentMut: "#EDE6DF",
  sand: "#EEDFD1",
  amber: "#E8A06A",
  clay: "#9B4E45",
  ink: "#1A1714",
  ink2: "#4A453F",
  ink3: "#8A827A",
  border: "#E3DDD3",
  border2: "#D8D0C4",
  danger: "#B4423A",
  dangerBg: "#F7ECEA",
  ok: "#4E6B4F",
} as const;
const R = { card: "6px", ctrl: "6px", badge: "4px" } as const;
const SHADOW = "0 1px 2px rgba(40,30,20,0.06), 0 10px 28px rgba(40,30,20,0.07)";
const TRACK = "0.14em";
const EASE = "cubic-bezier(0.25,1,0.5,1)";

const CHIPS: readonly string[] = [
  "Which doctor has the worst no-show rate this month?",
  "Show me diabetic patients with no visit in 6 months",
  "What is our total revenue this week?",
  "Which appointment types are most commonly unbilled?",
  "What is our cancellation rate by day of week?",
  "Which patients are overdue for a follow-up?",
];

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/* ── column classification (word-boundary aware) ──
   These use \b boundaries and a tokenised match so that, e.g.:
   - "duration" never matches "ratio" (the old %-bug),
   - "_count" never gets a "$".
   We split the column into word tokens (snake/camel/space) and test tokens. */
function tokens(col: string): string[] {
  return col
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase → spaced
    .split(/[^a-zA-Z]+/)
    .filter(Boolean)
    .map((t) => t.toLowerCase());
}

function hasToken(col: string, words: readonly string[]): boolean {
  const set = new Set(tokens(col));
  return words.some((w) => set.has(w));
}

const isRateCol = (c: string) =>
  hasToken(c, ["rate", "pct", "percent", "percentage", "ratio"]);
const isDurationCol = (c: string) =>
  hasToken(c, [
    "minutes",
    "minute",
    "mins",
    "min",
    "duration",
    "hours",
    "hour",
  ]);
const isCountCol = (c: string) =>
  hasToken(c, [
    "count",
    "num",
    "number",
    "quantity",
    "qty",
    "visits",
    "appointments",
    "patients",
    "shows",
    "noshows",
    "cancellations",
    "total", // "total" alone = a count unless paired with a money word below
    "rows",
  ]);
const isMoneyCol = (c: string) =>
  hasToken(c, [
    "revenue",
    "amount",
    "cost",
    "price",
    "charge",
    "billed",
    "billing",
    "paid",
    "dollars",
  ]);

type Unit = "money" | "rate" | "duration" | "plain";
function unitOf(col: string): Unit {
  // money wins over "total"-as-count (e.g. total_revenue), but a pure count
  // column like unbilled_count must NOT be money.
  if (isMoneyCol(col)) return "money";
  if (isRateCol(col)) return "rate";
  if (isDurationCol(col)) return "duration";
  if (isCountCol(col)) return "plain";
  return "plain";
}

function fmtNumber(col: string, n: number): string {
  switch (unitOf(col)) {
    case "money":
      return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    case "rate":
      return `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
    case "duration":
      return `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })} min`;
    default:
      return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
}

function fmtCell(col: string, v: CellValue): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return fmtNumber(col, v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function shortLabel(col: string, v: CellValue): string {
  if (v == null) return "—";
  if (hasToken(col, ["dow", "weekday"]) || /day_of_week/i.test(col)) {
    const i = Number(v);
    if (Number.isInteger(i) && i >= 0 && i <= 6) return DOW[i];
  }
  const s = String(v);
  if (s.includes("@")) return s.split("@")[0];
  return s.length > 22 ? s.slice(0, 20) + "…" : s;
}

function looksTemporal(rows: QueryRow[], key: string): boolean {
  if (!key) return false;
  if (
    hasToken(key, [
      "month",
      "date",
      "day",
      "week",
      "dow",
      "weekday",
      "period",
      "quarter",
      "year",
      "time",
    ])
  )
    return true;
  const sample = rows.slice(0, 5).map((r) => r[key]);
  if (sample.every((v) => typeof v === "number")) return false;
  const dateish = sample.filter((v) => {
    if (v == null) return false;
    const s = String(v);
    if (/^\d{4}-\d{2}(-\d{2})?/.test(s)) return true;
    return !Number.isNaN(Date.parse(s)) && /\d{4}/.test(s);
  });
  return sample.length > 0 && dateish.length >= Math.ceil(sample.length / 2);
}

/* ── view model ── */
type ViewModel =
  | { kind: "hero"; valueKey: string; value: number; label: string | null }
  | { kind: "bar"; categoryKey: string; valueKey: string }
  | { kind: "line"; categoryKey: string; valueKey: string }
  | { kind: "table" };

function buildView(result: NlQueryResult): ViewModel | null {
  const { rows, columns } = result;
  if (rows.length === 0 || columns.length === 0) return null;

  const first = rows[0];
  const numericCols = columns.filter((c) => typeof first[c] === "number");
  const categoryCols = columns.filter((c) => typeof first[c] !== "number");
  const categoryKey = categoryCols[0] ?? columns[0];
  const valueKey = numericCols[0] ?? columns[1] ?? columns[0];

  if (rows.length === 1 && numericCols.length === 1) {
    const v = first[valueKey];
    return {
      kind: "hero",
      valueKey,
      value: typeof v === "number" ? v : Number(v) || 0,
      label: categoryCols[0] ? String(first[categoryCols[0]]) : null,
    };
  }

  const chartable =
    numericCols.length >= 1 && categoryCols.length >= 1 && rows.length <= 40;
  if (chartable) {
    return {
      kind: looksTemporal(rows, categoryKey) ? "line" : "bar",
      categoryKey,
      valueKey,
    };
  }
  return { kind: "table" };
}

/* ── card ── */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border2}`,
        borderRadius: R.card,
        boxShadow: SHADOW,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

export default function NLQueryInterface() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<NlQueryResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const ask = (q: string): void => {
    startTransition(() => {
      void runNlQuery(q).then((res) => {
        setResult(res);
        if (!res.error && res.rows.length > 0) {
          const vm = buildView(res);
          const spoken =
            vm?.kind === "hero"
              ? `${vm.valueKey.replace(/_/g, " ")} is ${fmtNumber(vm.valueKey, vm.value)}.`
              : vm?.kind === "bar" || vm?.kind === "line"
                ? `Here's a ${vm.kind} chart with ${res.rows.length} ${res.rows.length === 1 ? "point" : "points"}.`
                : `I found ${res.rows.length} ${res.rows.length === 1 ? "result" : "results"}.`;
          speak(spoken);
        }
      });
    });
  };
  const submit = (): void => {
    const q = text.trim();
    if (!q || isPending) return;
    ask(q);
  };
  const onChip = (q: string): void => {
    if (isPending) return;
    setText(q);
    ask(q);
  };
  const reset = (): void => {
    setText("");
    setResult(null);
  };
  const copySql = (): void => {
    if (!result?.sql) return;
    void navigator.clipboard.writeText(result.sql);
    toast.success("SQL copied to clipboard");
  };
  const exportCsv = (): void => {
    if (!result || result.columns.length === 0) return;
    const esc = (v: CellValue): string => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      result.columns.join(","),
      ...result.rows.map((r) => result.columns.map((c) => esc(r[c])).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cliniqops-query.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported CSV");
  };

  const speak = (text: string): void => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  const status: "idle" | "error" | "empty" | "data" = !result
    ? "idle"
    : result.error
      ? "error"
      : result.rows.length === 0
        ? "empty"
        : "data";

  const view = useMemo<ViewModel | null>(
    () => (result && status === "data" ? buildView(result) : null),
    [result, status],
  );

  const tooltipStyle: CSSProperties = {
    background: C.surface,
    border: `1px solid ${C.border2}`,
    borderRadius: R.card,
    fontSize: 12,
    color: C.ink,
    boxShadow: SHADOW,
  };
  const tick = { fill: C.ink3, fontSize: 11 } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <style>{`
        @keyframes nlq-pulse { 0%,100% { opacity: .6 } 50% { opacity: 1 } }
        @keyframes nlq-shimmer { 0% { background-position: -480px 0 } 100% { background-position: 480px 0 } }
        @keyframes nlq-fade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        .nlq-thinking { animation: nlq-pulse 1.2s ease-in-out infinite; }
        .nlq-fade { animation: nlq-fade .35s ${EASE} both; }
        .nlq-skel {
          background: linear-gradient(90deg, ${C.accentMut} 0%, ${C.sand} 50%, ${C.accentMut} 100%);
          background-size: 480px 100%;
          animation: nlq-shimmer 1.3s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .nlq-thinking, .nlq-skel, .nlq-fade { animation: none; }
        }
      `}</style>

      {/* ── Input ── */}
      <Card>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          rows={3}
          placeholder="Ask anything about your clinic… e.g. which doctor has the worst no-show rate this month?"
          style={{
            width: "100%",
            resize: "none",
            padding: "16px",
            background: "transparent",
            color: C.ink,
            fontSize: 15,
            lineHeight: 1.5,
            border: "none",
            outline: "none",
            display: "block",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 16px",
            borderTop: `1px solid ${C.border}`,
            background: C.bg,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: C.ink3,
              fontSize: 11.5,
            }}
          >
            <CornerDownLeft size={13} strokeWidth={2} />
            <kbd
              style={{
                fontSize: 10.5,
                padding: "1px 5px",
                borderRadius: R.badge,
                background: C.accentMut,
                color: C.accentDk,
              }}
            >
              ⌘ / Ctrl
            </kbd>
            + Enter to run
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <VoiceInput
              onTranscript={setText}
              onComplete={(t) => {
                setText(t);
                ask(t);
              }}
            />
            {result && (
              <button
                type="button"
                onClick={reset}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: C.ink3,
                  fontSize: 13,
                  padding: "8px 12px",
                  borderRadius: R.ctrl,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: `color 150ms ${EASE}`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.ink2)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.ink3)}
              >
                <RotateCcw size={14} strokeWidth={2} /> Clear
              </button>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={isPending || text.trim().length === 0}
              className={isPending ? "nlq-thinking" : ""}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: C.accent,
                color: C.surface,
                borderRadius: R.ctrl,
                padding: "9px 18px",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                cursor:
                  isPending || text.trim().length === 0
                    ? "not-allowed"
                    : "pointer",
                opacity: text.trim().length === 0 && !isPending ? 0.5 : 1,
                transition: `background 220ms ${EASE}, opacity 220ms`,
              }}
              onMouseEnter={(e) => {
                if (!isPending && text.trim().length > 0)
                  e.currentTarget.style.background = C.accentDk;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = C.accent;
              }}
            >
              <Sparkles size={15} strokeWidth={2} />
              {isPending ? "Thinking…" : "Ask"}
            </button>
          </div>
        </div>
      </Card>

      {/* ── Chips ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: TRACK,
            color: C.ink3,
            fontWeight: 600,
            margin: 0,
          }}
        >
          Try asking
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onChip(chip)}
              disabled={isPending}
              style={{
                background: C.surface,
                color: C.accentDk,
                border: `1px solid ${C.border2}`,
                borderRadius: R.badge,
                padding: "6px 13px",
                fontSize: 12.5,
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.5 : 1,
                transition: `all 150ms ${EASE}`,
              }}
              onMouseEnter={(e) => {
                if (!isPending) {
                  e.currentTarget.style.background = C.accentMut;
                  e.currentTarget.style.borderColor = C.accent;
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = C.surface;
                e.currentTarget.style.borderColor = C.border2;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading skeleton ── */}
      {isPending && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            className="nlq-skel"
            style={{ height: 240, borderRadius: R.card }}
          />
          <div
            className="nlq-skel"
            style={{ height: 120, borderRadius: R.card }}
          />
        </div>
      )}

      {/* ── Results ── */}
      {!isPending && result && (
        <div
          className="nlq-fade"
          style={{ display: "flex", flexDirection: "column", gap: 24 }}
        >
          {/* Error */}
          {status === "error" && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                border: `1px solid ${C.danger}`,
                borderLeftWidth: 3,
                background: C.dangerBg,
                color: C.danger,
                padding: "16px 18px",
                fontSize: 14,
                borderRadius: R.card,
                lineHeight: 1.5,
              }}
            >
              <AlertTriangle
                size={18}
                strokeWidth={2}
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <span>{result.error}</span>
            </div>
          )}

          {/* Empty */}
          {status === "empty" && (
            <Card>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  padding: "44px 20px",
                  color: C.ink3,
                  textAlign: "center",
                }}
              >
                <SearchX size={24} strokeWidth={1.6} />
                <p style={{ fontSize: 14, margin: 0, color: C.ink2 }}>
                  No rows matched this question.
                </p>
                <p style={{ fontSize: 12.5, margin: 0 }}>
                  The query ran fine — there&apos;s just no data that fits. Open
                  the SQL below to check the logic.
                </p>
              </div>
            </Card>
          )}

          {/* Hero */}
          {view?.kind === "hero" && (
            <Card>
              <div style={{ padding: "28px 26px" }}>
                <p
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: TRACK,
                    color: C.ink3,
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {view.valueKey.replace(/_/g, " ")}
                </p>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 48,
                    fontWeight: 700,
                    color: C.accent,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.0,
                  }}
                >
                  {fmtNumber(view.valueKey, view.value)}
                </div>
                {view.label && (
                  <p style={{ fontSize: 14, color: C.ink2, margin: "8px 0 0" }}>
                    {view.label}
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Bar */}
          {view?.kind === "bar" && (
            <Card>
              <div style={{ padding: "20px 16px 16px" }}>
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(220, result.rows.length * 52)}
                >
                  <BarChart
                    data={result.rows}
                    layout="vertical"
                    margin={{ left: 8, right: 56, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid
                      stroke={C.border}
                      strokeDasharray="3 3"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={tick}
                      tickFormatter={(v: number) => fmtNumber(view.valueKey, v)}
                    />
                    <YAxis
                      type="category"
                      dataKey={view.categoryKey}
                      width={150}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: C.ink2, fontSize: 12 }}
                      tickFormatter={(v: CellValue) =>
                        shortLabel(view.categoryKey, v)
                      }
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: C.accentMut, opacity: 0.45 }}
                      formatter={(v) => [
                        fmtNumber(view.valueKey, Number(v)),
                        view.valueKey.replace(/_/g, " "),
                      ]}
                      labelFormatter={(l) =>
                        shortLabel(view.categoryKey, l as CellValue)
                      }
                    />
                    <Bar dataKey={view.valueKey} radius={[0, 4, 4, 0]}>
                      {result.rows.map((_, i) => (
                        <Cell
                          key={i}
                          fill={i === 0 ? C.accent : C.clay}
                          fillOpacity={i === 0 ? 1 : 0.82}
                        />
                      ))}
                      <LabelList
                        dataKey={view.valueKey}
                        position="right"
                        formatter={(v) => fmtNumber(view.valueKey, Number(v))}
                        style={{ fill: C.ink2, fontSize: 12, fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Line */}
          {view?.kind === "line" && (
            <Card>
              <div style={{ padding: "20px 16px 16px" }}>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={result.rows}
                    margin={{ left: 4, right: 16, top: 8, bottom: 4 }}
                  >
                    <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                    <XAxis
                      dataKey={view.categoryKey}
                      axisLine={false}
                      tickLine={false}
                      tick={tick}
                      tickFormatter={(v: CellValue) =>
                        shortLabel(view.categoryKey, v)
                      }
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={tick}
                      tickFormatter={(v: number) => fmtNumber(view.valueKey, v)}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ stroke: C.border2 }}
                      formatter={(v) => [
                        fmtNumber(view.valueKey, Number(v)),
                        view.valueKey.replace(/_/g, " "),
                      ]}
                      labelFormatter={(l) =>
                        shortLabel(view.categoryKey, l as CellValue)
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey={view.valueKey}
                      stroke={C.accent}
                      strokeWidth={2.5}
                      dot={{ fill: C.accent, r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: C.accent }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Table */}
          {status === "data" && result.columns.length > 0 && (
            <Card>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: `1px solid ${C.border}`,
                  background: C.bg,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: C.ink2,
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <TableIcon size={15} strokeWidth={2} />
                  {result.rows.length}{" "}
                  {result.rows.length === 1 ? "row" : "rows"}
                </span>
                <button
                  type="button"
                  onClick={exportCsv}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: C.ink2,
                    fontSize: 12.5,
                    padding: "5px 10px",
                    borderRadius: R.ctrl,
                    border: `1px solid ${C.border2}`,
                    background: C.surface,
                    cursor: "pointer",
                    transition: `all 150ms ${EASE}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = C.accentMut;
                    e.currentTarget.style.color = C.accentDk;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = C.surface;
                    e.currentTarget.style.color = C.ink2;
                  }}
                >
                  <Download size={13} strokeWidth={2} /> CSV
                </button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {result.columns.map((col) => (
                        <th
                          key={col}
                          style={{
                            background: C.accentMut,
                            color: C.accentDk,
                            padding: "10px 14px",
                            textAlign: "left",
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: TRACK,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {col.replace(/_/g, " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr
                        key={i}
                        style={{ background: i % 2 === 1 ? C.bg : C.surface }}
                      >
                        {result.columns.map((col) => (
                          <td
                            key={col}
                            style={{
                              borderBottom: `1px solid ${C.border}`,
                              padding: "10px 14px",
                              fontSize: 13,
                              color: C.ink2,
                              whiteSpace: "nowrap",
                              fontVariantNumeric:
                                typeof row[col] === "number"
                                  ? "tabular-nums"
                                  : "normal",
                            }}
                          >
                            {fmtCell(col, row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* SQL */}
          {result.sql && (
            <Collapsible>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <CollapsibleTrigger
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: C.ink2,
                    fontSize: 12.5,
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    padding: 0,
                  }}
                >
                  <Database size={13} strokeWidth={2} /> View generated SQL
                </CollapsibleTrigger>
                <button
                  type="button"
                  onClick={copySql}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    color: C.ink3,
                    fontSize: 12.5,
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    padding: 0,
                    transition: `color 150ms ${EASE}`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.ink3)}
                >
                  <Copy size={12} strokeWidth={2} /> Copy
                </button>
              </div>
              <CollapsibleContent>
                <pre
                  style={{
                    background: C.ink,
                    color: "#F4EFEA",
                    padding: "14px 16px",
                    borderRadius: R.card,
                    fontSize: 12,
                    lineHeight: 1.55,
                    overflowX: "auto",
                    marginTop: 10,
                  }}
                >
                  <code>{result.sql}</code>
                </pre>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
}
