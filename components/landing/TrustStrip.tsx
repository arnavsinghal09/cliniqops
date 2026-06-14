"use client";

import { motion } from "framer-motion";
import { stagger, rise } from "@/lib/motion";

const CLINICS = [
  "Sunrise Clinic",
  "Metro Health",
  "Lakeside Care",
  "Northwind Medical",
  "Cedar Family Practice",
];

export default function TrustStrip() {
  return (
    <section className="border-y border-line bg-surface py-10">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-[11px] font-semibold uppercase tracking-eyebrow text-ink-3">
          Trusted by clinic operations teams
        </p>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-15%" }}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
        >
          {CLINICS.map((c) => (
            <motion.span
              key={c}
              variants={rise}
              className="font-display text-sm font-medium tracking-tight text-ink-3"
            >
              {c}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
