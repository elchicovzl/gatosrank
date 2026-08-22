"use server";

import { prisma } from "@/lib/db";

/**
 * Reporte de un ejemplar. Sin cuenta y sin fricción a propósito:
 * el valor está en que llegue, no en quién lo mandó.
 */
export async function reportCat(catId: string, reason: string) {
  const exists = await prisma.cat.findUnique({
    where: { id: catId },
    select: { id: true },
  });
  if (!exists) return;

  await prisma.report.create({
    data: { catId, reason: reason.trim() || null },
  });
}
