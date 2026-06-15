import { Resend } from "resend";

type DigestAlert = {
  metric: string;
  currentValue: number;
  baselineValue: number;
  deviationPercent: number;
  severity: string;
};

function prettyMetric(m: string): string {
  return m
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function fmtValue(metric: string, v: number): string {
  if (/rate/i.test(metric)) return `${(v * 100).toFixed(1)}%`;
  if (/revenue/i.test(metric))
    return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function fmtDev(d: number): string {
  return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;
}

function severityCellStyle(severity: string): string {
  if (severity === "HIGH") return "background:#F7ECEA;color:#B4423A;";
  if (severity === "MEDIUM") return "background:#F7F0E4;color:#B07A2E;";
  return "background:#EDE6DF;color:#4A453F;"; // LOW / fallback
}

export async function sendAnomalyDigest(
  toEmail: string,
  clinicName: string,
  alerts: DigestAlert[],
) {
  const rows = alerts
    .map((a) => {
      const sev = severityCellStyle(a.severity);
      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #E3DDD3;color:#4A453F;font-size:13px;">${prettyMetric(
            a.metric,
          )}</td>
          <td style="padding:8px;border-bottom:1px solid #E3DDD3;color:#1A1714;font-size:13px;text-align:right;">${fmtValue(
            a.metric,
            a.currentValue,
          )}</td>
          <td style="padding:8px;border-bottom:1px solid #E3DDD3;color:#8A827A;font-size:13px;text-align:right;">${fmtValue(
            a.metric,
            a.baselineValue,
          )}</td>
          <td style="padding:8px;border-bottom:1px solid #E3DDD3;color:#1A1714;font-size:13px;text-align:right;font-weight:600;">${fmtDev(
            a.deviationPercent,
          )}</td>
          <td style="padding:8px;border-bottom:1px solid #E3DDD3;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;text-align:center;${sev}">${
            a.severity
          }</td>
        </tr>`;
    })
    .join("");

  const html = `
  <body style="margin:0;padding:24px;background:#F4F1EB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#FBFAF7;border:1px solid #E3DDD3;border-radius:6px;padding:24px;">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#8A827A;margin:0 0 8px;">Weekly Anomaly Digest</p>
      <h1 style="font-size:20px;font-weight:600;color:#1A1714;margin:0 0 16px;">${clinicName}</h1>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#8A827A;border-bottom:1px solid #E3DDD3;">Metric</th>
            <th style="padding:8px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#8A827A;border-bottom:1px solid #E3DDD3;">This Week</th>
            <th style="padding:8px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#8A827A;border-bottom:1px solid #E3DDD3;">Baseline</th>
            <th style="padding:8px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#8A827A;border-bottom:1px solid #E3DDD3;">Deviation</th>
            <th style="padding:8px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#8A827A;border-bottom:1px solid #E3DDD3;">Severity</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#8A827A;font-size:12px;margin-top:16px;">View details in CliniqOps</p>
    </div>
  </body>`;

  try {
    return await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: "CliniqOps Alerts <alerts@resend.dev>",
      to: toEmail,
      subject: `⚠ ${clinicName} — ${alerts.length} anomalies detected`,
      html,
    });
  } catch (e) {
    // Don't let one failed send abort the whole cron run.
    console.error(`[anomaly-digest] failed to email ${toEmail}:`, e);
    return null;
  }
}
