"use client";

import Link from "next/link";
import DrawBorder from "@/components/ui-kit/DrawBorder";

export default function CTA() {
  return (
    <section className="mx-auto max-w-4xl px-6 pb-28">
      <DrawBorder radius={6}>
        <div className="relative overflow-hidden rounded-md bg-sand/50 px-8 py-16 text-center">
          <span aria-hidden className="grain-tex" />
          <div className="relative flex flex-col items-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
              Ready when you are
            </p>
            <h2 className="mt-3 max-w-sm font-display text-3xl font-semibold leading-[1.1] tracking-tight text-ink md:text-4xl">
              No backlog. No bottlenecks.{" "}
              <span className="text-brand-dk">Just flow.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[15px] text-ink-2">
              Import your existing schedule and start seeing the gaps today. Set
              up in an afternoon.
            </p>
            <div className="mt-8">
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
