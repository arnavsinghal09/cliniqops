"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { getGeminiModel } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type CellValue = string | number | boolean | null;
export type QueryRow = Record<string, CellValue>;

export type NlQueryResult = {
  rows: QueryRow[];
  columns: string[];
  suggestedChartType: "bar" | "line" | "table";
  sql: string | null;
  error: string | null;
};

const questionSchema = z.string().min(1).max(500);

const FORBIDDEN = [
  "DROP",
  "DELETE",
  "UPDATE",
  "INSERT",
  "TRUNCATE",
  "ALTER",
  "CREATE",
  "GRANT",
  "REVOKE",
] as const;

function stripFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t
      .replace(/^```(?:sql)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
  }
  return t;
}

export async function runNlQuery(question: string): Promise<NlQueryResult> {
  const empty: NlQueryResult = {
    rows: [],
    columns: [],
    suggestedChartType: "table",
    sql: null,
    error: null,
  };

  // 1. Auth + tenant.
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const clinicId = session.user.clinicId;

  // 2. Validate input.
  const parsed = questionSchema.safeParse(question);
  if (!parsed.success) {
    return { ...empty, error: "Invalid question" };
  }
  const userQuestion = parsed.data;

  // 3. System prompt (clinicId embedded into the hard tenant rule).
  const systemPrompt = `You are a read-only SQL analyst for a healthcare clinic. Convert the user question into a single PostgreSQL SELECT query.
HARD RULES — if any rule would be violated, respond with exactly the word UNSAFE and nothing else:
Rule 1: The query MUST contain the exact substring "clinicId" = '${clinicId}' in a WHERE clause.
Rule 2: The query must start with SELECT (case-insensitive). No CTEs that mutate data.
Rule 3: Never use DROP, DELETE, UPDATE, INSERT, TRUNCATE, ALTER, CREATE, GRANT, REVOKE.
Rule 4: No semicolons except optionally one at the very end.
Rule 5: Only reference these tables: "Appointment", "Patient", "User".
SCHEMA:
"Appointment"(id, clinicId, doctorId, patientId, appointmentDate timestamptz, durationMinutes int, appointmentType text, status text CHECK IN ('SCHEDULED','COMPLETED','CANCELLED','NO_SHOW'), billedCptCode text NULL, billedAmount numeric NULL, createdAt)
"Patient"(id, clinicId, name, dateOfBirth, icd10Codes text[], lastVisitDate, createdAt)
"User"(id, clinicId, email, role text CHECK IN ('ADMIN','DOCTOR','BILLING'), createdAt) — join "Appointment".doctorId = "User".id for doctor names, use "User".email as the display name.
CPT REFERENCE: 99211=0-9min=$24, 99212=10-19min=$46, 99213=20-29min=$77, 99214=30-39min=$110, 99215=40+min=$148.
ICD-10 PATTERNS: diabetes='E11%', hypertension='I10%', asthma='J45%', hyperlipidaemia='E78%' — to match use: EXISTS (SELECT 1 FROM unnest("icd10Codes") c WHERE c LIKE 'E11%')
Return ONLY the raw SQL. No markdown, no backticks, no explanation.`;

  const fewShot: { q: string; sql: string }[] = [
    {
      q: "Which doctor has the worst no-show rate this month?",
      sql: `SELECT u.email AS doctor, ROUND(100.0 * COUNT(*) FILTER (WHERE a.status = 'NO_SHOW') / NULLIF(COUNT(*), 0), 1) AS no_show_rate
FROM "Appointment" a
JOIN "User" u ON a."doctorId" = u.id
WHERE a."clinicId" = '${clinicId}'
  AND a."appointmentDate" >= date_trunc('month', CURRENT_DATE)
GROUP BY u.email
ORDER BY no_show_rate DESC`,
    },
    {
      q: "Show me diabetic patients with no visit in the last 6 months",
      sql: `SELECT name, "lastVisitDate"
FROM "Patient"
WHERE "clinicId" = '${clinicId}'
  AND EXISTS (SELECT 1 FROM unnest("icd10Codes") c WHERE c LIKE 'E11%')
  AND "lastVisitDate" < CURRENT_DATE - INTERVAL '6 months'
ORDER BY "lastVisitDate" ASC`,
    },
    {
      q: "What is our total revenue in the last 7 days?",
      sql: `SELECT COALESCE(SUM("billedAmount"), 0) AS total_revenue
FROM "Appointment"
WHERE "clinicId" = '${clinicId}'
  AND "appointmentDate" >= CURRENT_DATE - INTERVAL '7 days'`,
    },
    {
      q: "What is our cancellation rate by day of week?",
      sql: `SELECT EXTRACT(DOW FROM "appointmentDate") AS day_of_week, ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'CANCELLED') / NULLIF(COUNT(*), 0), 1) AS cancellation_rate
