"use client";

import {
  motion,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";

// Tennr's hero fan: tall vertical sheets anchored at the TOP, fanning DOWN and
// RIGHT, with the amber light pooling at the bottom-right. No rotation. Front
// layers warm clay → amber and grow more opaque toward the light source.
const LAYERS = [0, 1, 2, 3, 4, 5, 6, 7]; // back → front

export default function LightFan({
  mx,
  my,
}: {
  mx: MotionValue<number>;
  my: MotionValue<number>;
}) {
  const reduce = useReducedMotion();
  const range = reduce ? 0 : 14;
  const x = useSpring(useTransform(mx, [-0.5, 0.5], [range, -range]), {
    stiffness: 120,
    damping: 20,
  });
  const y = useSpring(useTransform(my, [-0.5, 0.5], [range, -range]), {
    stiffness: 120,
    damping: 20,
  });

  return (
    // top-0 anchors the sheets at the top; they hang downward. Width is reined
    // in so the stack doesn't kiss the right browser edge.
    <motion.div
      style={{ x, y }}
      className="relative h-130 w-95"
      aria-hidden
    >
      {/* Amber glow pooled at the BOTTOM-right light source */}
      <div className="absolute bottom-4 right-16 h-72 w-72 rounded-full bg-amber/50 blur-3xl" />

      {LAYERS.map((i) => {
        const isFront = i >= 5;
        return (
          <motion.div
            key={i}
            // top-anchored tall sheet. right offset starts inset so the whole
            // fan floats away from the viewport edge.
            className={`absolute right-10 top-0 h-[460px] w-64 rounded-sm border ${
              isFront ? "border-amber/20 bg-amber" : "border-sand/15 bg-sand"
            }`}
            initial={reduce ? false : { opacity: 0, x: 0, y: 0 }}
            // Each layer steps RIGHT (+x) and DOWN (+y) → fans toward the
            // bottom-right. Positive y is the fix (was negative = up-right).
            animate={{ opacity: 0.06 + i * 0.045, x: i * 50, y: i * 50 }}
            transition={{
              delay: 0.15 + i * 0.06,
              duration: 0.7,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        );
      })}
    </motion.div>
  );
}
