"use client";

import Link from "next/link";
import { Square } from "lucide-react";
import DemoLoginButton from "@/components/demo/DemoLoginButton";
import { useEffect, useState } from "react";

export default function LandingNav() {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const headerClass =
    "fixed inset-x-0 top-0 z-50 transition-all duration-300 " +
    (solid
      ? "border-b border-line bg-surface/90 backdrop-blur-md"
      : "border-b border-transparent");

  const linkClass = solid
    ? "text-sm font-medium text-ink-2 transition-colors hover:text-ink"
    : "text-sm font-medium text-sand/80 transition-colors hover:text-surface";

  return (
    <header className={headerClass}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Square
            size={18}
            className={solid ? "fill-brand text-brand" : "fill-sand text-sand"}
          />
          <span
            className={`font-display text-base font-semibold tracking-tight ${solid ? "text-ink" : "text-surface"}`}
          >
            CliniqOps
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className={linkClass}>
            Features
          </a>
          <a href="#flow" className={linkClass}>
            How it works
          </a>
          <a href="#results" className={linkClass}>
            Results
          </a>
        </div>

        <div className="flex items-center gap-3">
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            {/* your existing primary CTA, e.g. <Link href="/login">Sign in</Link> */}
            <DemoLoginButton variant="secondary" />
          </div>
          <Link
            href="/login"
            className="rounded-sm bg-sand px-4 py-2 text-sm font-semibold uppercase tracking-eyebrow text-ink transition-transform hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-sand"
          >
            Start free
          </Link>
        </div>
      </nav>
    </header>
  );
}
