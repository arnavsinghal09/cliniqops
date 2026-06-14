"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { getGeminiModel } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Shape returned to the client component for every query attempt.
export type NlQueryResult = {
  rows: any[];
  columns: string[];
  suggestedChartType: "bar" | "line" | "table";
  sql: string | null;
  error: string | null;
};

// Word-boundary regex instead of a naive substring scan.
// A plain includes("CREATE") would FALSE-POSITIVE on the legitimate "createdAt"
// column. \bCREATE\b will not match "createdAt" because the trailing "d" is a
// word character, so we keep DDL/DML blocked without breaking valid SELECTs.
const FORBIDDEN_KEYWORDS =
  /\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)\b/i;

export async function runNlQuery(question: string): Promise<NlQueryResult> {
  // Reusable empty payload for early returns.
  const empty = {
    rows: [] as any[],
    columns: [] as string[],
    suggestedChartType: "table" as const,
    sql: null as string | null,
    error: null as string | null,
  };

  // 1. Auth: derive clinicId from the session, never from the client.
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const clinicId = session.user.clinicId;

  // 2. Validate the raw question.
  const parsed = z.string().min(1).max(500).safeParse(question);
  if (!parsed.success) {
    return { ...empty, error: "Invalid question" };
  }
  const userQuestion = parsed.data;

  // 3. System prompt with the clinicId baked in as a hard constraint.
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

  // 4. Eight few-shot user/model pairs. All mixed-case identifiers are double-quoted
  //    so Postgres does not fold them to lowercase. Each model answer embeds the
  //    real clinicId literal so the model learns to always include it.
  const fewShot = [
    {
      role: "user",
      parts: [{ text: "Which doctor has the worst no-show rate this month?" }],
    },
    {
      role: "model",
      parts: [
        {
          text: `SELECT u.email AS doctor, ROUND(100.0 * COUNT(*) FILTER (WHERE a.status = 'NO_SHOW') / NULLIF(COUNT(*), 0), 1) AS no_show_rate FROM "Appointment" a JOIN "User" u ON a."doctorId" = u.id WHERE a."clinicId" = '${clinicId}' AND date_trunc('month', a."appointmentDate") = date_trunc('month', CURRENT_DATE) GROUP BY u.email ORDER BY no_show_rate DESC`,
        },
      ],
    },
    {
      role: "user",
      parts: [{ text: "Show me diabetic patients with no visit in 6 months" }],
    },
    {
      role: "model",
      parts: [
        {
          text: `SELECT name, "lastVisitDate" FROM "Patient" WHERE "clinicId" = '${clinicId}' AND EXISTS (SELECT 1 FROM unnest("icd10Codes") c WHERE c LIKE 'E11%') AND "lastVisitDate" < CURRENT_DATE - INTERVAL '6 months' ORDER BY "lastVisitDate" ASC`,
        },
      ],
    },
    {
      role: "user",
      parts: [{ text: "What is our total revenue in the last 7 days?" }],
    },
    {
      role: "model",
      parts: [
        {
          text: `SELECT SUM("billedAmount") AS total_revenue FROM "Appointment" WHERE "clinicId" = '${clinicId}' AND "appointmentDate" >= CURRENT_DATE - INTERVAL '7 days'`,
        },
      ],
    },
    {
      role: "user",
      parts: [{ text: "What is our cancellation rate by day of week?" }],
    },
    {
      role: "model",
      parts: [
        {
          text: `SELECT EXTRACT(DOW FROM "appointmentDate") AS day_of_week, ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'CANCELLED') / NULLIF(COUNT(*), 0), 1) AS cancellation_rate FROM "Appointment" WHERE "clinicId" = '${clinicId}' GROUP BY EXTRACT(DOW FROM "appointmentDate") ORDER BY day_of_week`,
        },
      ],
    },
    {
      role: "user",
      parts: [{ text: "Which appointment types are most commonly unbilled?" }],
    },
    {
      role: "model",
      parts: [
        {
          text: `SELECT "appointmentType", COUNT(*) AS unbilled_count FROM "Appointment" WHERE "clinicId" = '${clinicId}' AND "billedCptCode" IS NULL GROUP BY "appointmentType" ORDER BY unbilled_count DESC`,
        },
      ],
    },
    {
      role: "user",
      parts: [{ text: "What is the average appointment duration per doctor?" }],
    },
    {
      role: "model",
      parts: [
        {
          text: `SELECT u.email AS doctor, ROUND(AVG(a."durationMinutes"), 1) AS avg_duration FROM "Appointment" a JOIN "User" u ON a."doctorId" = u.id WHERE a."clinicId" = '${clinicId}' GROUP BY u.email ORDER BY avg_duration DESC`,
        },
      ],
    },
    {
      role: "user",
      parts: [{ text: "How do no-shows this month compare to last month?" }],
    },
    {
      role: "model",
      parts: [
        {
          text: `SELECT date_trunc('month', "appointmentDate") AS month, COUNT(*) FILTER (WHERE status = 'NO_SHOW') AS no_shows FROM "Appointment" WHERE "clinicId" = '${clinicId}' AND "appointmentDate" >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' GROUP BY date_trunc('month', "appointmentDate") ORDER BY month`,
        },
      ],
    },
    {
      role: "user",
      parts: [{ text: "Which patients have not visited in over 90 days?" }],
    },
    {
      role: "model",
      parts: [
        {
          text: `SELECT name, "lastVisitDate" FROM "Patient" WHERE "clinicId" = '${clinicId}' AND "lastVisitDate" < CURRENT_DATE - INTERVAL '90 days' ORDER BY "lastVisitDate" ASC`,
        },
      ],
    },
  ];

  // Ask Gemini, appending the real question as the final user turn.
  let raw: string;
  try {
    const model = getGeminiModel();
    const response = await model.generateContent({
      systemInstruction: systemPrompt,
      contents: [...fewShot, { role: "user", parts: [{ text: userQuestion }] }],
    });
    raw = response.response.text().trim();
  } catch {
    return { ...empty, error: "Failed to generate a query. Please try again." };
  }

  // Defensive: strip markdown fences if the model ignored the "no backticks" rule.
  let sql = raw;
  if (sql.startsWith("```")) {
    sql = sql.replace(/^```(?:sql)?/i, "").replace(/```$/, "").trim();
  }

  // 5. Explicit refusal short-circuit.
  if (sql.toUpperCase() === "UNSAFE") {
    return { ...empty, error: "This question can't be answered safely" };
  }

  // 6. Belt-and-braces validation in our own code (do not trust the model).
  const upper = sql.toUpperCase();
  const startsWithSelect = upper.startsWith("SELECT");
  const hasClinicScope = sql.includes(`"clinicId" = '${clinicId}'`);
  const hasForbidden = FORBIDDEN_KEYWORDS.test(sql);

  if (!startsWithSelect || !hasClinicScope || hasForbidden) {
    return { ...empty, sql, error: "Generated query failed safety validation" };
  }

  // 7. Execute via the read-only RPC.
  const { data, error } = await supabaseAdmin.rpc("execute_readonly_query", {
    query: sql,
  });
  if (error) {
    return { ...empty, sql, error: error.message };
  }

  // 8. Normalise rows + derive column names from the first row.
  const rows = (data as any[]) ?? [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  // 9. Chart-type heuristic. Note: "appointmentDate" already contains "DATE",
  //    so any time-grouped query naturally routes to a line chart.
  let suggestedChartType: "bar" | "line" | "table" = "table";
  if (upper.includes("GROUP BY")) {
    if (
      upper.includes("DATE") ||
      upper.includes("DOW") ||
      upper.includes("DATE_TRUNC")
    ) {
      suggestedChartType = "line";
    } else {
      suggestedChartType = "bar";
    }
  }

  // 10. Success.
  return { rows, columns, suggestedChartType, sql, error: null };
}