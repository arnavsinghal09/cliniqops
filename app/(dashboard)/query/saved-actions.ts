"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export type SavedQueryItem = {
  id: string;
  question: string;
  sql: string;
  chartType: string | null;
  rowCount: number;
  createdAt: string;
};

export async function saveQuery(input: {
  question: string;
  sql: string;
  chartType: string | null;
  rowCount: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };

  const question = input.question.trim();
  if (!question || !input.sql.trim()) {
    return { ok: false, error: "Nothing to save." };
  }

  // Avoid duplicates: same question already saved by this user.
  const existing = await prisma.savedQuery.findFirst({
    where: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      question,
    },
  });
  if (existing) return { ok: false, error: "You've already saved this query." };

  await prisma.savedQuery.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      question,
      sql: input.sql,
      chartType: input.chartType,
      rowCount: input.rowCount,
    },
  });

  revalidatePath("/query");
  return { ok: true };
}

export async function deleteSavedQuery(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };

  const sq = await prisma.savedQuery.findUnique({ where: { id } });
  if (!sq || sq.clinicId !== session.user.clinicId) {
    return { ok: false, error: "Not found." };
  }

  await prisma.savedQuery.delete({ where: { id } });
  revalidatePath("/query");
  return { ok: true };
}

export async function getSavedQueries(): Promise<SavedQueryItem[]> {
  const session = await auth();
  if (!session) return [];

  const rows = await prisma.savedQuery.findMany({
    where: { clinicId: session.user.clinicId, userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return rows.map((r) => ({
    id: r.id,
    question: r.question,
    sql: r.sql,
    chartType: r.chartType,
    rowCount: r.rowCount,
    createdAt: r.createdAt.toISOString(),
  }));
}
