import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

const CHRONIC_PREFIXES = ["E11", "I10", "J45", "E78"] as const;

export type OverdueStatus = "RED" | "AMBER" | "GREEN";

export type OverduePatient = {
  id: string;
  name: string;
  icd10Codes: string[];
  lastVisitDate: Date | null;
  daysSinceLastVisit: number;
  hasChronicCondition: boolean;
  overdueStatus: OverdueStatus;
};

export type PatientFilters = {
  condition?: string;
  status?: string;
  search?: string;
};

function decorate(p: {
  id: string;
  name: string;
  icd10Codes: string[];
  lastVisitDate: Date | null;
}): OverduePatient {
  const daysSinceLastVisit = p.lastVisitDate
    ? Math.round((Date.now() - p.lastVisitDate.getTime()) / 86_400_000)
    : 999;

  const hasChronicCondition = p.icd10Codes.some((code) =>
    CHRONIC_PREFIXES.some((prefix) => code.startsWith(prefix)),
  );

  let overdueStatus: OverdueStatus = "GREEN";
  if (hasChronicCondition && daysSinceLastVisit > 180) overdueStatus = "RED";
  else if (
    hasChronicCondition &&
    daysSinceLastVisit >= 90 &&
    daysSinceLastVisit <= 180
  )
    overdueStatus = "AMBER";

  return { ...p, daysSinceLastVisit, hasChronicCondition, overdueStatus };
}

// Internal: fetch + decorate + apply computed-field filters. Returns the FULL
// filtered set (no pagination) — callers either page it or count it.
async function fetchFiltered(
  clinicId: string,
  filters: PatientFilters,
): Promise<OverduePatient[]> {
  const where: Prisma.PatientWhereInput = { clinicId };
  if (filters.search && filters.search.trim()) {
    where.name = { contains: filters.search.trim(), mode: "insensitive" };
  }

  const rows = await prisma.patient.findMany({
    where,
    select: { id: true, name: true, icd10Codes: true, lastVisitDate: true },
    orderBy: { name: "asc" },
  });

  let result = rows.map(decorate);

  if (filters.status && filters.status !== "ALL") {
    const wanted = filters.status.toUpperCase();
    result = result.filter((p) => p.overdueStatus === wanted);
  }
  if (filters.condition && filters.condition !== "ALL") {
    result = result.filter((p) =>
      p.icd10Codes.some((c) => c.startsWith(filters.condition!)),
    );
  }

  return result;
}

// Back-compat: the unpaginated list (still used by the dashboard count path).
export async function getOverduePatients(
  clinicId: string,
  filters: PatientFilters,
): Promise<OverduePatient[]> {
  return fetchFiltered(clinicId, filters);
}

/**
 * Paginated roster. Status/condition filters depend on computed fields, so we
 * filter the full set in JS first, then slice the page. `total` is the filtered
 * count (for page math), and we also return the unfiltered-by-page summary
 * counts so the pills reflect the WHOLE filtered set, not just the visible page.
 */
export async function getOverduePatientsPage(
  clinicId: string,
  filters: PatientFilters,
  page: number,
  pageSize: number,
): Promise<{
  rows: OverduePatient[];
  total: number;
  summary: { red: number; amber: number; never: number };
}> {
  const all = await fetchFiltered(clinicId, filters);

  const summary = {
    red: all.filter((p) => p.overdueStatus === "RED").length,
    amber: all.filter((p) => p.overdueStatus === "AMBER").length,
    never: all.filter((p) => p.lastVisitDate === null).length,
  };

  const start = (page - 1) * pageSize;
  const rows = all.slice(start, start + pageSize);

  return { rows, total: all.length, summary };
}

export async function getPatientHistory(patientId: string, clinicId: string) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, clinicId },
    include: {
      appointments: {
        include: { doctor: true },
        orderBy: { appointmentDate: "desc" },
      },
    },
  });
  if (!patient) throw new Error("Not found");
  return patient;
}

// Read logged follow-ups for a patient (newest first) so the drawer can show
// them. Clinic-scoped so a patient from another clinic can't be read.
export async function getFollowUps(patientId: string, clinicId: string) {
  return prisma.followUpAction.findMany({
    where: { patientId, clinicId },
    orderBy: { actionDate: "desc" },
  });
}

export async function countRedOverduePatients(
  clinicId: string,
): Promise<number> {
  const all = await fetchFiltered(clinicId, {});
  return all.filter((p) => p.overdueStatus === "RED").length;
}
