"use client";

import {
  motion,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";

const LAYERS = [0, 1, 2, 3, 4, 5, 6, 7]; 

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
    <motion.div
      style={{ x, y }}
      className="relative h-130 w-95"
      aria-hidden
    >
      <div className="absolute bottom-4 right-16 h-72 w-72 rounded-full bg-amber/50 blur-3xl" />

      {LAYERS.map((i) => {
        const isFront = i >= 5;
        return (
          <motion.div
            key={i}
            className={`absolute right-10 top-0 h-115 w-64 rounded-sm border ${
              isFront ? "border-amber/20 bg-amber" : "border-sand/15 bg-sand"
            }`}
            initial={reduce ? false : { opacity: 0, x: 0, y: 0 }}
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
