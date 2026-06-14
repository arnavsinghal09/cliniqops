"use client";

import { motion } from "framer-motion";
export default function ManifestoBand() {
  return (
    <section className="relative overflow-hidden bg-brand-dk py-28 md:py-36">
      <span aria-hidden className="grain-tex opacity-[0.06]" />
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-4xl font-medium leading-[1.1] tracking-tight text-surface md:text-5xl lg:text-6xl"
        >
          Run your clinic,{" "}
          <span className="italic text-amber">not your spreadsheets.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="mx-auto mt-6 max-w-md text-[15px] text-sand/70"
        >
          The busywork runs itself, so your team spends their hours on patients
          — not tabs.
        </motion.p>
      </div>
    </section>
  );
}
