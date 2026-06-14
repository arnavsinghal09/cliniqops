"use client";

import {
  motion,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";

type Stage = {
  stage: string;
  patient: string;
  status: string;
  tone: "ok" | "warn" | "active";
  z: number;
};

const STAGES: Stage[] = [
  {
    stage: "Intake",
    patient: "Aarav S.",
    status: "Documents in",
    tone: "ok",
    z: 0,
  },
  {
    stage: "Eligibility",
    patient: "Priya M.",
    status: "Checking payer",
    tone: "warn",
    z: 22,
  },
  {
    stage: "Scheduled",
    patient: "Rohan K.",
    status: "Tue, 10:30 AM",
    tone: "active",
    z: 44,
  },
  {
    stage: "Billed",
    patient: "Diya K.",
    status: "CPT 99214 · paid",
    tone: "ok",
    z: 66,
  },
];

export default function FlowBoard({
  tiltX,
  tiltY,
}: {
  tiltX: MotionValue<number>;
  tiltY: MotionValue<number>;
}) {
  const reduce = useReducedMotion();
  const range = reduce ? 0 : 10;
  const rotateY = useSpring(useTransform(tiltX, [-0.5, 0.5], [-range, range]), {
    stiffness: 150,
    damping: 20,
  });
  const rotateX = useSpring(useTransform(tiltY, [-0.5, 0.5], [range, -range]), {
    stiffness: 150,
    damping: 20,
  });

  return (
    <div style={{ perspective: 1000 }} className="w-full max-w-sm">
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative"
      >
        <svg
          aria-hidden
          className="pointer-events-none absolute left-5.5 top-6 h-[calc(100%-3rem)] w-3 overflow-visible"
        >
          <motion.line
            x1="1"
            y1="0"
            x2="1"
            y2="100%"
            stroke="var(--color-line-2)"
            strokeWidth="2"
            strokeDasharray="3 4"
            initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>

        <div className="flex flex-col gap-3">
          {STAGES.map((s, i) => {
            const isActive = s.tone === "active";
            const dot =
              s.tone === "ok"
                ? "bg-ok"
                : s.tone === "warn"
                  ? "bg-warning"
                  : "bg-surface";
            return (
              <motion.div
                key={s.stage}
                style={{ transform: `translateZ(${s.z}px)` }}
                initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: 0.1 + i * 0.1,
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={`relative ml-9 overflow-hidden rounded-md border p-4 ${
                  isActive
                    ? "border-brand-dk bg-brand text-surface shadow-pop"
                    : "border-line bg-surface shadow-card"
                }`}
              >
                <span aria-hidden className="grain-tex opacity-[0.05]" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-eyebrow ${isActive ? "text-brand-muted" : "text-ink-3"}`}
                    >
                      {s.stage}
                    </p>
                    <p
                      className={`mt-1 text-sm font-medium ${isActive ? "text-surface" : "text-ink"}`}
                    >
                      {s.patient}
                    </p>
                    <p
                      className={`text-xs ${isActive ? "text-brand-muted/80" : "text-ink-3"}`}
                    >
                      {s.status}
                    </p>
                  </div>
                  <span
                    className={`h-2.5 w-2.5 rounded-xs ${dot}`}
                    aria-hidden
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
