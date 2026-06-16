export type Role = "ADMIN" | "DOCTOR" | "BILLING";

export const PERMISSIONS: Record<Role, string[]> = {
  ADMIN: [
    "/dashboard",
    "/upload",
    "/patients",
    "/query",
    "/revenue",
    "/alerts",
    "/scribe",
    "/settings",
  ],
  DOCTOR: ["/dashboard", "/patients", "/query", "/scribe", "/alerts"],
  BILLING: ["/dashboard", "/revenue", "/alerts", "/upload"],
};

export function canAccess(role: Role, pathname: string): boolean {
  const allowed = PERMISSIONS[role];
  if (!allowed) return false;
  return allowed.some((prefix) => pathname.startsWith(prefix));
}
