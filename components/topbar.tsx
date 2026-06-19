"use client";
import TakeTourButton from "@/lib/tour/TakeTourButton";

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
    <div className="flex items-center justify-between border-b border-line bg-surface/80 px-8 py-4 shadow-sm backdrop-blur-sm">
      <h1 className="font-display text-xl font-medium tracking-tight text-ink">
        {title}
      </h1>
      <div className="flex items-center gap-3">
        <TakeTourButton />
        <span className="rounded-sm bg-brand px-3 py-1 text-xs font-semibold text-surface shadow-sm">
          {clinicName}
        </span>
      </div>
    </div>
  );
}
