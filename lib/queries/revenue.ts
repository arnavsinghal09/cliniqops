import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import prisma from "../prisma";
import { calculateLeakage } from "@/lib/cpt-reference";

export type LeakageAppointment = {
  id: string;
  date: string;
  doctorName: string;
  patientName: string;
  durationMinutes: number;
  billedCode: string;
  suggestedCode: string;
  leakageAmount: number;
  leakageType: "UNDERCODE" | "OVERCODE";
};

export type LeakageReport = {
  summary: {
    totalLeakage: number;
    undercodeCount: number;
    overcodeCount: number;
    affectedDoctors: number;
  };
  byDoctor: Array<{
    doctorName: string;
    totalLeakage: number;
    appointmentCount: number;
    topPattern: string;
  }>;
  appointments: LeakageAppointment[];
};

export async function getLeakageReport(
  clinicId: string,
  startDate: Date,
  endDate: Date,
): Promise<LeakageReport> {
  const rows = await prisma.appointment.findMany({
    where: {
      clinicId,
      status: "COMPLETED",
      billedCptCode: { not: null },
      appointmentDate: { gte: startDate, lte: endDate },
    },
    include: { doctor: true, patient: true },
  });

  type Flagged = {
    id: string;
    date: string;
    doctorId: string;
    doctorName: string;
    patientName: string;
    durationMinutes: number;
    billedCode: string;
    suggestedCode: string;
    leakageAmount: number;
    leakageType: "UNDERCODE" | "OVERCODE";
  };

  const flagged: Flagged[] = [];

  for (const a of rows) {
    if (a.billedCptCode == null || a.durationMinutes == null) continue;
    const { suggestedCode, leakageAmount, leakageType } = calculateLeakage(
      a.billedCptCode,
      a.durationMinutes,
    );
    if (leakageType === "CORRECT") continue;

    flagged.push({
      id: a.id,
      date: a.appointmentDate.toISOString(),
      doctorId: a.doctorId,
      doctorName: a.doctor.email,
      patientName: a.patient.name,
      durationMinutes: a.durationMinutes,
      billedCode: a.billedCptCode,
      suggestedCode,
      leakageAmount,
      leakageType,
    });
  }

  const undercode = flagged.filter((f) => f.leakageType === "UNDERCODE");
  const overcode = flagged.filter((f) => f.leakageType === "OVERCODE");

  const totalLeakage = undercode.reduce(
    (sum, f) => sum + Math.abs(f.leakageAmount),
    0,
  );

  const affectedDoctors = new Set(flagged.map((f) => f.doctorId)).size;

  // byDoctor aggregation (undercode leakage drives the headline number).
const doctorMap = new Map<
  string,
  {
    doctorName: string;
    totalLeakage: number;
    appointmentCount: number;
    patterns: Map<string, number>;
  }
>();
  for (const f of flagged) {
    let d = doctorMap.get(f.doctorId);
    if (!d) {
      d = {
        doctorName: f.doctorName,
        totalLeakage: 0,
        appointmentCount: 0,
        patterns: new Map(),
      };
      doctorMap.set(f.doctorId, d);
    }
    if (f.leakageType === "UNDERCODE") {
      d.totalLeakage += Math.abs(f.leakageAmount);
    }
    d.appointmentCount += 1;
    const pattern = `${f.billedCode} → ${f.suggestedCode}`;
    d.patterns.set(pattern, (d.patterns.get(pattern) ?? 0) + 1);
  }

  const byDoctor = Array.from(doctorMap.values())
    .map((d) => {
      let topPattern = "";
      let topCount = -1;
      for (const [pattern, count] of d.patterns) {
        if (count > topCount) {
          topCount = count;
          topPattern = pattern;
        }
      }
      return {
        doctorName: d.doctorName,
        totalLeakage: d.totalLeakage,
        appointmentCount: d.appointmentCount,
        topPattern,
      };
    })
    .sort((a, b) => b.totalLeakage - a.totalLeakage);

  const appointments: LeakageAppointment[] = flagged.map((f) => ({
    id: f.id,
    date: f.date,
    doctorName: f.doctorName,
    patientName: f.patientName,
    durationMinutes: f.durationMinutes,
    billedCode: f.billedCode,
    suggestedCode: f.suggestedCode,
    leakageAmount: f.leakageAmount,
    leakageType: f.leakageType,
  }));

  return {
    summary: {
      totalLeakage,
      undercodeCount: undercode.length,
      overcodeCount: overcode.length,
      affectedDoctors,
    },
    byDoctor,
    appointments,
  };
}

export async function getMonthlyLeakageTrend(
  clinicId: string,
): Promise<Array<{ month: string; totalLeakage: number }>> {
  const now = new Date();
  const result: Array<{ month: string; totalLeakage: number }> = [];

  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    const rows = await prisma.appointment.findMany({
      where: {
        clinicId,
        status: "COMPLETED",
        billedCptCode: { not: null },
        appointmentDate: { gte: start, lte: end },
      },
      select: { billedCptCode: true, durationMinutes: true },
    });

    let totalLeakage = 0;
    for (const a of rows) {
      if (a.billedCptCode == null || a.durationMinutes == null) continue;
      const { leakageAmount, leakageType } = calculateLeakage(
        a.billedCptCode,
        a.durationMinutes,
      );
      if (leakageType === "UNDERCODE") totalLeakage += Math.abs(leakageAmount);
    }

    result.push({ month: format(monthDate, "MMM yy"), totalLeakage });
  }

  return result;
}