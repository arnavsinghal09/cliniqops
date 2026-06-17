export type Role = "ADMIN" | "DOCTOR" | "BILLING";

export const PERMISSIONS: Record<Role, string[]> = {
  ADMIN: [
    "/dashboard",
    "/upload",
    "/patients",
    "/query",
    "/revenue",
    "/alerts",
    "/consultations",
    "/settings",
  ],
  DOCTOR: ["/dashboard", "/patients", "/query", "/consultations", "/alerts"],
  BILLING: ["/dashboard", "/revenue", "/alerts", "/upload"],
};

export function canAccess(role: Role, pathname: string): boolean {
  const allowed = PERMISSIONS[role];
  if (!allowed) return false;
  return allowed.some((prefix) => pathname.startsWith(prefix));
}
