"use client";

import Link from "next/link";
import DrawBorder from "@/components/ui-kit/DrawBorder";
import SectionLabel from "@/components/ui-kit/SectionLabel";

export default function CTA() {
  // Calm closing band: a single self-drawing framed box on sand, centered.
  return (
    <section className="mx-auto max-w-4xl px-6 pb-28">
      <DrawBorder radius={6}>
        <div className="relative overflow-hidden rounded-md bg-sand/50 px-8 py-16 text-center">
          <span aria-hidden className="grain-tex" />
          <div className="relative">
            <SectionLabel
              eyebrow="Let's work together"
              title="No backlog, no bottlenecks — just flow"
              level={2}
              align="center"
            />
            <p className="mx-auto mt-4 max-w-md text-[15px] text-ink-2">
              Import your existing schedule and start seeing the gaps today. Set
              up in an afternoon.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/login" className="btn-layered">
                Start free
              </Link>
            </div>
          </div>
        </div>
      </DrawBorder>
    </section>
  );
}
