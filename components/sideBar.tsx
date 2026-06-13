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
  Leaf,
} from "lucide-react";

type Role = "ADMIN" | "DOCTOR" | "BILLING";

// Each item declares which roles may see it. Doctors get Dashboard, Patients,
// Alerts, Scribe; admins get everything.
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
    <aside className="fixed left-0 top-0 flex h-screen w-60 flex-col border-r border-border-soft bg-sidebar shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-2 p-6">
        <Leaf size={20} className="text-brand" />
        <span className="text-base font-semibold text-ink">CliniqOps</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto">
        <p className="mb-2 mt-4 px-6 text-[10px] font-medium uppercase tracking-widest text-ink-4">
          Main Menu
        </p>
        {items.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} className="relative mx-2 block">
              <div
                className={`relative flex items-center gap-3 rounded-ctrl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "" : "text-ink-3 hover:bg-bg"
                }`}
              >
                {/* The green pill is a single shared element. layoutId tells
                    Framer to ANIMATE it from its old position to the new active
                    item, so it slides between links instead of cutting. */}
                {isActive && (
                  <motion.span
                    layoutId="navActive"
                    className="absolute inset-0 rounded-ctrl bg-brand"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                {/* z-10 keeps icon+label above the pill */}
                <Icon
                  size={20}
                  className={`relative z-10 ${isActive ? "text-white" : ""}`}
                />
                <span
                  className={`relative z-10 ${isActive ? "text-white" : ""}`}
                >
                  {label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User block */}
      <div className="mx-2 mb-4 flex items-center gap-3 rounded-ctrl bg-bg p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-brand text-sm font-medium uppercase text-white">
          {displayName.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{displayName}</p>
          <span className="mt-0.5 inline-block rounded-badge bg-brand-muted px-2 py-0.5 text-[10px] font-medium uppercase text-brand">
            {role}
          </span>
        </div>
      </div>
    </aside>
  );
}
