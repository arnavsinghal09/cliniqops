"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

// Live, URL-synced filters. Status change applies immediately; search debounces
// 300ms. Every change resets page to 1. useTransition keeps the input
// responsive while the server re-renders the table.
export default function PatientFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local mirror of the search box so typing feels instant.
  const [search, setSearch] = useState(params.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Push a param patch into the URL (replace = no history spam), reset page.
  function apply(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page"); // any filter change returns to page 1
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  function onStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    apply({ status: e.target.value === "ALL" ? "" : e.target.value });
  }

  // Debounce the text input so we don't refetch on every keystroke.
  function onSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => apply({ search: v }), 300);
  }

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface px-4 py-3 shadow-card">
      <label className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-eyebrow text-ink-3">
          Status
        </span>
        <select
          defaultValue={params.get("status") ?? "ALL"}
          onChange={onStatusChange}
          className="rounded-sm border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <option value="ALL">All</option>
          <option value="RED">Red</option>
          <option value="AMBER">Amber</option>
          <option value="GREEN">Green</option>
        </select>
      </label>

      <input
        type="text"
        value={search}
        onChange={onSearchChange}
        placeholder="Search by name…"
        className="min-w-50 flex-1 rounded-sm border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none focus-visible:ring-2 focus-visible:ring-brand"
      />

      {/* Subtle pending hint — no layout shift (fixed width). */}
      <span className="w-16 text-right text-[11px] text-ink-3">
        {isPending ? "Updating…" : ""}
      </span>
    </div>
  );
}
