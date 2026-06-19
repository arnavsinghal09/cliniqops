export type TourRoute =
  | "/dashboard"
  | "/upload"
  | "/query"
  | "/consultations"
  | "/patients"
  | "/revenue"
  | "/alerts";

interface BaseStep {
  stepNumber: number;
  routePath: TourRoute;
  title: string;
  bodyCopy: string;
}

interface NextStep extends BaseStep {
  actionType: "next";
  targetSelector: string;
}

interface ClickNavStep extends BaseStep {
  actionType: "click";
  targetSelector: string;
  navigatesTo: TourRoute;
}

interface ModalStep extends BaseStep {
  actionType: "next";
  targetSelector: null;
}

export type TourStep = NextStep | ClickNavStep | ModalStep;

export function isModalStep(step: TourStep): step is ModalStep {
  return step.targetSelector === null;
}

export function isClickNavStep(step: TourStep): step is ClickNavStep {
  return step.actionType === "click";
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    stepNumber: 1,
    routePath: "/dashboard",
    targetSelector: null,
    title: "Welcome to CliniqOps",
    bodyCopy:
      "This tour walks you through live demo data — revenue leakage, no-show tracking, AI-powered queries, and a built-in telehealth scribe. Takes under two minutes.",
    actionType: "next",
  },
  {
    stepNumber: 2,
    routePath: "/dashboard",
    targetSelector: '[data-tour="revenue-banner"]',
    title: "Your clinic at a glance",
    bodyCopy:
      "The hero banner shows total revenue, appointment volume, and your overall no-show rate for the selected date range — all computed from real appointment data.",
    actionType: "next",
  },
  {
    stepNumber: 3,
    routePath: "/dashboard",
    targetSelector: '[data-tour="leakage-card"]',
    title: "Revenue slipping through",
    bodyCopy:
      "This card auto-detects visits that were likely under-coded or billed at the wrong CPT level. That ₹ figure is money your clinic has already earned but not yet collected correctly.",
    actionType: "next",
  },
  {
    stepNumber: 4,
    routePath: "/dashboard",
    targetSelector: '[data-tour="metric-cards"]',
    title: "Four KPIs, always live",
    bodyCopy:
      "Total revenue, no-show rate, unbilled visits, and appointment count — each recalculates when you change the date filter above.",
    actionType: "next",
  },
  {
    stepNumber: 5,
    routePath: "/dashboard",
    targetSelector: '[data-tour="charts-grid"]',
    title: "Drill into the patterns",
    bodyCopy:
      "These charts break down no-shows by doctor, revenue by appointment type, cancellations by weekday, and average session length. Hover any bar for exact numbers.",
    actionType: "next",
  },
  {
    stepNumber: 6,
    routePath: "/dashboard",
    targetSelector: '[data-tour="nav-query"]',
    title: "Ask your data in plain English",
    bodyCopy: "Click here to open the NL Query tool — no SQL needed.",
    actionType: "click",
    navigatesTo: "/query",
  },
  {
    stepNumber: 7,
    routePath: "/query",
    targetSelector: '[data-tour="query-input"]',
    title: "Type a question, get a chart",
    bodyCopy:
      'Ask anything: "which doctor has the worst no-show rate this month" or "show me unbilled visits by type". The AI translates it to SQL, runs it, and renders a chart.',
    actionType: "next",
  },
  {
    stepNumber: 8,
    routePath: "/query",
    targetSelector: '[data-tour="query-chips"]',
    title: "Or start with an example",
    bodyCopy:
      "These chips are pre-built queries from real clinic ops questions. Click one to run it instantly — results appear below with a chart or table.",
    actionType: "next",
  },
  {
    stepNumber: 9,
    routePath: "/query",
    targetSelector: '[data-tour="nav-upload"]',
    title: "Load your own data",
    bodyCopy: "Click here to see how data gets into CliniqOps.",
    actionType: "click",
    navigatesTo: "/upload",
  },
  {
    stepNumber: 10,
    routePath: "/upload",
    targetSelector: '[data-tour="upload-dropzone"]',
    title: "One CSV, fully parsed",
    bodyCopy:
      "Drop a scheduling export from Athena, DrChrono, or any generic CSV format. CliniqOps validates every row, flags errors, and instantly powers every chart you just saw.",
    actionType: "next",
  },
  {
    stepNumber: 11,
    routePath: "/upload",
    targetSelector: '[data-tour="nav-consultations"]',
    title: "Telehealth with an AI scribe",
    bodyCopy: "Click here to explore the consultation suite.",
    actionType: "click",
    navigatesTo: "/consultations",
  },
  {
    stepNumber: 12,
    routePath: "/consultations",
    targetSelector: '[data-tour="new-consultation"]',
    title: "Start a video visit",
    bodyCopy:
      "Create a room for a patient, share the link, and join the call. An ambient AI scribe listens and drafts a full SOAP note with ICD-10 codes and CPT suggestions.",
    actionType: "next",
  },
  {
    stepNumber: 13,
    routePath: "/consultations",
    targetSelector: '[data-tour="nav-patients"]',
    title: "Track every patient",
    bodyCopy:
      "Click here to see the patient roster — follow-up status, overdue patients, and appointment history.",
    actionType: "click",
    navigatesTo: "/patients",
  },
  {
    stepNumber: 14,
    routePath: "/patients",
    targetSelector: '[data-tour="patient-table"]',
    title: "Overdue follow-ups at a glance",
    bodyCopy:
      "Every patient flagged RED or AMBER needs follow-up. The status is calculated from their last visit date and any logged conditions.",
    actionType: "next",
  },
  {
    stepNumber: 15,
    routePath: "/patients",
    targetSelector: '[data-tour="patient-drawer-trigger"]',
    title: "Full patient history in one click",
    bodyCopy:
      "Hit View to open the patient timeline — every visit, CPT codes, and a space to log follow-up notes that auto-save.",
    actionType: "next",
  },
  {
    stepNumber: 16,
    routePath: "/patients",
    targetSelector: '[data-tour="nav-revenue"]',
    title: "Revenue integrity",
    bodyCopy: "Click here to explore the revenue leakage report.",
    actionType: "click",
    navigatesTo: "/revenue",
  },
  {
    stepNumber: 17,
    routePath: "/revenue",
    targetSelector: '[data-tour="revenue-leakage-summary"]',
    title: "See where revenue slips",
    bodyCopy:
      "Every undercoded visit is flagged here with the suspected correct CPT code, the billing gap, and which doctor it's attributed to.",
    actionType: "next",
  },
  {
    stepNumber: 18,
    routePath: "/revenue",
    targetSelector: '[data-tour="revenue-trend-chart"]',
    title: "Track the trend",
    bodyCopy:
      "This chart shows monthly leakage so you can see if undercoding is getting better or worse over time.",
    actionType: "next",
  },
  {
    stepNumber: 19,
    routePath: "/revenue",
    targetSelector: '[data-tour="nav-alerts"]',
    title: "Automated anomaly detection",
    bodyCopy: "Click here to see the alerts feed.",
    actionType: "click",
    navigatesTo: "/alerts",
  },
  {
    stepNumber: 20,
    routePath: "/alerts",
    targetSelector: '[data-tour="alerts-list"]',
    title: "Anomalies, surfaced automatically",
    bodyCopy:
      "CliniqOps monitors key metrics weekly. When no-show rate, revenue, or cancellations deviate more than expected, an alert appears here with the trend and a suggested action.",
    actionType: "next",
  },
  {
    stepNumber: 21,
    routePath: "/alerts",
    targetSelector: null,
    title: "You've seen it all",
    bodyCopy:
      "That's a full walkthrough of CliniqOps — from dashboard KPIs to AI consultations, patient tracking, revenue integrity, and anomaly detection. Explore freely or load your own clinic data anytime.",
    actionType: "next",
  },
] as const;
