"use client";

import { useState, useTransition } from "react";
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
} from "recharts";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import LayeredCard from "@/components/ui-kit/LayeredCard";
import DrawBorder from "@/components/ui-kit/DrawBorder";
import { runNlQuery, type NlQueryResult } from "./actions";

// Six suggestion chips. Clicking one fills the box AND fires the query immediately.
const SUGGESTIONS = [
  "Which doctor has the worst no-show rate this month?",
  "Show me diabetic patients with no visit in 6 months",
  "What is our total revenue this week?",
  "Which appointment types are most commonly unbilled?",
  "What is our cancellation rate by day of week?",
  "Which patients are overdue for a follow-up?",
];

// Shared tooltip styling (Recharts contentStyle expects a plain style object).
const TOOLTIP_STYLE: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-card)",
  color: "var(--color-ink)",
  fontSize: 12,
};

export function NLQueryInterface() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<NlQueryResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Single entry point used by both the submit button and the suggestion chips.
  function runQuery(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setText(q);
    startTransition(async () => {
      const r = await runNlQuery(trimmed);
      setResult(r);
    });
  }

  // Derive category (first non-numeric) and value (first numeric) columns from row 1.
  const firstRow = result?.rows?.[0] ?? null;
  const categoryKey =
    firstRow && result
      ? result.columns.find((c) => typeof firstRow[c] !== "number")
      : undefined;
  const valueKey =
    firstRow && result
      ? result.columns.find((c) => typeof firstRow[c] === "number")
      : undefined;

  const canChart =
    !!result &&
    !result.error &&
    result.rows.length > 0 &&
    !!categoryKey &&
    !!valueKey;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Interactive-state styling (hover/focus/keyframes) that inline styles can't express. */}
      <style>{`
        .nlq-textarea {
          width: 100%;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-ctrl);
          padding: 12px;
          background: var(--color-surface);
          color: var(--color-ink);
          font-size: 14px;
          line-height: 1.4;
          resize: vertical;
          outline: none;
          transition: box-shadow var(--dur-base) var(--ease-out);
        }
        .nlq-textarea::placeholder { color: var(--color-ink-3); }
        .nlq-textarea:focus { box-shadow: 0 0 0 2px var(--color-accent); }

        .nlq-submit {
          align-self: flex-start;
          background: var(--color-accent);
          color: var(--color-surface);
          border: none;
          border-radius: var(--radius-ctrl);
          padding: 10px 20px;
          font-size: 14px;
          cursor: pointer;
          transition: background var(--dur-base) var(--ease-out);
        }
        .nlq-submit:hover:not(:disabled) { background: var(--color-accent-dk); }
        .nlq-submit:disabled { cursor: default; }

        .nlq-pulse { animation: nlq-pulse 1.2s ease-in-out infinite; }
        @keyframes nlq-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .nlq-pulse { animation: none; opacity: 1; }
        }

        .nlq-chip {
          background: var(--color-accent-mut);
          color: var(--color-accent-dk);
          border: none;
          border-radius: var(--radius-badge);
          padding: 4px 12px;
          font-size: 12px;
          cursor: pointer;
          transition: background var(--dur-base) var(--ease-out);
        }
        .nlq-chip:hover:not(:disabled) { background: var(--color-border-2); }
        .nlq-chip:disabled { cursor: default; opacity: 0.6; }

        .nlq-table { width: 100%; border-collapse: collapse; }
        .nlq-table th {
          background: var(--color-accent-mut);
          color: var(--color-accent-dk);
          padding: 8px;
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: var(--track-eyebrow);
        }
        .nlq-table td {
          border-bottom: 1px solid var(--color-border);
          padding: 8px;
          font-size: 13px;
          color: var(--color-ink-2);
        }
      `}</style>

      {/* Input box */}
      <textarea
        className="nlq-textarea"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask anything about your clinic… e.g. which doctor has the worst no-show rate this month?"
      />

      {/* Submit */}
      <button
        type="button"
        className="nlq-submit"
        disabled={isPending}
        onClick={() => runQuery(text)}
      >
        {isPending ? <span className="nlq-pulse">Thinking…</span> : "Run query"}
      </button>

      {/* Suggestion chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="nlq-chip"
            disabled={isPending}
            onClick={() => runQuery(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Results */}
      {result && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginTop: 8,
          }}
        >
          {/* Error state */}
          {result.error ? (
            <LayeredCard>
              <div
                style={{
                  borderLeft: "3px solid var(--color-danger)",
                  paddingLeft: 12,
                  color: "var(--color-danger)",
                  fontSize: 14,
                }}
              >
                {result.error}
              </div>
            </LayeredCard>
          ) : (
            <>
              {/* Bar chart */}
              {result.suggestedChartType === "bar" && canChart && (
                <DrawBorder>
                  <LayeredCard>
                    <div style={{ padding: 12 }}>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={result.rows}>
                          <CartesianGrid
                            stroke="var(--color-border)"
                            strokeDasharray="3 3"
                          />
                          <XAxis
                            dataKey={categoryKey}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "var(--color-ink-3)", fontSize: 11 }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "var(--color-ink-3)", fontSize: 11 }}
                          />
                          <Tooltip
                            contentStyle={TOOLTIP_STYLE}
                            cursor={false}
                          />
                          <Bar
                            dataKey={valueKey!}
                            fill="var(--color-accent)"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </LayeredCard>
                </DrawBorder>
              )}

              {/* Line chart */}
              {result.suggestedChartType === "line" && canChart && (
                <DrawBorder>
                  <LayeredCard>
                    <div style={{ padding: 12 }}>
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={result.rows}>
                          <CartesianGrid
                            stroke="var(--color-border)"
                            strokeDasharray="3 3"
                          />
                          <XAxis
                            dataKey={categoryKey}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "var(--color-ink-3)", fontSize: 11 }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "var(--color-ink-3)", fontSize: 11 }}
                          />
                          <Tooltip
                            contentStyle={TOOLTIP_STYLE}
                            cursor={false}
                          />
                          <Line
                            type="monotone"
                            dataKey={valueKey!}
                            stroke="var(--color-accent)"
                            strokeWidth={2}
                            dot={{ fill: "var(--color-accent)" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </LayeredCard>
                </DrawBorder>
              )}

              {/* Always-on data table */}
              <LayeredCard>
                <div style={{ overflowX: "auto" }}>
                  {result.rows.length === 0 ? (
                    <div
                      style={{
                        padding: 12,
                        fontSize: 13,
                        color: "var(--color-ink-3)",
                      }}
                    >
                      No rows returned.
                    </div>
                  ) : (
                    <table className="nlq-table">
                      <thead>
                        <tr>
                          {result.columns.map((c) => (
                            <th key={c}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row, i) => (
                          <tr key={i}>
                            {result.columns.map((c) => (
                              <td key={c}>{String(row[c] ?? "")}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </LayeredCard>
            </>
          )}

          {/* Generated SQL (collapsible) */}
          {result.sql && (
            <Collapsible>
              <CollapsibleTrigger
                style={{
                  color: "var(--color-ink-3)",
                  fontSize: 12,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  textAlign: "left",
                }}
              >
                View generated SQL
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre
                  style={{
                    background: "var(--color-ink)",
                    color: "var(--color-surface)",
                    padding: 12,
                    borderRadius: "var(--radius-card)",
                    fontSize: 12,
                    overflowX: "auto",
                    marginTop: 8,
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
