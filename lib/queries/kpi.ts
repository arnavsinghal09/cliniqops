import prisma from "@/lib/prisma";
import { AppointmentStatus } from "@/lib/generated/prisma/enums";

type KpiParams = { clinicId: string; startDate: Date; endDate: Date };

function nameFromEmail(email: string): string {
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

// ── Function 1 ────────────────────────────────────────────────────────────
// No-show rate per doctor. Prisma groupBy across the doctor relation is
// awkward, so we fetch with the doctor's email included and group in JS.
export async function getNoShowRateByDoctor({
  clinicId,
  startDate,
  endDate,
}: KpiParams) {
  const appts = await prisma.appointment.findMany({
    where: { clinicId, appointmentDate: { gte: startDate, lte: endDate } },
    include: { doctor: { select: { email: true } } },
  });

  // Map keyed by doctor email → running totals.
  const byDoctor = new Map<string, { total: number; noShows: number }>();
  for (const a of appts) {
    const key = a.doctor.email;
    const entry = byDoctor.get(key) ?? { total: 0, noShows: 0 };
    entry.total += 1;
    if (a.status === AppointmentStatus.NO_SHOW) entry.noShows += 1;
    byDoctor.set(key, entry);
  }

  return Array.from(byDoctor.entries())
    .map(([email, { total, noShows }]) => ({
      doctorName: nameFromEmail(email),
      total,
      noShows,
      noShowRate: total > 0 ? (noShows / total) * 100 : 0,
    }))
    .sort((a, b) => b.noShowRate - a.noShowRate);
}

// ── Function 2 ────────────────────────────────────────────────────────────
// Revenue grouped by appointmentType, COMPLETED with a billed amount only.
export async function getRevenueByAppointmentType({
  clinicId,
  startDate,
  endDate,
}: KpiParams) {
  const appts = await prisma.appointment.findMany({
    where: {
      clinicId,
      appointmentDate: { gte: startDate, lte: endDate },
      status: AppointmentStatus.COMPLETED,
      billedAmount: { not: null },
    },
    select: { appointmentType: true, billedAmount: true },
  });

  const byType = new Map<string, { totalRevenue: number; count: number }>();
  for (const a of appts) {
    const entry = byType.get(a.appointmentType) ?? {
      totalRevenue: 0,
      count: 0,
    };
    // billedAmount is Prisma Decimal | null — guarded by the where clause, but
    // we still coerce defensively with Number().
    entry.totalRevenue += a.billedAmount ? Number(a.billedAmount) : 0;
    entry.count += 1;
    byType.set(a.appointmentType, entry);
  }

  return Array.from(byType.entries())
    .map(([type, { totalRevenue, count }]) => ({ type, totalRevenue, count }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// ── Function 3 ────────────────────────────────────────────────────────────
// Cancellation rate per weekday, returned Mon→Sun.
export async function getCancellationRateByWeekday({
  clinicId,
  startDate,
  endDate,
}: KpiParams) {
  const appts = await prisma.appointment.findMany({
    where: { clinicId, appointmentDate: { gte: startDate, lte: endDate } },
    select: { appointmentDate: true, status: true },
  });

  // getDay(): 0=Sun … 6=Sat. We tally per index then emit in Mon-first order.
  const totals = new Array(7).fill(0) as number[];
  const cancels = new Array(7).fill(0) as number[];
  for (const a of appts) {
    const d = new Date(a.appointmentDate).getDay();
    totals[d] += 1;
    if (a.status === AppointmentStatus.CANCELLED) cancels[d] += 1;
  }

  // Output order Mon(1)…Sat(6) then Sun(0).
  const order: { idx: number; day: string }[] = [
    { idx: 1, day: "Mon" },
    { idx: 2, day: "Tue" },
    { idx: 3, day: "Wed" },
    { idx: 4, day: "Thu" },
    { idx: 5, day: "Fri" },
    { idx: 6, day: "Sat" },
    { idx: 0, day: "Sun" },
  ];

  return order.map(({ idx, day }) => ({
    day,
    total: totals[idx],
    cancellationRate: totals[idx] > 0 ? (cancels[idx] / totals[idx]) * 100 : 0,
  }));
}

// ── Function 4 ────────────────────────────────────────────────────────────
// Average appointment duration per doctor, COMPLETED only.
export async function getAvgDurationByDoctor({
  clinicId,
  startDate,
  endDate,
}: KpiParams) {
  const appts = await prisma.appointment.findMany({
    where: {
      clinicId,
      appointmentDate: { gte: startDate, lte: endDate },
      status: AppointmentStatus.COMPLETED,
    },
    include: { doctor: { select: { email: true } } },
  });

  const byDoctor = new Map<string, { sum: number; count: number }>();
  for (const a of appts) {
    const key = a.doctor.email;
    const entry = byDoctor.get(key) ?? { sum: 0, count: 0 };
    entry.sum += a.durationMinutes;
    entry.count += 1;
    byDoctor.set(key, entry);
  }

  return Array.from(byDoctor.entries())
    .map(([email, { sum, count }]) => ({
      doctorName: nameFromEmail(email),
      avgMinutes: count > 0 ? Math.round(sum / count) : 0,
    }))
    .sort((a, b) => b.avgMinutes - a.avgMinutes);
}

// ── Function 5 ────────────────────────────────────────────────────────────
// Unbilled COMPLETED visits per doctor (billedCptCode null) + est. revenue lost.
export async function getUnbilledVisitsByDoctor({
  clinicId,
  startDate,
  endDate,
}: KpiParams) {
  const appts = await prisma.appointment.findMany({
    where: {
      clinicId,
      appointmentDate: { gte: startDate, lte: endDate },
      status: AppointmentStatus.COMPLETED,
      billedCptCode: null,
    },
    include: { doctor: { select: { email: true } } },
  });

  const byDoctor = new Map<string, number>();
  for (const a of appts) {
    byDoctor.set(a.doctor.email, (byDoctor.get(a.doctor.email) ?? 0) + 1);
  }

  return Array.from(byDoctor.entries())
    .map(([email, unbilledCount]) => ({
      doctorName: nameFromEmail(email),
      unbilledCount,
      estimatedRevenueLost: unbilledCount * 75,
    }))
    .sort((a, b) => b.unbilledCount - a.unbilledCount);
}

// ── Function 6 ────────────────────────────────────────────────────────────
// One summary object for the hero + metric cards.
export async function getDashboardSummary({
  clinicId,
  startDate,
  endDate,
}: KpiParams) {
  const appts = await prisma.appointment.findMany({
    where: { clinicId, appointmentDate: { gte: startDate, lte: endDate } },
    select: { status: true, billedAmount: true, billedCptCode: true },
  });

  let totalRevenue = 0;
  let noShows = 0;
  let unbilledTotal = 0;
  for (const a of appts) {
    if (a.status === AppointmentStatus.COMPLETED && a.billedAmount) {
      totalRevenue += Number(a.billedAmount);
    }
    if (a.status === AppointmentStatus.NO_SHOW) noShows += 1;
    if (a.status === AppointmentStatus.COMPLETED && a.billedCptCode === null) {
      unbilledTotal += 1;
    }
  }

  const totalAppointments = appts.length;
  return {
    totalRevenue,
    totalAppointments,
    overallNoShowRate:
      totalAppointments > 0 ? (noShows / totalAppointments) * 100 : 0,
    unbilledTotal,
  };
}
