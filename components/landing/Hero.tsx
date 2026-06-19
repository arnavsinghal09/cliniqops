"use client";
import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { stagger, wordReveal } from "@/lib/motion";
import LayeredCardStack from "./LayeredCards";

const HEADLINE = ["Move", "every", "patient", "forward."];

export default function Hero() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const fanOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const fanY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onPointerLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <section
      ref={sectionRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative flex min-h-svh items-center overflow-hidden bg-clay pt-24"
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-[1fr_360px] md:gap-16 lg:gap-20">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-sand/70">
            Patient flow · Billing · Staffing
          </p>

          <motion.h1
            variants={stagger}
            initial="hidden"
            animate="show"
            className="mt-5 font-serif text-5xl font-medium leading-[1.04] text-surface md:text-6xl lg:text-[4.25rem]"
          >
            {HEADLINE.map((w, i) => (
              <span
                key={i}
                className="inline-block overflow-hidden align-bottom"
              >
                <motion.span
                  variants={wordReveal}
                  className="mr-[0.22em] inline-block"
                >
                  {w}
                </motion.span>
              </span>
            ))}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="mt-6 max-w-md text-[15px] leading-relaxed text-sand/85"
          >
            CliniqOps shows front-desk and ops teams live patient flow, billing
            status, and staffing in one calm view. Less chasing, fewer no-shows.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <Link
              href="/login"
              className="rounded-sm bg-sand px-6 py-3 text-sm font-semibold uppercase tracking-eyebrow text-ink transition-transform hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-sand focus-visible:ring-offset-2 focus-visible:ring-offset-clay"
            >
              Start free
            </Link>
            <Link
              href="/login"
              className="rounded-sm border border-sand/40 px-6 py-3 text-sm font-semibold uppercase tracking-eyebrow text-sand transition-colors hover:bg-sand/10 outline-none focus-visible:ring-2 focus-visible:ring-sand"
            >
              Book a demo
            </Link>
          </motion.div>
        </div>

        <motion.div
          style={{ opacity: fanOpacity, y: fanY }}
          className="flex items-center justify-center"
        >
          <LayeredCardStack/>
        </motion.div>
      </div>

      <div className="absolute inset-x-0 bottom-6 flex justify-center">
        <span className="text-[11px] font-semibold uppercase tracking-eyebrow text-sand/60">
          Scroll
        </span>
      </div>
    </section>
  );
}
