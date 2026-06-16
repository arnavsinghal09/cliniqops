import { auth } from "@/auth";
import { getLeakageReport } from "@/lib/queries/revenue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);

  const escape = (val: unknown): string => {
    const s =
      val === null || val === undefined
        ? ""
        : typeof val === "object"
          ? JSON.stringify(val)
          : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const headerLine = headers.map(escape).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => escape(row[h])).join(","),
  );

  return [headerLine, ...dataLines].join("\n");
}

export async function GET() {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const today = new Date();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const report = await getLeakageReport(
    session.user.clinicId,
    ninetyDaysAgo,
    today,
  );

  const csv = jsonToCsv(
    report.appointments as unknown as Record<string, unknown>[],
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="leakage-report.csv"',
    },
  });
}
