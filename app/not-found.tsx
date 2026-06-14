"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

export default function NotFound() {
  const reduce = useReducedMotion();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-6">
      <div className="relative z-10 w-full max-w-lg text-center">
        {/* The wandering file card */}
        <motion.div
          initial={reduce ? false : { rotate: -6, y: 0 }}
          animate={reduce ? undefined : { rotate: [-6, 4, -6], y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto mb-10 w-56"
        >
          {/* Stacked-paper: two offset cards behind a front "chart" card. */}
          <div className="relative">
            <div className="absolute left-2 top-2 h-full w-full rounded-sm border border-line-2 bg-sand/50" />
            <div className="absolute left-1 top-1 h-full w-full rounded-sm border border-line-2 bg-surface" />
            <div className="relative overflow-hidden rounded-sm border border-line bg-surface p-5 shadow-card">
              <span aria-hidden className="grain-tex" />
              <div className="relative text-left">
                <p className="text-[10px] font-semibold uppercase tracking-eyebrow text-ink-3">
                  Patient Chart
                </p>
                <p className="mt-1 font-display text-sm font-semibold text-ink">
                  No. 404
                </p>

                {/* Self-drawing flatline EKG — a vitals monitor that gave up. */}
                <svg viewBox="0 0 200 40" className="mt-3 w-full" aria-hidden>
                  <motion.path
                    d="M0 20 H70 l6 -14 l8 28 l6 -14 H120 l5 -8 l5 16 l4 -8 H200"
                    fill="none"
                    stroke="var(--color-brand)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: 2,
                      ease: [0.16, 1, 0.3, 1],
                      repeat: Infinity,
                      repeatDelay: 1,
                    }}
                  />
                </svg>

                <p className="mt-3 text-[11px] text-ink-3">Status: misfiled</p>
              </div>
            </div>
          </div>
        </motion.div>

        <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-ink-3">
          Error 404
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">
          This chart isn&apos;t on file.
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-[15px] text-ink-2">
          The page you&apos;re looking for wandered off — maybe filed under the
          wrong tab, maybe never admitted. Let&apos;s get you back to the front
          desk.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="btn-layered">
            Back to dashboard
          </Link>
          <Link
            href="/patients"
            className="rounded-sm border border-line-2 bg-surface px-5 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-sand outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Go to patients
          </Link>
        </div>
      </div>
    </main>
  );
}
