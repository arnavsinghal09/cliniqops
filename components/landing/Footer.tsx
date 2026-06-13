import Link from "next/link";
import { Leaf } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border-soft bg-surface py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <Link href="/" className="flex items-center gap-2">
          <Leaf className="text-brand" size={20} />
          <span className="font-semibold text-ink">CliniqOps</span>
        </Link>
        <p className="text-xs text-ink-4">
          © {new Date().getFullYear()} CliniqOps. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
