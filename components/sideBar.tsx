"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Upload,
  MessageSquare,
  TrendingUp,
  Bell,
  Mic,
  Settings,
  Square,
} from "lucide-react";

type Role = "ADMIN" | "DOCTOR" | "BILLING";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "DOCTOR", "BILLING"],
  },
  {
    label: "Patients",
    href: "/patients",
    icon: Users,
    roles: ["ADMIN", "DOCTOR", "BILLING"],
  },
  { label: "Upload Data", href: "/upload", icon: Upload, roles: ["ADMIN"] },
  { label: "NL Query", href: "/query", icon: MessageSquare, roles: ["ADMIN"] },
  {
    label: "Revenue",
    href: "/revenue",
    icon: TrendingUp,
    roles: ["ADMIN", "BILLING"],
  },
  { label: "Alerts", href: "/alerts", icon: Bell, roles: ["ADMIN", "DOCTOR"] },
  {
    label: "Voice Scribe",
    href: "/scribe",
    icon: Mic,
    roles: ["ADMIN", "DOCTOR"],
  },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
] as const;

export default function Sidebar({
  name,
  email,
  role,
}: {
  name: string | null;
  email: string;
  role: string;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => i.roles.includes(role as Role));
  const displayName = name ?? email.split("@")[0];

  return (
    // Square edges, warm hairline right border, bone-white surface.
    <aside className="fixed left-0 top-0 flex h-screen w-60 flex-col border-r border-line bg-surface">
      {/* Logo — a filled square mark instead of the old leaf, on-brand for boxy. */}
      <div className="flex items-center gap-2.5 p-6">
        <Square size={18} className="fill-brand text-brand" />
        <span className="font-display text-base font-semibold tracking-tight text-ink">
          CliniqOps
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        <p className="mb-2 mt-4 px-4 text-[10px] font-semibold uppercase tracking-eyebrow text-ink-3">
          Main Menu
        </p>
        {items.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} className="relative block">
              <div
                className={`relative flex items-center gap-3 rounded-sm px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "" : "text-ink-3 hover:bg-brand-muted/50"
                }`}
              >
                {/* Sliding taupe active pill — square radius, layoutId animates
                    it between items instead of cutting. */}
                {isActive && (
                  <motion.span
                    layoutId="navActive"
                    className="absolute inset-0 rounded-sm bg-brand"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon
                  size={19}
                  className={`relative z-10 ${isActive ? "text-surface" : ""}`}
                />
                <span
                  className={`relative z-10 ${isActive ? "text-surface" : ""}`}
                >
                  {label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User block — square clay tile, hairline border. */}
      <div className="m-2 flex items-center gap-3 rounded-sm border border-line bg-brand-muted/40 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-brand text-sm font-semibold uppercase text-surface">
          {displayName.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{displayName}</p>
          <span className="mt-0.5 inline-block rounded-sm bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-eyebrow text-brand">
            {role}
          </span>
        </div>
      </div>
    </aside>
  );
}
