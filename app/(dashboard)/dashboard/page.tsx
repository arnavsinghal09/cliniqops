import { redirect } from "next/navigation";
import { subDays } from "date-fns";
import { auth } from "@/auth";
import {
  getNoShowRateByDoctor,
  getRevenueByAppointmentType,
  getCancellationRateByWeekday,
  getAvgDurationByDoctor,
  getUnbilledVisitsByDoctor,
  getDashboardSummary,
} from "@/lib/queries/kpi";
import MetricCard from "@/components/MetricCard";
import NoShowRateChart from "@/components/charts/NoShowRateChart";
import RevenueByTypeChart from "@/components/charts/RevenueByTypeChart";
import CancellationChart from "@/components/charts/CancellationChart";
import AvgDurationChart from "@/components/charts/AvgDurationChart";
import UnbilledVisitsChart from "@/components/charts/UnbilledVisitsChart";
import { TrendingUp, UserX, AlertCircle, Calendar } from "lucide-react";

type SearchParams = Promise<{ start?: string; end?: string }>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const { clinicId } = session.user;

  const sp = await searchParams;
  const endDate = sp.end ? new Date(sp.end) : new Date();
  const startDate = sp.start ? new Date(sp.start) : subDays(new Date(), 90);

  const params = { clinicId, startDate, endDate };

  // All six queries in parallel.
  const [noShow, revenue, cancellation, avgDuration, unbilled, summary] =
    await Promise.all([
      getNoShowRateByDoctor(params),
      getRevenueByAppointmentType(params),
      getCancellationRateByWeekday(params),
      getAvgDurationByDoctor(params),
      getUnbilledVisitsByDoctor(params),
      getDashboardSummary(params),
    ]);

  const worstDoctor = noShow[0];

  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="relative flex items-center justify-between overflow-hidden rounded-md border border-brand-dk bg-brand p-8">
        <span aria-hidden className="grain-tex opacity-[0.07]" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-brand-muted">
            Clinic Overview
          </p>
          <h2 className="mt-1 font-display text-3xl font-bold tracking-tight text-surface">
            ₹{summary.totalRevenue.toLocaleString("en-IN")} generated this
            period.
          </h2>
          <p className="mt-2 text-sm text-brand-muted/80">
            {summary.totalAppointments} appointments ·{" "}
            {summary.overallNoShowRate.toFixed(1)}% no-show rate · ₹
            {summary.unbilledTotal.toLocaleString("en-IN")} unbilled
          </p>
          {worstDoctor && (
            <p className="mt-1 text-xs text-brand-muted/70">
              Highest no-show: {worstDoctor.doctorName} at{" "}
              {worstDoctor.noShowRate.toFixed(1)}%
            </p>
          )}
        </div>

        <div className="relative flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full bg-surface/10">
          <span className="font-display text-4xl font-bold text-surface">
            {summary.overallNoShowRate.toFixed(0)}%
          </span>
          <span className="text-xs text-brand-muted/70">no-shows</span>
        </div>
      </div>

      <form
        method="GET"
        className="flex flex-wrap items-center gap-4 rounded-md border border-line bg-surface px-4 py-3 shadow-card"
      >
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <span className="text-[11px] font-semibold uppercase tracking-eyebrow text-ink-3">
            From
          </span>
          <input
            type="date"
            name="start"
            defaultValue={startStr}
            className="rounded-sm border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <span className="text-[11px] font-semibold uppercase tracking-eyebrow text-ink-3">
            To
          </span>
          <input
            type="date"
            name="end"
            defaultValue={endStr}
            className="rounded-sm border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </label>
        <button type="submit" className="btn-layered">
          Apply
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          eyebrow="Total Revenue"
          value={`₹${summary.totalRevenue.toLocaleString("en-IN")}`}
          accentColor="green"
          icon={<TrendingUp size={20} />}
        />
        <MetricCard
          eyebrow="No-show Rate"
          value={`${summary.overallNoShowRate.toFixed(1)}%`}
          accentColor="red"
          icon={<UserX size={20} />}
        />
        <MetricCard
          eyebrow="Unbilled Visits"
          value={`${summary.unbilledTotal} visits`}
          description={`~₹${(summary.unbilledTotal * 75).toLocaleString("en-IN")} lost`}
          accentColor="amber"
          icon={<AlertCircle size={20} />}
        />
        <MetricCard
          eyebrow="Total Appointments"
          value={`${summary.totalAppointments}`}
          accentColor="green"
          icon={<Calendar size={20} />}
        />
      </div>

      {/* ── D) CHARTS GRID ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="No-Show Rate by Doctor"
          subtitle="Selected range — threshold at 15%"
        >
          <NoShowRateChart data={noShow} />
        </ChartCard>
        <ChartCard
          title="Revenue by Appointment Type"
          subtitle="Completed appointments only"
        >
          <RevenueByTypeChart data={revenue} />
        </ChartCard>
        <ChartCard
          title="Cancellation Rate by Day of Week"
          subtitle="Which days have the most cancellations"
        >
          <CancellationChart data={cancellation} />
        </ChartCard>
        <ChartCard
          title="Average Appointment Duration"
          subtitle="By doctor, completed visits"
        >
          <AvgDurationChart data={avgDuration} />
        </ChartCard>
        <div className="lg:col-span-2">
          <ChartCard
            title="Unbilled Visits by Doctor"
            subtitle="Completed appointments missing a CPT code — estimated at ₹75/visit"
          >
            <UnbilledVisitsChart data={unbilled} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-md border border-line bg-surface p-6 shadow-card">
      <span aria-hidden className="grain-tex" />
      <div className="relative">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mb-4 mt-0.5 text-xs text-ink-3">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
