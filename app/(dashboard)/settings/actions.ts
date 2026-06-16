"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import  prisma  from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import type { Role } from "@/lib/permissions";

const ROLES: Role[] = ["ADMIN", "DOCTOR", "BILLING"];
type ActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session) return null;
  if (session.user.role !== "ADMIN") return null;
  return session;
}

/* ---------------- TEAM ---------------- */

export async function createUser(
  formData: FormData,
): Promise<ActionResult<{ tempPassword: string }>> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Unauthorized" };

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "DOCTOR") as Role;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { ok: false, error: "Enter a valid email address." };
  if (!ROLES.includes(role)) return { ok: false, error: "Invalid role." };

  const clinicId = session.user.clinicId;
  const existing = await prisma.user.findFirst({ where: { email, clinicId } });
  if (existing)
    return {
      ok: false,
      error: "A user with that email already exists in this clinic.",
    };

  const tempPassword = "Welcome123!";
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const created = await prisma.user.create({
    data: {
      email,
      name,
      title,
      phone,
      role,
      clinicId,
      passwordHash,
      mustResetPassword: true,
    },
  });

  await writeAudit({
    clinicId,
    actorId: session.user.id,
    action: "USER_CREATED",
    targetType: "User",
    targetId: created.id,
    detail: `${email} as ${role}`,
  });

  revalidatePath("/settings");
  return { ok: true, tempPassword };
}

export async function updateUserRole(
  userId: string,
  role: Role,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Unauthorized" };
  if (!ROLES.includes(role)) return { ok: false, error: "Invalid role." };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.clinicId !== session.user.clinicId)
    return { ok: false, error: "User not found in your clinic." };

  if (target.role === "ADMIN" && role !== "ADMIN") {
    const adminCount = await prisma.user.count({
      where: {
        clinicId: session.user.clinicId,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    if (adminCount <= 1)
      return { ok: false, error: "Can't remove the last admin of the clinic." };
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  await writeAudit({
    clinicId: session.user.clinicId,
    actorId: session.user.id,
    action: "ROLE_CHANGED",
    targetType: "User",
    targetId: userId,
    detail: `${target.email} → ${role}`,
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function setUserStatus(
  userId: string,
  status: "ACTIVE" | "SUSPENDED",
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Unauthorized" };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.clinicId !== session.user.clinicId)
    return { ok: false, error: "User not found in your clinic." };
  if (target.id === session.user.id)
    return { ok: false, error: "You can't change your own status." };

  if (status === "SUSPENDED" && target.role === "ADMIN") {
    const activeAdmins = await prisma.user.count({
      where: {
        clinicId: session.user.clinicId,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    if (activeAdmins <= 1)
      return { ok: false, error: "Can't suspend the last active admin." };
  }

  await prisma.user.update({ where: { id: userId }, data: { status } });
  await writeAudit({
    clinicId: session.user.clinicId,
    actorId: session.user.id,
    action: status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_REACTIVATED",
    targetType: "User",
    targetId: userId,
    detail: target.email,
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function resetUserPassword(
  userId: string,
): Promise<ActionResult<{ tempPassword: string }>> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Unauthorized" };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.clinicId !== session.user.clinicId)
    return { ok: false, error: "User not found in your clinic." };

  const tempPassword = "Reset" + Math.floor(1000 + Math.random() * 9000) + "!";
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustResetPassword: true },
  });

  await writeAudit({
    clinicId: session.user.clinicId,
    actorId: session.user.id,
    action: "PASSWORD_RESET",
    targetType: "User",
    targetId: userId,
    detail: target.email,
  });

  revalidatePath("/settings");
  return { ok: true, tempPassword };
}

/* ---------------- MY ACCOUNT ---------------- */

export async function updateMyProfile(
  formData: FormData,
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };

  const name = String(formData.get("name") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name, title, phone },
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function changeMyPassword(
  formData: FormData,
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 8)
    return { ok: false, error: "New password must be at least 8 characters." };
  if (next !== confirm)
    return { ok: false, error: "New passwords don't match." };

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) return { ok: false, error: "Account not found." };

  const valid = await bcrypt.compare(current, me.passwordHash);
  if (!valid) return { ok: false, error: "Current password is incorrect." };

  const passwordHash = await bcrypt.hash(next, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash, mustResetPassword: false },
  });

  await writeAudit({
    clinicId: session.user.clinicId,
    actorId: session.user.id,
    action: "OWN_PASSWORD_CHANGED",
    targetType: "User",
    targetId: session.user.id,
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function changeMyEmail(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { ok: false, error: "Enter a valid email address." };

  const clash = await prisma.user.findFirst({
    where: {
      email,
      clinicId: session.user.clinicId,
      id: { not: session.user.id },
    },
  });
  if (clash)
    return { ok: false, error: "That email is already in use in this clinic." };

  await prisma.user.update({ where: { id: session.user.id }, data: { email } });
  await writeAudit({
    clinicId: session.user.clinicId,
    actorId: session.user.id,
    action: "OWN_EMAIL_CHANGED",
    targetType: "User",
    targetId: session.user.id,
    detail: email,
  });

  revalidatePath("/settings");
  return { ok: true };
}

/* ---------------- CLINIC PROFILE ---------------- */

export async function updateClinicProfile(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Unauthorized" };

  const name = String(formData.get("name") ?? "").trim();
  const addressLine = String(formData.get("addressLine") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const timezone = String(formData.get("timezone") ?? "Asia/Kolkata").trim();

  if (!name) return { ok: false, error: "Clinic name is required." };

  await prisma.clinic.update({
    where: { id: session.user.clinicId },
    data: { name, addressLine, city, phone, timezone },
  });

  await writeAudit({
    clinicId: session.user.clinicId,
    actorId: session.user.id,
    action: "CLINIC_PROFILE_UPDATED",
    targetType: "Clinic",
    targetId: session.user.clinicId,
  });

  revalidatePath("/settings");
  return { ok: true };
}
