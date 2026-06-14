import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { appointmentScope } from "@/lib/authz";
import KpiCards from "@/components/dashboard/KpiCards";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const where = appointmentScope(session);

  const [total, completed, noShow, unbilled] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.appointment.count({ where: { ...where, status: "NO_SHOW" } }),
    prisma.appointment.count({
      where: { ...where, status: "COMPLETED", billedCptCode: null },
    }),
  ]);

  const noShowRate = total ? Math.round((noShow / total) * 100) : 0;
  const greetingName = session.user.name ?? session.user.email.split("@")[0];

  const metrics = [
    {
      label: "Total Appointments",
      value: total,
      description: "Across the selected period",
      tone: "good" as const,
    },
    {
      label: "Completed Visits",
      value: completed,
      description: "Seen and closed out",
      tone: "good" as const,
    },
    {
      label: "No-show Rate",
      value: noShowRate,
      suffix: "%",
      description: `${noShow} missed appointments`,
      tone: noShowRate > 15 ? ("warn" as const) : ("good" as const),
    },
    {
      label: "Unbilled Visits",
      value: unbilled,
      description: "Completed with no CPT code",
      tone: "alert" as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero — taupe surface, square, grain, hairline. Eyebrow over a tight
          grotesk headline = the Tennr rhythm. Replaces the green gradient. */}
      <div className="animate-rise relative overflow-hidden rounded-md border border-brand-dk bg-brand p-8">
        <span aria-hidden className="grain-tex opacity-[0.07]" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-brand-muted">
            Good morning
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-surface md:text-3xl">
            Welcome back, {greetingName}
          </h1>
          <p className="mt-1.5 text-sm text-brand-muted/80">
            Here&apos;s what&apos;s happening at {session.user.clinicName}{" "}
            today.
          </p>
        </div>
      </div>
      <button className="btn-layered"></button>
      <KpiCards metrics={metrics} />
    </div>
  );
}
