"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Calendar, Receipt, Users, Mic, Bell } from "lucide-react";

const N = 5;
const CYCLE_MS = 3000;
const EXIT_MS = 560;

const RANKS = [
  { z: 140, scale: 1.0, opacity: 1.0 },
  { z: 70, scale: 0.948, opacity: 0.82 },
  { z: 0, scale: 0.896, opacity: 0.6 },
  { z: -70, scale: 0.844, opacity: 0.36 },
  { z: -140, scale: 0.792, opacity: 0.14 },
] as const;

const EXIT = { z: 230, scale: 1.07, opacity: 0 } as const;

const ICONS = {
  calendar: Calendar,
  receipt: Receipt,
  users: Users,
  microphone: Mic,
  bell: Bell,
};

const CARDS = [
  {
    id: "flow",
    icon: "calendar",
    label: "Patient Flow",
    accent: "#4E6B4F",
    eyebrow: "Live · 30s refresh",
    tagline: "Every appointment visible.",
    rows: [
      { text: "Aarav S. — Waiting · 9:15 AM", dim: false },
      { text: "Priya M. — With Dr. Shah · Live", dim: false },
      { text: "Dev P. — Arrived · 9:45 AM", dim: false },
      { text: "Rohan K. — Completed", dim: true },
    ],
  },
  {
    id: "revenue",
    icon: "receipt",
    label: "Revenue Recovery",
    accent: "#B07A2E",
    eyebrow: "3 unbilled flagged",
    tagline: "No visit goes unbilled.",
    rows: [
      { text: "$4,320 billed this week", dim: false },
      { text: "3 visits · no CPT code · flagged", dim: false },
      { text: "$890 insurance pending", dim: false },
      { text: "Last synced 2 min ago", dim: true },
    ],
  },
  {
    id: "staffing",
    icon: "users",
    label: "Staffing Balance",
    accent: "#72554D",
    eyebrow: "1 clinician overbooked",
    tagline: "Balance before burnout.",
    rows: [
      { text: "Dr. Shah — 12 appointments today", dim: false },
      { text: "Dr. Mehta — 7 appointments today", dim: false },
      { text: "Dr. Patel — 4 appts · gap at 2 PM", dim: false },
      { text: "Rebalance suggested", dim: true },
    ],
  },
  {
    id: "consult",
    icon: "microphone",
    label: "AI Consultation",
    accent: "#B4423A",
    eyebrow: "Live · Dr. Shah",
    tagline: "Notes write themselves.",
    rows: [
      { text: "Dr. Shah / Priya M. · 12:04 elapsed", dim: false },
      { text: "SOAP note auto-transcribing", dim: false },
      { text: "CPT 99214 — AI suggested", dim: false },
      { text: "Follow-up: 2 weeks", dim: true },
    ],
  },
  {
    id: "alerts",
    icon: "bell",
    label: "Alerts",
    accent: "#2A6B82",
    eyebrow: "2 requires attention",
    tagline: "Nothing slips through.",
    rows: [
      { text: "Missed follow-up · Aarav S.", dim: false },
      { text: "Insurance rejection · Claim #884", dim: false },
      { text: "Overdue lab result · Dev P.", dim: false },
      { text: "All other alerts cleared", dim: true },
    ],
  },
] as const;

export default function LayeredCardStack() {
  const reduce = useReducedMotion();
  const [frontIdx, setFrontIdx] = useState(0);
  const [exitingIdx, setExitingIdx] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  const frontIdxRef = useRef(frontIdx);
  useEffect(() => {
    frontIdxRef.current = frontIdx;
  }, [frontIdx]);

  useEffect(() => {
    if (reduce || paused) return;

    const t = setInterval(() => {
      setExitingIdx(frontIdxRef.current);

      setTimeout(() => {
        setFrontIdx((i) => (i + 1) % N);
        setExitingIdx(null);
      }, EXIT_MS);
    }, CYCLE_MS);

    return () => clearInterval(t);
  }, [reduce, paused]);

  return (
    <div
      className="relative w-75 h-62.5 shrink-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="w-full h-full perspective-[900px] perspective-origin-[52%_44%]">
        <div className="w-full h-full relative transform-3d transform-[rotateX(14deg)_rotateY(-22deg)]">
          {CARDS.map((card, i) => {
            const isExiting = exitingIdx === i;
            const rank = ((i - frontIdx + N) % N) as 0 | 1 | 2 | 3 | 4;
            const cfg = isExiting ? EXIT : RANKS[rank];
            const IconComponent = ICONS[card.icon as keyof typeof ICONS];

            return (
              <motion.div
                key={card.id}
                animate={{ z: cfg.z, scale: cfg.scale, opacity: cfg.opacity }}
                transition={
                  isExiting
                    ? { duration: EXIT_MS / 1000, ease: [0.22, 1, 0.36, 1] }
                    : { type: "spring", stiffness: 120, damping: 18, mass: 1.1 }
                }
                className="absolute inset-0 rounded-[14px] p-[20px_22px] bg-surface border border-line-2 shadow-[0_8px_40px_rgba(26,23,20,0.13),0_2px_8px_rgba(26,23,20,0.07)] flex flex-col will-change-[transform,opacity]"
                style={{
                  zIndex: isExiting ? 20 : N - rank,
                  borderLeft: `3px solid ${card.accent}55`,
                  cursor: rank === 0 ? "default" : "pointer",
                }}
                onClick={() => {
                  if (rank !== 0 && exitingIdx === null) setFrontIdx(i);
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${card.accent}1c` }}
                    >
                      <IconComponent size={15} color={card.accent} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-eyebrow text-ink-3 m-0">
                        {card.label}
                      </p>
                      <p
                        className="text-[12.5px] font-bold m-0 mt-px"
                        style={{ color: card.accent }}
                      >
                        {card.tagline}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest rounded-[5px] px-1.75 py-0.75 shrink-0"
                    style={{
                      color: card.accent,
                      backgroundColor: `${card.accent}18`,
                    }}
                  >
                    {card.eyebrow}
                  </span>
                </div>

                {/* Divider */}
                <div className="h-px bg-line my-4" />

                {/* Rows */}
                <div className="flex flex-col gap-2.25 flex-1">
                  {card.rows.map((row, j) => (
                    <div key={j} className="flex items-center gap-2.5">
                      <span
                        className="w-1.25 h-1.25 rounded-full shrink-0"
                        style={{
                          backgroundColor: card.accent,
                          opacity: row.dim ? 0.25 : 0.8,
                        }}
                      />
                      <span
                        className="text-[12.5px]"
                        style={{ color: row.dim ? "#8A827A" : "#1A1714" }}
                      >
                        {row.text}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
