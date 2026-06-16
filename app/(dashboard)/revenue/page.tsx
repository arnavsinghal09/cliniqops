import { redirect } from "next/navigation";
import { format } from "date-fns";
import { TrendingDown, FileWarning, ShieldAlert } from "lucide-react";
import { auth } from "@/auth";
import SectionLabel from "@/components/ui-kit/SectionLabel";
import LayeredCard from "@/components/ui-kit/LayeredCard";
import DrawBorder from "@/components/ui-kit/DrawBorder";
import MetricCard from "@/components/ui-kit/MetricCard";
import LeakageByDoctorChart from "@/components/charts/LeakageByDoctorChart";
import LeakageTrendChart from "@/components/charts/LeakageTrendChart";
import {
  getLeakageReport,
  getMonthlyLeakageTrend,
} from "@/lib/queries/revenue";

const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await searchParams;
 const end = sp.endDate ? new Date(sp.endDate) : new Date();
 const start = sp.startDate
   ? new Date(sp.startDate)
   : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  const clinicId = session.user.clinicId;
  const [report, trend] = await Promise.all([
    getLeakageReport(clinicId, start, end),
    getMonthlyLeakageTrend(clinicId),
  ]);

  // Leakage increasing if the last 3 months strictly rise.
  const last3 = trend.slice(-3);
  const increasing =
    last3.length === 3 &&
    last3[1].totalLeakage > last3[0].totalLeakage &&
    last3[2].totalLeakage > last3[1].totalLeakage;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionLabel eyebrow="REVENUE INTEGRITY" title="Leakage report" />

      {/* Metric row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        <MetricCard
          eyebrow="Total leakage"
          value={money(report.summary.totalLeakage)}
          description={`${report.summary.affectedDoctors} doctors affected`}
          accentColor="red"
          icon={<TrendingDown size={20} />}
        />
        <MetricCard
          eyebrow="Undercoded visits"
          value={String(report.summary.undercodeCount)}
          description="Billed below documented time"
          accentColor="red"
          icon={<FileWarning size={20} />}
        />
        <MetricCard
          eyebrow="Overcoded visits"
          value={String(report.summary.overcodeCount)}
          description="Compliance risk — billed above time"
          accentColor="amber"
          icon={<ShieldAlert size={20} />}
        />
      </div>

      {/* Charts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
          gap: 16,
        }}
      >
        <DrawBorder>
          <LayeredCard>
            <div style={{ padding: 20 }}>
              <SectionLabel
                eyebrow="BY DOCTOR"
                title="Where leakage concentrates"
                level={3}
              />
              <div style={{ marginTop: 16 }}>
                {report.byDoctor.length > 0 ? (
                  <LeakageByDoctorChart data={report.byDoctor} />
                ) : (
                  <EmptyNote text="No leakage in this period." />
                )}
              </div>
            </div>
          </LayeredCard>
        </DrawBorder>

        <DrawBorder>
          <LayeredCard>
            <div style={{ padding: 20 }}>
              <SectionLabel
                eyebrow="6-MONTH TREND"
                title="Monthly leakage"
                level={3}
              />
              {increasing && (
                <div
                  style={{
                    display: "inline-block",
                    marginTop: 12,
                    background: "var(--color-danger-bg)",
                    color: "var(--color-danger)",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: "var(--radius-badge)",
                  }}
                >
                  Leakage increasing month-over-month
                </div>
              )}
              <div style={{ marginTop: 16 }}>
                <LeakageTrendChart data={trend} />
              </div>
            </div>
          </LayeredCard>
        </DrawBorder>
      </div>

      {/* Flagged appointments table */}
      <LayeredCard>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-ink-2)",
            }}
          >
            {report.appointments.length} flagged{" "}
            {report.appointments.length === 1 ? "appointment" : "appointments"}
          </span>
          <a
            href="/api/revenue/export"
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--color-accent-dk)",
              background: "var(--color-accent-mut)",
              padding: "6px 12px",
              borderRadius: "var(--radius-ctrl)",
              textDecoration: "none",
            }}
          >
            Export CSV
          </a>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  "Date",
                  "Doctor",
                  "Patient",
                  "Duration (min)",
                  "Billed",
                  "Suggested",
                  "Gap (₹)",
                  "Type",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      background: "var(--color-accent-mut)",
                      color: "var(--color-accent-dk)",
                      padding: "10px 14px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "var(--track-eyebrow)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.appointments.map((a, i) => {
                const under = a.leakageType === "UNDERCODE";
                return (
                  <tr
                    key={a.id}
                    style={{
                      background:
                        i % 2 === 1 ? "var(--color-bg)" : "var(--color-surface)",
                    }}
                  >
                    <Td>{format(new Date(a.date), "dd MMM yyyy")}</Td>
                    <Td>{a.doctorName.split("@")[0]}</Td>
                    <Td>{a.patientName}</Td>
                    <Td>{a.durationMinutes}</Td>
                    <Td>{a.billedCode}</Td>
                    <Td>{a.suggestedCode}</Td>
                    <Td>{money(Math.abs(a.leakageAmount))}</Td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          padding: "3px 8px",
                          borderRadius: "var(--radius-badge)",
                          background: under
                            ? "var(--color-danger-bg)"
                            : "var(--color-warning-bg)",
                          color: under
                            ? "var(--color-danger)"
                            : "var(--color-warning)",
                        }}
                      >
                        {a.leakageType}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {report.appointments.length === 0 && (
            <EmptyNote text="No flagged appointments in this period." />
          )}
        </div>
      </LayeredCard>
    </div>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        borderBottom: "1px solid var(--color-border)",
        padding: "10px 14px",
        fontSize: 13,
        color: "var(--color-ink-2)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: "32px 20px",
        textAlign: "center",
        color: "var(--color-ink-3)",
        fontSize: 14,
      }}
    >
      {text}
    </div>
  );
}