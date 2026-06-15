"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(dashboard)/actions";
import { motion, LayoutGroup } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Upload,
  MessageSquare,
  TrendingUp,
  Bell,
  Mic,
  LogOut,
  Settings,
  Square,
} from "lucide-react";
import { memo, useMemo } from "react";

type Role = "ADMIN" | "DOCTOR" | "BILLING";

const ROLES: readonly Role[] = ["ADMIN", "DOCTOR", "BILLING"];
function isRole(r: string): r is Role {
  return (ROLES as readonly string[]).includes(r);
}

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

const NavList = memo(function NavList({
  activeHref,
  role,
  unreadCount,
}: {
  activeHref: string | null;
  role: Role;
  unreadCount: number;
}) {
  const items = NAV_ITEMS.filter((i) =>
    (i.roles as readonly Role[]).includes(role),
  );

  return (
    <LayoutGroup id="sidebar-nav">
      {items.map(({ label, href, icon: Icon }) => {
        const isActive = href === activeHref;
        const showBadge = href === "/alerts" && unreadCount > 0;
        return (
          <Link key={href} href={href} className="relative block">
            <div className="relative flex items-center gap-3 rounded-sm px-4 py-2.5 text-sm font-medium transition-colors">
              {isActive && (
                <motion.span
                  layoutId="navActive"
                  initial={false}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 z-0 rounded-sm bg-brand"
                />
              )}
              <Icon
                size={19}
                className={`relative z-10 ${isActive ? "text-surface" : "text-ink-3"}`}
              />
              <span
                className={`relative z-10 flex-1 ${isActive ? "text-surface" : "text-ink-3"}`}
              >
                {label}
              </span>
              {showBadge && (
                <span
                  className="relative z-10 inline-flex items-center justify-center"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#B4423A",
                    color: "#FBFAF7",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </LayoutGroup>
  );
});

export default function Sidebar({
  name,
  email,
  role,
  unreadCount = 0,
}: {
  name: string | null;
  email: string;
  role: string;
  unreadCount?: number;
}) {
  const pathname = usePathname();

  // Narrow the session role string to a real union; fall back to least-access.
  const safeRole: Role = isRole(role) ? role : "BILLING";

  const activeHref = useMemo(() => {
    const match = NAV_ITEMS.find(
      (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
    );
    return match?.href ?? null;
  }, [pathname]);

  const displayName = name?.trim()
    ? name
    : email
        .split("@")[0]
        .split(".")
        .map(
          (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
        )
        .join(" ");

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-60 flex-col border-r border-line bg-surface">
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
        <NavList
          activeHref={activeHref}
          role={safeRole}
          unreadCount={unreadCount}
        />
      </nav>

      {/* User block + sign out */}
      <div className="m-2 rounded-md border border-line bg-brand-muted/40 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-brand text-sm font-semibold uppercase text-surface">
            {displayName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">
              {displayName}
            </p>
            <span className="mt-0.5 inline-block rounded-sm bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-eyebrow text-brand">
              {role}
            </span>
          </div>
        </div>
        <form action={logout} className="mt-2.5">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-sm border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-2 transition-colors hover:bg-sand hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
