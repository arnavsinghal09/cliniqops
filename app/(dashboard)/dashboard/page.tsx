import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { appointmentScope } from "@/lib/authz";
import KpiCards from "@/components/dashboard/KpiCards";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Doctors see their own numbers; admins see the whole clinic. Same helper
  // that scopes the Patients page — one source of truth for "what can I see".
  const where = appointmentScope(session);

  // Promise.all runs these counts in PARALLEL — note the contrast with the
  // upload route's slow sequential loop. Four round-trips, fired at once.
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
      {/* Hero — entrance via the CSS .animate-rise class, so this stays a
          server component (no framer/client needed for the banner). */}
      <div
        className="animate-rise rounded-card p-8 shadow-hero"
        style={{
          background:
            "linear-gradient(135deg, var(--color-brand), var(--color-brand-grad-to))",
        }}
      >
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-light">
          Good morning
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-white md:text-3xl">
          Welcome back, {greetingName}
        </h1>
        <p className="mt-1 text-sm text-white/70">
          Here&apos;s what&apos;s happening at {session.user.clinicName} today.
        </p>
      </div>

      <KpiCards metrics={metrics} />
    </div>
  );
}
