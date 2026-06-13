"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { stagger, wordReveal } from "@/lib/motion";
import HeroPoster from "./HeroPoster";

// Lazy-load the 3D scene: ssr:false keeps three/WebGL out of the server render,
// and the poster shows instantly so the canvas never blocks first paint / LCP.
const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => <HeroPoster />,
});

const HEADLINE = [
  "Every",
  "appointment,",
  "claim,",
  "and",
  "shift",
  "—",
  "in",
  "one",
  "calm",
  "view.",
];

export default function Hero() {
  const reduce = useReducedMotion();
  // Only mount the WebGL canvas on a real desktop viewport with motion allowed.
  // Mobile + reduced-motion get the static poster instead (perf + a11y).
  const [showCanvas, setShowCanvas] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setShowCanvas(mq.matches && !reduce);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [reduce]);

  return (
    <section className="relative overflow-hidden pt-32 pb-20">
      {/* Animated gradient mesh — slow drift, low opacity, sits behind content */}
      <div
        aria-hidden
        className="animate-drift pointer-events-none absolute -top-1/3 left-1/2 -z-10 h-[140%] w-[140%] -translate-x-1/2 opacity-60"
        style={{
          background:
            "radial-gradient(40% 40% at 30% 30%, #E8F5EE 0%, transparent 70%), radial-gradient(35% 35% at 75% 40%, #DCEFE4 0%, transparent 70%)",
        }}
      />
      {/* Grain overlay — the cheapest "not AI-generated" signal. SVG turbulence. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.035]"
      >
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="2"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 md:grid-cols-2">
        {/* Left: copy */}
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-light">
            Run your clinic, not your spreadsheets
          </p>

          {/* Headline: each word rises out of an overflow-hidden mask, staggered.
              This is the single high-impact type moment — used once, here only. */}
          <motion.h1
            variants={stagger}
            initial="hidden"
            animate="show"
            className="mt-4 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink md:text-5xl lg:text-[56px]"
          >
            {HEADLINE.map((word, i) => (
              <span
                key={i}
                className="inline-block overflow-hidden align-bottom"
              >
                <motion.span
                  variants={wordReveal}
                  className="mr-[0.25em] inline-block"
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-5 max-w-md text-base text-ink-2"
          >
            CliniqOps gives front-desk and ops teams live patient flow, billing
            status, and staffing in a single dashboard. Less chasing, fewer
            no-shows.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link
              href="/login"
              className="rounded-ctrl bg-brand px-6 py-3 text-sm font-medium text-white transition-all hover:brightness-105 hover:-translate-y-px active:translate-y-0 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Start free
            </Link>
            <Link
              href="/login"
              className="rounded-ctrl border border-border bg-surface px-6 py-3 text-sm font-medium text-ink-2 transition-colors hover:bg-bg outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Book a demo
            </Link>
          </motion.div>
        </div>

        {/* Right: the 3D signature (or static poster) */}
        <div className="relative h-90 md:h-115">
          {showCanvas ? <HeroScene /> : <HeroPoster />}
        </div>
      </div>
    </section>
  );
}
