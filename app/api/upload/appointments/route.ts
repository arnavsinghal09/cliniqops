import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import Papa from "papaparse";
import { NextResponse } from "next/server";
// AppointmentStatus is the Prisma-generated enum. We import the *value* (not just
// the type) so we can derive the set of valid statuses from it at runtime —
// no hand-maintained string list that could drift from the schema.
import { AppointmentStatus } from "@/lib/generated/prisma/client";

// Build the valid-status set once at module load, not per request.
// Object.values(enum) -> ["SCHEDULED","COMPLETED","CANCELLED","NO_SHOW"].
// Using a Set gives O(1) membership checks in the loop below.
const VALID_STATUSES = new Set<string>(Object.values(AppointmentStatus));

// Pure helper: turn any header variant ("Patient Name", "patient_name",
// "patient-name") into a single canonical key ("patientname"). Kept local —
// it's an implementation detail of this route, nothing else needs it.
function normalizeHeader(str: string): string {
  return str.toLowerCase().replace(/[\s\-_]+/g, "");
}

export async function POST(request: Request) {
  // --- 1. Auth gate ---------------------------------------------------------
  // Every mutating route re-checks the session server-side. We NEVER trust the
  // client for identity or tenant. The clinicId comes only from the verified
  // session, so an admin of clinic A can't import rows into clinic B by
  // tampering with the request body.
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const clinicId = session.user.clinicId;

  // --- 2. Pull the file out of multipart form data --------------------------
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // --- 3. Read + parse the CSV ----------------------------------------------
  // file.text() reads the whole upload into memory. Fine for a few hundred KB;
  // if this ever needs to handle huge files we'd switch to a streaming parse.
  const text = await file.text();

  // transformHeader runs normalizeHeader on every column name as it's parsed,
  // so downstream we can rely on row.patientname / row.appointmentdate / etc.
  // regardless of how the source system cased or spaced its headers.
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  // --- 4. Per-row processing ------------------------------------------------
  let imported = 0;
  const errorRows: Array<{ row: number; reason: string }> = [];

  // Cache doctor lookups by email. The same 5 doctors appear across 200 rows;
  // without this we'd issue ~200 identical findFirst queries. We store the
  // resolved id, or null to remember "already looked up, doesn't exist" so we
  // don't re-query a bad email either.
  const doctorCache = new Map<string, string | null>();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    // CSV line number for human-readable errors: +1 for the header row,
    // +1 again to make it 1-based (so the first data row reads as line 2).
    const lineNumber = i + 2;

    // a. patient name present
    if (!row.patientname) {
      errorRows.push({ row: lineNumber, reason: "Missing patient name" });
      continue;
    }

    // b. appointment date parseable. new Date() on garbage yields an Invalid
    // Date whose getTime() is NaN — that's our validity check.
    const appointmentDate = new Date(row.appointmentdate);
    if (isNaN(appointmentDate.getTime())) {
      errorRows.push({ row: lineNumber, reason: "Invalid appointment date" });
      continue;
    }

    // c. duration is a positive integer
    const durationMinutes = Number(row.durationminutes);
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      errorRows.push({ row: lineNumber, reason: "Invalid duration" });
      continue;
    }

    // d. appointment type present
    if (!row.appointmenttype) {
      errorRows.push({ row: lineNumber, reason: "Missing appointment type" });
      continue;
    }

    // e. status is one of the four enum values (case-insensitive input)
    const statusUpper = (row.status ?? "").toUpperCase();
    if (!VALID_STATUSES.has(statusUpper)) {
      errorRows.push({
        row: lineNumber,
        reason: `Invalid status: ${row.status}`,
      });
      continue;
    }
    // Safe cast: we just proved statusUpper is a member of the enum, so this
    // satisfies strict mode without `any`.
    const status = statusUpper as AppointmentStatus;

    // f. doctor email present
    if (!row.doctoremail) {
      errorRows.push({ row: lineNumber, reason: "Missing doctor email" });
      continue;
    }

    // g. resolve doctor (cached). Only hit the DB on a cache miss.
    let doctorId = doctorCache.get(row.doctoremail);
    if (doctorId === undefined) {
      const doctor = await prisma.user.findFirst({
        where: { email: row.doctoremail, clinicId },
      });
      doctorId = doctor?.id ?? null;
      doctorCache.set(row.doctoremail, doctorId);
    }
    if (!doctorId) {
      errorRows.push({
        row: lineNumber,
        reason: `Doctor not found: ${row.doctoremail}`,
      });
      continue;
    }

    // h. find-or-create the patient. Patient has no natural unique key we can
    // upsert on (name isn't unique), so it's the explicit findFirst-then-create
    // pattern, scoped to this clinic.
    let patient = await prisma.patient.findFirst({
      where: { clinicId, name: row.patientname },
    });
    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          clinicId,
          name: row.patientname,
          dateOfBirth: row.dateofbirth ? new Date(row.dateofbirth) : null,
          // icd10_codes arrive pipe-delimited ("E11.9|I10"); split into the
          // String[] the schema expects, or [] when absent.
          icd10Codes: row.icd10codes ? row.icd10codes.split("|") : [],
        },
      });
    }

    // i. keep lastVisitDate as the most recent appointment date we've seen.
    if (!patient.lastVisitDate || appointmentDate > patient.lastVisitDate) {
      await prisma.patient.update({
        where: { id: patient.id },
        data: { lastVisitDate: appointmentDate },
      });
    }

    // j. upsert the appointment on the compound unique key. Re-importing the
    // same export is therefore idempotent — an unchanged row updates in place
    // instead of duplicating.
    await prisma.appointment.upsert({
      where: {
        clinicId_patientId_appointmentDate_doctorId: {
          clinicId,
          patientId: patient.id,
          appointmentDate,
          doctorId,
        },
      },
      update: {
        durationMinutes,
        appointmentType: row.appointmenttype,
        status,
        billedCptCode: row.billedcptcode || null,
        billedAmount: row.billedamount ? parseFloat(row.billedamount) : null,
      },
      create: {
        clinicId,
        doctorId,
        patientId: patient.id,
        appointmentDate,
        durationMinutes,
        appointmentType: row.appointmenttype,
        status,
        billedCptCode: row.billedcptcode || null,
        billedAmount: row.billedamount ? parseFloat(row.billedamount) : null,
      },
    });

    imported++;
  }

  // --- 5. Report back -------------------------------------------------------
  // 200 even when some rows were skipped — a partial import isn't a request
  // failure. The client renders imported/skipped/errors from this payload.
  return NextResponse.json(
    { imported, skipped: errorRows.length, errors: errorRows },
    { status: 200 },
  );
}
