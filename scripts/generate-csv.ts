// Generates prisma/sample-data/appointments.csv with 200 rows that satisfy
// every distribution rule in the Day-2 spec. Run: npx tsx scripts/generate-csv.ts
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// CPT code is the single source of truth for both duration and billed amount.
const CPT = {
  "99211": { duration: 8, amount: 24 },
  "99212": { duration: 15, amount: 46 },
  "99213": { duration: 25, amount: 77 },
  "99214": { duration: 35, amount: 110 },
  "99215": { duration: 45, amount: 148 },
} as const;
type CptCode = keyof typeof CPT;
const CPT_CODES = Object.keys(CPT) as CptCode[];

const DOCTORS = [
  "dr.sharma@sunrise.com",
  "dr.patel@sunrise.com",
  "dr.mehta@sunrise.com",
  "dr.singh@sunrise.com",
  "dr.kumar@sunrise.com",
];

const PATIENTS = [
  "Aarav Sharma",
  "Vivaan Patel",
  "Aditya Mehta",
  "Vihaan Singh",
  "Arjun Kumar",
  "Sai Reddy",
  "Reyansh Gupta",
  "Krishna Iyer",
  "Ishaan Nair",
  "Shaurya Desai",
  "Atharva Joshi",
  "Advik Rao",
  "Kabir Malhotra",
  "Anaya Verma",
  "Diya Kapoor",
  "Aadhya Bhat",
  "Ananya Menon",
  "Pari Chopra",
  "Myra Saxena",
  "Sara Pillai",
  "Aarohi Ghosh",
  "Ira Banerjee",
  "Riya Mukherjee",
  "Navya Chauhan",
  "Kiara Sethi",
  "Saanvi Agarwal",
  "Aanya Bose",
  "Prisha Naidu",
  "Anika Trivedi",
  "Avni Shetty",
  "Rohan Khanna",
  "Kunal Bhatia",
  "Nikhil Anand",
  "Rahul Pandey",
  "Karan Dixit",
  "Siddharth Roy",
  "Manish Tiwari",
  "Varun Sinha",
  "Akash Dubey",
  "Gaurav Shukla",
  "Neha Rana",
  "Pooja Mishra",
  "Sneha Kulkarni",
  "Megha Deshpande",
  "Divya Hegde",
  "Tanvi Kaur",
  "Ishita Bajaj",
  "Nisha Chandra",
  "Swara Bhalla",
  "Lakshmi Pawar",
];

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(arr: readonly T[]): T => arr[rand(arr.length)];

// Fisher–Yates shuffle — used to randomise which rows are unbilled and which
// patients get which ICD codes, without bias.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const today = new Date();
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(today.getMonth() - 6);

function randomDateYmd(): string {
  const t =
    sixMonthsAgo.getTime() +
    Math.random() * (today.getTime() - sixMonthsAgo.getTime());
  return new Date(t).toISOString().slice(0, 10);
}

function randomDob(): string {
  const age = 18 + rand(68); // 18..85
  const y = today.getFullYear() - age;
  const m = String(1 + rand(12)).padStart(2, "0");
  const d = String(1 + rand(28)).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// --- ICD-10 assignment is per-PATIENT, not per-row ------------------------
// Counts sum to 53 across 50 patients, so some patients receive two codes
// (pipe-joined) and a few receive none ("rest empty").
const patientCodes: Record<string, string[]> = {};
function assignCode(code: string, count: number) {
  // Only assign to patients who don't already have THIS code, so per-code
  // counts stay exact even when a patient ends up with multiple codes.
  const eligible = shuffle(
    PATIENTS.filter((p) => !(patientCodes[p] ?? []).includes(code)),
  );
  for (let i = 0; i < count; i++) {
    const p = eligible[i];
    (patientCodes[p] ??= []).push(code);
  }
}
assignCode("E11.9", 20);
assignCode("I10", 15);
assignCode("J45.909", 10);
assignCode("E78.5", 8);

// --- Build the 200 status slots, then shuffle so they're not grouped -------
const statusPool = [
  ...Array(130).fill("COMPLETED"),
  ...Array(30).fill("NO_SHOW"),
  ...Array(20).fill("CANCELLED"),
  ...Array(20).fill("SCHEDULED"),
];
const statuses = shuffle(statusPool);

// Choose exactly 25 of the COMPLETED rows to be unbilled.
const completedIdx = statuses
  .map((s, i) => (s === "COMPLETED" ? i : -1))
  .filter((i) => i >= 0);
const unbilled = new Set(shuffle(completedIdx).slice(0, 25));

const header =
  "patient_name,appointment_date,duration_minutes,appointment_type,status,doctor_email,billed_cpt_code,billed_amount,date_of_birth,icd10_codes";

const lines = statuses.map((status, i) => {
  const patient = pick(PATIENTS);
  const doctor = pick(DOCTORS);
  // Every visit has an underlying level (→ duration). Whether it's *billed*
  // depends on status + the unbilled set.
  const level = pick(CPT_CODES);
  const duration = CPT[level].duration;

  // Only COMPLETED-and-not-in-the-unbilled-set rows carry a CPT + amount.
  const billed = status === "COMPLETED" && !unbilled.has(i);
  const billedCpt = billed ? level : "";
  const billedAmount = billed ? String(CPT[level].amount) : "";

  const apptType = duration <= 15 ? "Follow-up" : "Consultation";
  const codes = (patientCodes[patient] ?? []).join("|");

  return [
    patient,
    randomDateYmd(),
    String(duration),
    apptType,
    status,
    doctor,
    billedCpt,
    billedAmount,
    randomDob(),
    codes,
  ].join(",");
});

mkdirSync(join("prisma", "sample-data"), { recursive: true });
writeFileSync(
  join("prisma", "sample-data", "appointments.csv"),
  [header, ...lines].join("\n") + "\n",
);
console.log(
  `Wrote 200 rows → prisma/sample-data/appointments.csv (25 unbilled completed)`,
);
