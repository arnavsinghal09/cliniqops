"use client";

import Link from "next/link";
import { Leaf } from "lucide-react";
import { useEffect, useState } from "react";

export default function LandingNav() {
  // Toggle solid background once the user scrolls past the hero's top band.
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 80);
    onScroll(); // set correct state on mount (e.g. refresh mid-page)
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        solid ? "bg-surface/80 shadow-card backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Leaf className="text-brand" size={22} />
          <span className="text-lg font-semibold text-ink">CliniqOps</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-ctrl px-4 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-bg outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="rounded-ctrl bg-brand px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-105 hover:-translate-y-px outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Start free
          </Link>
        </div>
      </nav>
    </header>
  );
}
