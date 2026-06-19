"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY_COMPLETED = "cliniqops_tour_completed";
const STORAGE_KEY_PAUSED = "cliniqops_tour_paused_step";
const TOTAL_STEPS = 21;

export default function TakeTourButton() {
  const [pausedStep, setPausedStep] = useState<number | null>(null);

  useEffect(() => {
    try {
      const completed = window.localStorage.getItem(STORAGE_KEY_COMPLETED);
      if (completed === "true") {
        setPausedStep(null);
        return;
      }
      const raw = window.localStorage.getItem(STORAGE_KEY_PAUSED);
      if (raw !== null) {
        const n = parseInt(raw, 10);
        if (!isNaN(n) && n > 0) setPausedStep(n);
      }
    } catch {
      /* noop */
    }
  }, []);

  const handleClick = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY_COMPLETED);
    } catch {
      /* noop */
    }
    window.dispatchEvent(
      new CustomEvent("cliniqops:start-tour", {
        detail: pausedStep !== null ? { resumeStep: pausedStep } : {},
      }),
    );
  };

  const handleRestart = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      window.localStorage.removeItem(STORAGE_KEY_COMPLETED);
      window.localStorage.removeItem(STORAGE_KEY_PAUSED);
    } catch {
      /* noop */
    }
    window.dispatchEvent(
      new CustomEvent("cliniqops:start-tour", { detail: {} }),
    );
    setPausedStep(null);
  };

  if (pausedStep !== null) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-brand-muted px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand-muted/70"
        >
          <span>Continue tour</span>
          <span className="rounded bg-brand/10 px-1 py-0.5 text-[10px] font-bold tabular-nums">
            {pausedStep + 1}/{TOTAL_STEPS}
          </span>
        </button>
        <button
          type="button"
          onClick={handleRestart}
          title="Restart from beginning"
          className="rounded-sm border border-line px-2 py-1.5 text-xs text-ink-3 transition-colors hover:text-ink"
        >
          ↺
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-sand hover:text-ink"
    >
      Take a tour
    </button>
  );
}
