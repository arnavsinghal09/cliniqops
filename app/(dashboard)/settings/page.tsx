import { redirect } from "next/navigation";
import { auth } from "@/auth";
import  prisma  from "@/lib/prisma";
import SectionLabel from "@/components/ui-kit/SectionLabel";
import SettingsTabs from "./SettingsTabs";
import type { Role } from "@/lib/permissions";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const clinicId = session.user.clinicId;

  const [me, users, clinic, audit] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        title: true,
        phone: true,
        role: true,
      },
    }),
    isAdmin
      ? prisma.user.findMany({
          where: { clinicId },
          select: {
            id: true,
            email: true,
            name: true,
            title: true,
            phone: true,
            role: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    isAdmin
      ? prisma.clinic.findUnique({
          where: { id: clinicId },
          select: {
            name: true,
            addressLine: true,
            city: true,
            phone: true,
            timezone: true,
          },
        })
      : Promise.resolve(null),
    isAdmin
      ? prisma.auditLog.findMany({
          where: { clinicId },
          orderBy: { createdAt: "desc" },
          take: 25,
          include: { actor: { select: { email: true, name: true } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionLabel eyebrow="CLINIC SETTINGS" title="Settings" />
      <SettingsTabs
        isAdmin={isAdmin}
        currentUserId={session.user.id}
        me={{
          id: me?.id ?? session.user.id,
          email: me?.email ?? session.user.email,
          name: me?.name ?? null,
          title: me?.title ?? null,
          phone: me?.phone ?? null,
          role: (me?.role ?? session.user.role) as Role,
        }}
        users={users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        }))}
        clinic={clinic}
        audit={audit.map((a) => ({
          id: a.id,
          action: a.action,
          detail: a.detail,
          actorName: a.actor.name ?? a.actor.email,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
