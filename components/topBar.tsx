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
    <div className="flex items-center justify-between px-8 pt-6">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <span className="bg-brand-muted text-brand text-xs font-medium px-3 py-1 rounded-full">
        {clinicName}
      </span>
    </div>
  );
}
