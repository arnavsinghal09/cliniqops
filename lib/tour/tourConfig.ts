export type TourRoute = "/dashboard" | "/upload" | "/query" | "/consultations";

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
      "CliniqOps turns raw clinic data into operational intelligence — billing leaks, no-show patterns, AI consultations, and more. This quick tour takes about a minute.",
    actionType: "next",
  },
  {
    stepNumber: 2,
    routePath: "/dashboard",
    targetSelector: '[data-tour="leakage-card"]',
    title: "Money left on the table",
    bodyCopy:
      "This is revenue your clinic has already earned but hasn't billed correctly — surfaced automatically from your appointment data.",
    actionType: "next",
  },
  {
    stepNumber: 3,
    routePath: "/dashboard",
    targetSelector: '[data-tour="nav-query"]',
    title: "Ask anything, in plain English",
    bodyCopy:
      "Click here to open Ask Data — query your clinic without writing a line of SQL.",
    actionType: "click",
    navigatesTo: "/query",
  },
  {
    stepNumber: 4,
    routePath: "/query",
    targetSelector: '[data-tour="query-input"]',
    title: "Natural-language analytics",
    bodyCopy:
      'Type something like "which doctor has the worst no-show rate this month" and get a chart back instantly.',
    actionType: "next",
  },
  {
    stepNumber: 5,
    routePath: "/query",
    targetSelector: '[data-tour="nav-upload"]',
    title: "Bring your own data",
    bodyCopy:
      "Click here to see how a clinic loads its scheduling and billing exports.",
    actionType: "click",
    navigatesTo: "/upload",
  },
  {
    stepNumber: 6,
    routePath: "/upload",
    targetSelector: '[data-tour="upload-dropzone"]',
    title: "One CSV, fully parsed",
    bodyCopy:
      "Drop a scheduling export here and CliniqOps validates every row, flags errors, and powers everything you've just seen.",
    actionType: "next",
  },
  {
    stepNumber: 7,
    routePath: "/upload",
    targetSelector: '[data-tour="nav-consultations"]',
    title: "AI scribe & telehealth",
    bodyCopy:
      "Click here to open Consultations — run a video visit with an ambient AI scribe that drafts the clinical note for you.",
    actionType: "click",
    navigatesTo: "/consultations",
  },
  {
    stepNumber: 8,
    routePath: "/consultations",
    targetSelector: null,
    title: "You're all set",
    bodyCopy:
      "That's the tour. Everything here runs on real demo data — explore freely, or load your own anytime.",
    actionType: "next",
  },
] as const;
