"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(dashboard)/actions";
import { motion, LayoutGroup } from "framer-motion";
import { canAccess } from "@/lib/permissions";
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
    label: "Consultations",
    href: "/consultations",
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
  const items = NAV_ITEMS.filter((i) => canAccess(role, i.href));

  return (
    <LayoutGroup id="sidebar-nav">
      {items.map(({ label, href, icon: Icon }) => {
        const isActive = href === activeHref;
        const showBadge = href === "/alerts" && unreadCount > 0;
        return (
          <Link
            key={href}
            href={href}
            className="relative block"
            data-tour={
              href === "/query"
                ? "nav-query"
                : href === "/upload"
                  ? "nav-upload"
                  : href === "/consultations"
                    ? "nav-consultations"
                    : href === "/patients"
                      ? "nav-patients"
                      : href === "/revenue"
                        ? "nav-revenue"
                        : href === "/alerts"
                          ? "nav-alerts"
                          : undefined
            }
          >
            <div className="relative flex items-center gap-3 rounded-sm px-4 py-2.5 text-sm font-medium transition-colors">
              {isActive && (
                <>
                  <motion.span
                    layoutId="navActive"
                    initial={false}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 z-0 rounded-sm bg-brand"
                  />
                  <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-surface/60 z-10" />
                </>
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
    <aside className="fixed left-0 top-0 flex h-screen w-60 flex-col border-r border-line bg-linear-to-b from-surface to-bg">
      <div className="flex items-center gap-2.5 px-6 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-brand/10 ring-1 ring-brand/20">
          <Square size={14} className="fill-brand text-brand" />
        </div>
        <span className="font-display text-base font-semibold tracking-tight text-ink">
          CliniqOps
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        <div className="mb-3 mt-4 px-3">
          <div className="border-t border-dashed border-brand/20 pt-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.25 w-1.25 shrink-0 rotate-45 bg-brand/40" />
              <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-brand/45">
                Navigate
              </span>
              <span className="h-px flex-1 bg-linear-to-r from-brand/15 to-transparent" />
            </div>
          </div>
        </div>
        <NavList
          activeHref={activeHref}
          role={safeRole}
          unreadCount={unreadCount}
        />
      </nav>

      {/* User block + sign out */}
      <div className="m-2 rounded-md border border-line bg-brand-muted/50 p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-brand text-sm font-semibold uppercase text-surface ring-1 ring-brand/30">
            {displayName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">
              {displayName}
            </p>
            <span className="mt-0.5 inline-block rounded-sm bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-eyebrow text-surface">
              {role}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-sm border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-2 transition-colors hover:bg-sand hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
