import prisma from "@/lib/prisma";

export async function writeAudit(params: {
  clinicId: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  detail?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        clinicId: params.clinicId,
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId ?? null,
        detail: params.detail ?? null,
      },
    });
  } catch (e) {
    // Audit must never break the actual operation.
    console.error("[audit] failed to write:", e);
  }
}
