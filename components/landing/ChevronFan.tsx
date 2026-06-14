"use client";

import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { useRef } from "react";

// 8 nested chevron/corner layers that cascade top-left → bottom-right, then
// COLLAPSE into the bottom-rightmost one as you scroll, losing their glow and
// merging into a flat clay shape. Animation is scrubbed: tied 1:1 to scroll
// progress through the pinned hero (no autoplay).
//
// Rules of hooks: we can't call useTransform inside a .map loop, so each layer
// is its own component that calls its hooks once. A fixed count (8) keeps it
// declarative and lint-clean.

const LAYER_COUNT = 8;

// Per-layer config, back (0) → front (7). Each starts offset up-and-left of the
// final collapse point and fades from maroon (back) to gold (front).
const LAYERS = Array.from({ length: LAYER_COUNT }, (_, i) => {
  const t = i / (LAYER_COUNT - 1); // 0..1 back→front
  return {
    i,
    // starting cascade offset (% of container) — spread up-left
    startX: -38 * (1 - t),
    startY: -38 * (1 - t),
    // glowing gradient: deep terracotta at back → golden at front
    glowFrom: t < 0.5 ? "#8A3A2E" : "#C56A33",
    glowTo: t < 0.5 ? "#B4533A" : "#E8A06A",
    z: i,
  };
});

function ChevronLayer({
  cfg,
  progress,
}: {
  cfg: (typeof LAYERS)[number];
  progress: MotionValue<number>;
}) {
  // As progress 0→1: each layer slides from its cascade offset to (0,0) — i.e.
  // collapses onto the bottom-right anchor shape.
  const x = useTransform(progress, [0, 1], [`${cfg.startX}%`, "0%"]);
  const y = useTransform(progress, [0, 1], [`${cfg.startY}%`, "0%"]);
  // Glow gradient fades out (0→1 opacity on the flat clay layer that sits on
  // top), so by the end every layer shows flat clay, not gradient.
  const glowOpacity = useTransform(progress, [0, 0.7], [1, 0]);
  const flatOpacity = useTransform(progress, [0.3, 1], [0, 1]);

  return (
    <motion.div style={{ x, y, zIndex: cfg.z }} className="absolute inset-0">
      {/* Chevron shape via clip-path: a thick up-right pointing corner. Same
          clip on two stacked fills — the glow (fades out) and flat clay (fades
          in) — so the layer "loses its gradient" and goes matte on scroll. */}
      <div
        className="absolute inset-0"
        style={{
          clipPath:
            "polygon(0% 35%, 65% 35%, 65% 0%, 100% 0%, 100% 100%, 0% 100%)",
        }}
      >
        {/* glowing gradient fill */}
        <motion.div
          className="absolute inset-0"
          style={{
            opacity: glowOpacity,
            background: `linear-gradient(135deg, ${cfg.glowFrom}, ${cfg.glowTo})`,
            mixBlendMode: "screen",
          }}
        />
        {/* flat clay fill (matte) that takes over by the end */}
        <motion.div
          className="absolute inset-0 bg-clay"
          style={{ opacity: flatOpacity }}
        />
      </div>
    </motion.div>
  );
}

export default function ChevronFan({
  progress,
}: {
  progress: MotionValue<number>;
}) {
  const reduce = useReducedMotion();
  // Under reduced motion, hold the merged end-state (no scrub animation).
  const staticProgress = useTransform(() => 1);
  const p = reduce ? staticProgress : progress;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* the cascade is sized to the right portion; scale via container */}
      <div className="absolute inset-0">
        {LAYERS.map((cfg) => (
          <ChevronLayer key={cfg.i} cfg={cfg} progress={p} />
        ))}
      </div>

      {/* Grain over the shapes — strengthens toward the end for the matte clay
          feel. Uses the existing per-element grain texture. */}
      <span aria-hidden className="grain-tex opacity-[0.06]" />
    </div>
  );

}
