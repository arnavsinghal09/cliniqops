"use client";

import { motion } from "framer-motion";
import { rise, stagger } from "@/lib/motion";
import SectionLabel from "@/components/ui-kit/SectionLabel";
import DrawBorder from "@/components/ui-kit/DrawBorder";
import { CalendarClock, ReceiptText, Users } from "lucide-react";

const FEATURES = [
  {
    icon: CalendarClock,
    title: "See today's flow at a glance",
    body: "Live status on every appointment · booked, arrived, completed, no-show · so the front desk stops refreshing three systems to answer one question.",
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
    <section id="features" className="mx-auto max-w-6xl px-6 py-28">
      <SectionLabel
        eyebrow="What you get"
        title="Everything in one operational view"
        level={2}
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-15%" }}
        className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3"
      >
        {FEATURES.map((f) => (
          <motion.div key={f.title} variants={rise} className="relative">
            <div
              aria-hidden
              className="absolute left-1.5 top-1.5 h-full w-full rounded-md border border-line-2 bg-sand/50"
            />
            <DrawBorder radius={6} className="relative">
              <div className="relative overflow-hidden rounded-md bg-surface p-7">
                <span aria-hidden className="grain-tex" />
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-brand-muted">
                    <f.icon className="text-brand" size={22} />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold tracking-tight text-ink">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">
                    {f.body}
                  </p>
                </div>
              </div>
            </DrawBorder>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
