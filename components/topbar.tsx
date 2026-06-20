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
    <div className="relative flex items-center justify-between border-b border-line bg-surface/80 px-8 backdrop-blur-sm">
      {/* Top accent gradient */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-linear-to-r from-transparent via-brand/30 to-transparent" />

      {/* Left: page title */}
      <div className="flex items-center gap-3 py-[18px]">
        <span className="h-5 w-[3px] rounded-full bg-brand/55" />
        <h1 className="font-display text-lg font-semibold tracking-tight text-ink">
          {title}
        </h1>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 py-[18px]">
        <TakeTourButton />
        <div className="mx-1 h-4 w-px bg-line-2" />
        <div className="flex items-center gap-1.5 rounded-sm bg-brand/8 px-2.5 py-1.5 ring-1 ring-inset ring-brand/15">
          <span className="h-1.5 w-1.5 rounded-full bg-brand/55" />
          <span className="text-[11px] font-semibold tracking-[0.03em] text-brand">
            {clinicName}
          </span>
        </div>
      </div>
    </div>
  );
}
