import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SectionLabel from "@/components/ui-kit/SectionLabel";
import LayeredCard from "@/components/ui-kit/LayeredCard";
import {
  getAlertsForClinic,
  getWeeklyTrendForMetric,
} from "@/lib/queries/alerts";
import AlertsList, { type AlertRow } from "./AlertsList";

export default async function AlertsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const clinicId = session.user.clinicId;
  const alerts = await getAlertsForClinic(clinicId);
  const trends = await Promise.all(
    alerts.map((a) => getWeeklyTrendForMetric(clinicId, a.metric)),
  );

  // Map to a fully serializable shape (Dates → ISO strings) for the client list.
  const rows: AlertRow[] = alerts.map((a, i) => ({
    id: a.id,
    metric: a.metric,
    currentValue: a.currentValue,
    baselineValue: a.baselineValue,
    deviationPercent: a.deviationPercent,
    severity: a.severity,
    weekOf: a.weekOf.toISOString(),
    isRead: a.isRead,
    mlDetected: a.mlDetected,
    trend: trends[i],
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionLabel eyebrow="ANOMALY FEED" title="Alerts & insights" />

      {rows.length === 0 ? (
        <LayeredCard>
          <div
            style={{
              padding: "44px 20px",
              textAlign: "center",
              color: "#8A827A",
              fontSize: 14,
            }}
          >
            No anomalies detected. Everything&apos;s within normal range.
          </div>
        </LayeredCard>
      ) : (
        <div data-tour="alerts-list">
          <AlertsList alerts={rows} />
        </div>
      )}
    </div>
  );
}
