"use client";

import { motion } from "framer-motion";
import { easeExpo, rise, stagger } from "@/lib/motion";
import { CalendarClock, ReceiptText, Users } from "lucide-react";

const FEATURES = [
  {
    icon: CalendarClock,
    title: "See today's flow at a glance",
    body: "Live status on every appointment — booked, arrived, completed, no-show — so the front desk stops refreshing three systems to answer one question.",
  },
  {
    icon: ReceiptText,
    title: "Catch unbilled visits before they age out",
    body: "Completed visits with no CPT code surface automatically. Recover revenue that quietly slips through the cracks every month.",
  },
  {
    icon: Users,
    title: "Balance the schedule across your team",
    body: "Spot which clinicians are overbooked and where the gaps are, then rebalance before burnout or idle chairs cost you.",
  },
];

export default function Features() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      {/* Feature 1 paired with an animated line-draw SVG */}
      <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
        <motion.div
          variants={rise}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-15%" }}
        >
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
            {FEATURES[0].title}
          </h2>
          <p className="mt-4 max-w-md text-ink-2">{FEATURES[0].body}</p>
        </motion.div>

        <motion.svg
          viewBox="0 0 320 200"
          className="w-full"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-15%" }}
        >
          {/* pathLength animates 0→1 as it enters view, "drawing" the line. */}
          <motion.path
            d="M10 150 C 70 150, 70 60, 130 60 S 200 140, 250 80 S 300 40, 310 40"
            fill="none"
            stroke="#4CAF7D"
            strokeWidth="3"
            strokeLinecap="round"
            variants={{
              hidden: { pathLength: 0, opacity: 0 },
              show: {
                pathLength: 1,
                opacity: 1,
                transition: { duration: 1.2, ease: easeExpo },
              },
            }}
          />
          <line
            x1="10"
            y1="180"
            x2="310"
            y2="180"
            stroke="#F3F4F6"
            strokeWidth="2"
          />
        </motion.svg>
      </div>

      {/* Features 2 & 3 as quiet staggered cards */}
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-15%" }}
        className="mt-20 grid grid-cols-1 gap-5 md:grid-cols-2"
      >
        {FEATURES.slice(1).map((f) => (
          <motion.div
            key={f.title}
            variants={rise}
            className="rounded-card border border-border-soft bg-surface p-7 shadow-card transition-transform duration-150 hover:-translate-y-0.5"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-ctrl bg-brand-muted">
              <f.icon className="text-brand" size={22} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-ink">{f.title}</h3>
            <p className="mt-2 text-sm text-ink-2">{f.body}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
