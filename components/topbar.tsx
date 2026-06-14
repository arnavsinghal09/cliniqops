"use client";

import { usePathname } from "next/navigation";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/patients": "Patients",
  "/upload": "Upload Data",
  "/query": "NL Query",
  "/revenue": "Revenue",
  "/alerts": "Alerts",
  "/scribe": "Voice Scribe",
  "/settings": "Settings",
};

export default function TopBar({ clinicName }: { clinicName: string }) {
  const pathname = usePathname();
  const title =
    TITLES[pathname] ??
    Object.entries(TITLES).find(([href]) => pathname.startsWith(href))?.[1] ??
    "Dashboard";

  return (
    <div className="flex items-center justify-between border-b border-line px-8 py-5">
      <h1 className="font-display text-xl font-semibold tracking-tight text-ink">
        {title}
      </h1>
      <span className="rounded-sm border border-line bg-brand-muted/50 px-3 py-1 text-xs font-medium text-brand">
        {clinicName}
      </span>
    </div>
  );
}
