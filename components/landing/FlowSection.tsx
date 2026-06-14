"use client";

import { useMotionValue, useReducedMotion } from "framer-motion";
import SectionLabel from "@/components/ui-kit/SectionLabel";
import FlowBoard from "./FlowBoard";

export default function FlowSection() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

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
      id="flow"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="bg-bg py-28"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-6 md:grid-cols-2">
        <SectionLabel
          eyebrow="How it works"
          title="Watch one patient move through your clinic"
          level={2}
          serif
        />
        <div className="flex justify-center md:justify-end">
          <FlowBoard tiltX={mx} tiltY={my} />
        </div>
      </div>
    </section>
  );
}
