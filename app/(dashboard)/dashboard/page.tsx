import Link from "next/link";
import { redirect } from "next/navigation";
import { subDays } from "date-fns";
import { auth } from "@/auth";
import { getScope } from "@/lib/queries/scope";
import {
  getNoShowRateByDoctor,
  getRevenueByAppointmentType,
  getCancellationRateByWeekday,
  getAvgDurationByDoctor,
  getUnbilledVisitsByDoctor,
  getDashboardSummary,
} from "@/lib/queries/kpi";
import { countRedOverduePatients } from "@/lib/queries/patients";
import { getLeakageReport } from "@/lib/queries/revenue";
import MetricCard from "@/components/ui-kit/MetricCard";
import SectionLabel from "@/components/ui-kit/SectionLabel";
import LayeredCard from "@/components/ui-kit/LayeredCard";
import CountUp from "@/components/ui-kit/CountUp";
import DrawBorder from "@/components/ui-kit/DrawBorder";
import NoShowRateChart from "@/components/charts/NoShowRateChart";
import RevenueByTypeChart from "@/components/charts/RevenueByTypeChart";
import CancellationChart from "@/components/charts/CancellationChart";
import AvgDurationChart from "@/components/charts/AvgDurationChart";
import UnbilledVisitsChart from "@/components/charts/UnbilledVisitsChart";
import { TrendingUp, UserX, AlertCircle, Calendar } from "lucide-react";
import EmptyState from "./EmptyState";
import prisma from "@/lib/prisma";

type SearchParams = Promise<{ start?: string; end?: string; fresh?: string }>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  
  const appointmentCount = await prisma.appointment.count({
    where: { clinicId: session.user.clinicId },
  });
  if (appointmentCount === 0) {
    return <EmptyState />;
  }
  
  const scope = getScope(session);
  const { clinicId } = session.user;

  const sp = await searchParams;
  const isFresh = sp.fresh === "true";
  const endDate = sp.end ? new Date(sp.end) : new Date();
  const startDate = sp.start ? new Date(sp.start) : subDays(new Date(), 90);

  // Use `scope` instead of `clinicId` for updated KPI queries
  const params = { scope, startDate, endDate };

  const [
    noShow,
    revenue,
    cancellation,
    avgDuration,
    unbilled,
    summary,
    redOverdue,
    leakage,
  ] = await Promise.all([
    getNoShowRateByDoctor(params),
    getRevenueByAppointmentType(params),
    getCancellationRateByWeekday(params),
    getAvgDurationByDoctor(params),
    getUnbilledVisitsByDoctor(params),
    getDashboardSummary(params),
    countRedOverduePatients(scope), // Updated to use scope
    getLeakageReport(clinicId, subDays(new Date(), 30), new Date()),
  ]);

  const worstDoctor = noShow[0];
  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  // Overdue card tone: danger >10, warning >0, ok at 0.
  const overdueBorder =
    redOverdue > 10
      ? "border-l-danger"
      : redOverdue > 0
        ? "border-l-warning"
        : "border-l-ok";

  return (
    <div className="space-y-6">
      {isFresh && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#ECF0EA",
            border: "1px solid #4E6B4F",
            borderRadius: 6,
            padding: "14px 18px",
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 20 }}>✓</span>
          <div>
            <p
              style={{
                fontSize: 14.5,
                fontWeight: 600,
                color: "#1A1714",
                margin: 0,
              }}
            >
              Data loaded — here&apos;s your clinic at a glance
            </p>
            <p style={{ fontSize: 13, color: "#4A453F", margin: "2px 0 0" }}>
              Your appointments, revenue, and alerts are now live below.
            </p>
          </div>
        </div>
      )}
      {/* Hero banner */}
      <div data-tour="revenue-banner" className="relative flex items-center justify-between overflow-hidden rounded-md border border-brand-dk bg-brand p-8">
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

      {/* Overdue follow-up card — full width, links to pre-filtered Patients. */}
      <Link
        href="/patients?status=RED"
        className="block outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-md"
      >
        <LayeredCard
          className={`p-6 border-l-[3px] ${overdueBorder} transition-transform duration-200 hover:-translate-y-0.5`}
        >
          <SectionLabel eyebrow="Follow-ups" title="" level={3} />
          <p className="font-display text-[32px] font-bold leading-none tracking-tight text-ink">
            <CountUp value={redOverdue} />
          </p>
          <p className="mt-1 text-[13px] text-ink-3">
            patients overdue for follow-up
          </p>
        </LayeredCard>
      </Link>

      {/* Date filter */}
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

      {/* Revenue leakage card — full width, above metric grid. */}
      <div data-tour="leakage-card">
      <DrawBorder>
        <LayeredCard className="p-6 border-l-4 border-l-danger">
          <SectionLabel
            eyebrow="REVENUE LEAKAGE"
            title="Potential monthly loss"
            level={3}
          />
          <p className="mt-2 font-display text-[36px] font-bold leading-none tracking-tight text-danger">
            ₹{leakage.summary.totalLeakage.toLocaleString("en-IN")}
          </p>
          <p className="mt-1.5 text-[13px] text-ink-3">
            from {leakage.summary.undercodeCount} undercoded visits this month
          </p>
        </LayeredCard>
      </DrawBorder>
      </div>

      {/* Metric cards */}
      <div data-tour="metric-cards" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Charts grid */}
      <div data-tour="charts-grid" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
