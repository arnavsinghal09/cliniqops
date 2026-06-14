"use client";

import { motion } from "framer-motion";
import { rise, stagger } from "@/lib/motion";
import SectionLabel from "@/components/ui-kit/SectionLabel";

// Fictional clinic-ops staff — clearly illustrative, not real people.
const QUOTES = [
  {
    quote:
      "We used to chase billing across three tabs. Now the unbilled list just shows up every morning and we clear it.",
    name: "Anita Rao",
    role: "Practice Manager, Sunrise Clinic",
  },
  {
    quote:
      "No-shows dropped because the front desk can finally see the day's flow without asking anyone.",
    name: "Vikram Shah",
    role: "Ops Lead, Metro Health",
  },
  {
    quote:
      "Setup took an afternoon. The schedule view alone paid for itself the first week.",
    name: "Deepa Nair",
    role: "Director, Lakeside Care",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="mx-auto max-w-6xl px-6 py-28">
      <SectionLabel
        eyebrow="Testimonials"
        title="What clinic teams say"
        level={2}
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-15%" }}
        className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3"
      >
        {QUOTES.map((q) => (
          <motion.div
            key={q.name}
            variants={rise}
            className="relative overflow-hidden rounded-md border border-line bg-surface p-7 shadow-card"
          >
            <span aria-hidden className="grain-tex" />
            <div className="relative">
              <p className="text-[15px] leading-relaxed text-ink-2">
                “{q.quote}”
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-brand-muted text-xs font-semibold uppercase text-brand">
                  {q.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{q.name}</p>
                  <p className="text-xs text-ink-3">{q.role}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