FROM "Appointment"
WHERE "clinicId" = '${clinicId}'
GROUP BY day_of_week
ORDER BY day_of_week`,
    },
    {
      q: "Which appointment types are most commonly unbilled?",
      sql: `SELECT "appointmentType", COUNT(*) AS unbilled_count
FROM "Appointment"
WHERE "clinicId" = '${clinicId}'
  AND "billedCptCode" IS NULL
GROUP BY "appointmentType"
ORDER BY unbilled_count DESC`,
    },
    {
      q: "What is the average appointment duration per doctor?",
      sql: `SELECT u.email AS doctor, ROUND(AVG(a."durationMinutes"), 1) AS avg_duration_minutes
FROM "Appointment" a
JOIN "User" u ON a."doctorId" = u.id
WHERE a."clinicId" = '${clinicId}'
GROUP BY u.email
ORDER BY avg_duration_minutes DESC`,
    },
    {
      q: "How do no-shows this month compare to last month?",
      sql: `SELECT to_char(date_trunc('month', "appointmentDate"), 'YYYY-MM') AS month, COUNT(*) AS no_shows
FROM "Appointment"
WHERE "clinicId" = '${clinicId}'
  AND status = 'NO_SHOW'
  AND "appointmentDate" >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
GROUP BY month
ORDER BY month`,
    },
    {
      q: "Which patients haven't visited in over 90 days?",
      sql: `SELECT name, "lastVisitDate"
FROM "Patient"
WHERE "clinicId" = '${clinicId}'
  AND "lastVisitDate" < CURRENT_DATE - INTERVAL '90 days'
ORDER BY "lastVisitDate" ASC`,
    },
  ];

  const contents = [
    ...fewShot.flatMap((ex) => [
      { role: "user", parts: [{ text: ex.q }] },
      { role: "model", parts: [{ text: ex.sql }] },
    ]),
    { role: "user", parts: [{ text: userQuestion }] },
  ];

  // 4. Call Gemini.
  let raw: string;
  try {
    const model = getGeminiModel();
    const result = await model.generateContent({
      systemInstruction: systemPrompt,
      contents,
    });
    raw = result.response.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      /429|quota|rate.?limit|resource_exhausted|too many requests/i.test(msg)
    ) {
      return {
        ...empty,
        error:
          "Rate limit reached on the Gemini free tier (5 requests/minute). Wait about a minute, then try again.",
      };
    }
    return { ...empty, error: "Couldn't generate a query — please try again." };
  }

  // 5. UNSAFE gate.
  const sql = stripFences(raw);
  if (sql.toUpperCase() === "UNSAFE") {
    return { ...empty, error: "This question can't be answered safely" };
  }

  // 6. Safety validation. Word boundaries so "createdAt" doesn't trip "CREATE".
  const startsWithSelect = /^SELECT/i.test(sql);
  const containsClinicId = sql.includes(`'${clinicId}'`);
  const hasForbidden = FORBIDDEN.some((kw) =>
    new RegExp(`\\b${kw}\\b`, "i").test(sql),
  );
  if (!startsWithSelect || !containsClinicId || hasForbidden) {
    return { ...empty, error: "Generated query failed safety validation" };
  }

  // 7. Execute via the read-only RPC.
  const { data, error } = await supabaseAdmin.rpc("execute_readonly_query", {
    query: sql,
  });
  if (error) {
    return { ...empty, sql, error: error.message };
  }

  // 8. Shape rows/columns.
  const rows: QueryRow[] = Array.isArray(data) ? (data as QueryRow[]) : [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  // 9. Suggested chart type — inspect ONLY the GROUP BY clause for temporal grouping.
  const lower = sql.toLowerCase();
  const hasGroupBy = /\bgroup\s+by\b/.test(lower);
  const groupByMatch = lower.match(
    /\bgroup\s+by\b([\s\S]*?)(?:\border\s+by\b|\blimit\b|\bhaving\b|$)/,
  );
  const groupByClause = groupByMatch ? groupByMatch[1] : "";
  const temporalGroup =
    /extract\s*\(\s*(dow|month|year|day|week|quarter)/.test(groupByClause) ||
    /date_trunc|to_char/.test(groupByClause) ||
    /\b(month|day_of_week|dow|weekday|week|date|period|quarter|year)\b/.test(
      groupByClause,
    );

  let suggestedChartType: "bar" | "line" | "table";
  if (hasGroupBy && temporalGroup) suggestedChartType = "line";
  else if (hasGroupBy) suggestedChartType = "bar";
  else suggestedChartType = "table";

  return { rows, columns, suggestedChartType, sql, error: null };
}
