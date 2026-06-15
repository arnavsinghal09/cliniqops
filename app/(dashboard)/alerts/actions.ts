"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function markAllAlertsRead() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  await prisma.alert.updateMany({
    where: { clinicId: session.user.clinicId, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/alerts");
}
