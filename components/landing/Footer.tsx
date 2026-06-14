import Link from "next/link";
import { Square } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <Link href="/" className="flex items-center gap-2.5">
          <Square size={18} className="fill-brand text-brand" />
          <span className="font-display font-semibold tracking-tight text-ink">
            CliniqOps
          </span>
        </Link>
        <p className="text-xs text-ink-3">
          © {new Date().getFullYear()} CliniqOps. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
