"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY_COMPLETED = "cliniqops_tour_completed";
const STORAGE_KEY_PAUSED = "cliniqops_tour_paused_step";
const TOTAL_STEPS = 21;

function readStorage(): { pausedStep: number | null } {
  try {
    const completed = window.localStorage.getItem(STORAGE_KEY_COMPLETED);
    if (completed === "true") return { pausedStep: null };
    const raw = window.localStorage.getItem(STORAGE_KEY_PAUSED);
    if (raw !== null) {
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n >= 0) return { pausedStep: n };
    }
  } catch {
    /* noop */
  }
  return { pausedStep: null };
}

export default function TakeTourButton() {
  const [pausedStep, setPausedStep] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    return readStorage().pausedStep;
  });
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const onStarted = (): void => {
      setIsActive(true);
    };
    const onPaused = (e: Event): void => {
      const step = (e as CustomEvent<{ step: number }>).detail?.step;
      setIsActive(false);
      if (typeof step === "number") setPausedStep(step);
    };
    const onCompleted = (): void => {
      setIsActive(false);
      setPausedStep(null);
    };

    window.addEventListener("cliniqops:tour-started", onStarted);
    window.addEventListener("cliniqops:tour-paused", onPaused);
    window.addEventListener("cliniqops:tour-completed", onCompleted);
    return () => {
      window.removeEventListener("cliniqops:tour-started", onStarted);
      window.removeEventListener("cliniqops:tour-paused", onPaused);
      window.removeEventListener("cliniqops:tour-completed", onCompleted);
    };
  }, []);

  const dispatchStart = (resumeStep?: number): void => {
    window.dispatchEvent(
      new CustomEvent("cliniqops:start-tour", {
        detail: resumeStep !== undefined ? { resumeStep } : {},
      }),
    );
  };

  const handleRestart = (e?: React.MouseEvent): void => {
    e?.stopPropagation();
    try {
      window.localStorage.removeItem(STORAGE_KEY_COMPLETED);
      window.localStorage.removeItem(STORAGE_KEY_PAUSED);
    } catch {
      /* noop */
    }
    setPausedStep(null);
    dispatchStart();
  };

  // Tour currently active — only allow restart
  if (isActive) {
    return (
      <button
        type="button"
        onClick={handleRestart}
        className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-sand hover:text-ink"
      >
        Restart Tour
      </button>
    );
  }

  // Paused mid-way — continue or restart
  if (pausedStep !== null) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => dispatchStart(pausedStep)}
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
          className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-sand hover:text-ink"
        >
          Restart Tour
        </button>
      </div>
    );
  }

  // Never started or completed — start fresh
  return (
    <button
      type="button"
      onClick={() => handleRestart()}
      className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-sand hover:text-ink"
    >
      Start Tour
    </button>
  );
}
