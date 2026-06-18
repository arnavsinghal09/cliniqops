"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type CSSProperties,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  TOUR_STEPS,
  isModalStep,
  isClickNavStep,
  type TourStep,
} from "@/lib/tour/tourConfig";

const STORAGE_KEY = "cliniqops_has_completed_tour";
const POLL_INTERVAL = 100;
const POLL_TIMEOUT = 4000;
const MIN_DESKTOP_WIDTH = 1024;

type Rect = { top: number; left: number; width: number; height: number };

const C = {
  surface: "#FBFAF7",
  ink: "#1A1714",
  ink2: "#4A453F",
  ink3: "#8A827A",
  border2: "#D8D0C4",
  accent: "#72554D",
  accentDk: "#4A352E",
  accentMut: "#EDE6DF",
} as const;

function readRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export default function ProductTour() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isActive, setIsActive] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewportTooSmall, setViewportTooSmall] = useState<boolean>(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef<boolean>(false);

  const step: TourStep | undefined = TOUR_STEPS[stepIndex];
  const isLast = stepIndex >= TOUR_STEPS.length - 1;
  const isFirst = stepIndex === 0;

  const endTour = useCallback((): void => {
    setIsActive(false);
    setRect(null);
    if (pollRef.current) clearInterval(pollRef.current);
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* noop */
    }
  }, []);

  const startTour = useCallback((): void => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
    setStepIndex(0);
    setIsActive(true);
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    if (searchParams.get("tour") === "1") {
      startedRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startTour();
    }
  }, [searchParams, startTour]);

  useEffect(() => {
    const onTrigger = (): void => {
      startedRef.current = true;
      startTour();
    };
    window.addEventListener("cliniqops:start-tour", onTrigger);
    return () => window.removeEventListener("cliniqops:start-tour", onTrigger);
  }, [startTour]);

  useEffect(() => {
    const check = (): void =>
      setViewportTooSmall(window.innerWidth < MIN_DESKTOP_WIDTH);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const locateTarget = useCallback((selector: string): void => {
    if (pollRef.current) clearInterval(pollRef.current);
    const immediate = readRect(selector);
    if (immediate) {
      setRect(immediate);
      return;
    }
    setRect(null);
    const startedAt = Date.now();
    pollRef.current = setInterval(() => {
      const found = readRect(selector);
      if (found) {
        setRect(found);
        if (pollRef.current) clearInterval(pollRef.current);
      } else if (Date.now() - startedAt > POLL_TIMEOUT) {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, POLL_INTERVAL);
  }, []);

  useEffect(() => {
    if (!isActive || !step) return;
    if (isModalStep(step)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRect(null);
      return;
    }
    if (pathname !== step.routePath) {
      setRect(null);
      return;
    }
    locateTarget(step.targetSelector);
  }, [isActive, step, pathname, locateTarget]);

  useEffect(() => {
    if (!isActive || !step || isModalStep(step)) return;
    const reposition = (): void => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const next = readRect(step.targetSelector);
        if (next) setRect(next);
      }, 60);
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [isActive, step]);

  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") endTour();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, endTour]);

  const goToStep = useCallback(
    (nextIndex: number): void => {
      const target = TOUR_STEPS[nextIndex];
      if (!target) return;
      setStepIndex(nextIndex);
      if (!isModalStep(target) && pathname !== target.routePath) {
        router.push(target.routePath);
      }
    },
    [pathname, router],
  );

  const advance = useCallback((): void => {
    if (isLast) {
      endTour();
      return;
    }
    goToStep(stepIndex + 1);
  }, [isLast, stepIndex, goToStep, endTour]);

  const back = useCallback((): void => {
    if (isFirst) return;
    goToStep(stepIndex - 1);
  }, [isFirst, stepIndex, goToStep]);

  const handleClickStep = useCallback((): void => {
    if (!step || !isClickNavStep(step)) return;
    const target = document.querySelector(step.targetSelector);
    if (target instanceof HTMLElement) target.click();
    router.push(step.navigatesTo);
    setStepIndex((i) => Math.min(i + 1, TOUR_STEPS.length - 1));
  }, [step, router]);

  if (!isActive || !step) return null;

  if (viewportTooSmall) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10001,
          background: "rgba(26,23,20,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            maxWidth: 380,
            width: "100%",
            background: C.surface,
            border: `1px solid ${C.border2}`,
            borderRadius: 10,
            padding: 28,
            textAlign: "center",
            boxShadow: "0 16px 40px rgba(26,23,20,0.2)",
          }}
        >
          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: C.ink,
              margin: "0 0 8px",
            }}
          >
            Best viewed on desktop
          </p>
          <p
            style={{
              fontSize: 13.5,
              color: C.ink2,
              lineHeight: 1.55,
              margin: "0 0 18px",
            }}
          >
            The interactive product tour is optimized for desktop viewports.
            Please expand your window or log in on a desktop to proceed.
          </p>
          <button
            type="button"
            onClick={endTour}
            style={{
              background: C.accent,
              color: C.surface,
              border: "none",
              borderRadius: 6,
              padding: "9px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Got it
          </button>
        </motion.div>
      </div>
    );
  }

  const isModal = isModalStep(step);
  const isClick = isClickNavStep(step);
  const waitingForTarget = !isModal && !rect;
  const PAD = 8;

  const tooltipPos: CSSProperties = (() => {
    if (isModal || !rect) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10000,
      };
    }
    const spaceBelow = window.innerHeight - (rect.top + rect.height);
    const placeBelow = spaceBelow > 220;
    const clampedLeft = Math.min(
      Math.max(rect.left, 16),
      window.innerWidth - 356,
    );
    return {
      position: "fixed",
      top: placeBelow ? rect.top + rect.height + PAD + 12 : undefined,
      bottom: placeBelow ? undefined : window.innerHeight - rect.top + PAD + 12,
      left: clampedLeft,
      zIndex: 10000,
    };
  })();

  return (
    <>
      {isModal || !rect ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "rgba(26,23,20,0.55)",
          }}
        />
      ) : (
        <motion.div
          initial={false}
          animate={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          style={{
            position: "fixed",
            borderRadius: 8,
            boxShadow: "0 0 0 9999px rgba(26,23,20,0.55)",
            zIndex: 9998,
            pointerEvents: "none",
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: -2,
              borderRadius: 10,
              outline: `2px solid ${C.accent}`,
              outlineOffset: 0,
            }}
          />
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          style={{
            ...tooltipPos,
            width: 340,
            maxWidth: "calc(100vw - 32px)",
            background: C.surface,
            border: `1px solid ${C.border2}`,
            borderRadius: 10,
            padding: 20,
            boxShadow: "0 12px 32px rgba(26,23,20,0.18)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: C.ink3,
              }}
            >
              Step {step.stepNumber} of {TOUR_STEPS.length}
            </span>
            <button
              type="button"
              onClick={endTour}
              aria-label="Close tour"
              style={{
                background: "transparent",
                border: "none",
                color: C.ink3,
                fontSize: 18,
                lineHeight: 1,
                cursor: "pointer",
                padding: 0,
              }}
            >
              ×
            </button>
          </div>

          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: C.ink,
              margin: "0 0 6px",
            }}
          >
            {step.title}
          </p>
          <p
            style={{
              fontSize: 13.5,
              color: C.ink2,
              lineHeight: 1.55,
              margin: "0 0 16px",
            }}
          >
            {step.bodyCopy}
          </p>

          {waitingForTarget && (
            <p
              style={{
                fontSize: 12,
                color: C.ink3,
                fontStyle: "italic",
                margin: "0 0 12px",
              }}
            >
              Loading…
            </p>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={back}
              disabled={isFirst}
              style={{
                background: "transparent",
                border: "none",
                color: isFirst ? C.border2 : C.ink3,
                fontSize: 13.5,
                fontWeight: 500,
                cursor: isFirst ? "not-allowed" : "pointer",
                padding: 0,
              }}
            >
              Back
            </button>

            {isClick ? (
              <button
                type="button"
                onClick={handleClickStep}
                style={{
                  background: C.accent,
                  color: C.surface,
                  border: "none",
                  borderRadius: 6,
                  padding: "9px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Take me there →
              </button>
            ) : (
              <button
                type="button"
                onClick={advance}
                style={{
                  background: C.accent,
                  color: C.surface,
                  border: "none",
                  borderRadius: 6,
                  padding: "9px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {isLast ? "End tour" : "Next"}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
