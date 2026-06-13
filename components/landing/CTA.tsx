"use client";

import Link from "next/link";
import { motion } from "framer-motion";

// Three closed paths the blob cross-fades between on a slow loop. Same point
// count so the morph interpolates cleanly.
const BLOB_PATHS = [
  "M300,180 C360,120 460,140 480,220 C500,300 420,360 340,360 C240,360 160,320 160,240 C160,160 240,240 300,180 Z",
  "M310,160 C390,130 450,170 470,240 C490,310 400,370 320,360 C230,350 150,310 170,230 C190,150 230,190 310,160 Z",
  "M300,180 C360,120 460,140 480,220 C500,300 420,360 340,360 C240,360 160,320 160,240 C160,160 240,240 300,180 Z",
];

export default function CTA() {
  return (
    <section className="relative overflow-hidden py-28">
      <svg
        aria-hidden
        viewBox="0 0 640 480"
        className="pointer-events-none absolute inset-0 -z-10 mx-auto h-full opacity-70"
      >
        <motion.path
          fill="var(--color-brand-muted)"
          initial={{ d: BLOB_PATHS[0] }}
          animate={{ d: BLOB_PATHS }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>

      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Bring your whole clinic into one calm view
        </h2>
        <p className="mx-auto mt-4 max-w-md text-ink-2">
          Set up in an afternoon. Import your existing schedule and start seeing
          the gaps today.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block rounded-ctrl bg-brand px-7 py-3 text-sm font-medium text-white transition-all hover:brightness-105 hover:-translate-y-px active:translate-y-0 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Start free
        </Link>
      </div>
    </section>
  );
}
