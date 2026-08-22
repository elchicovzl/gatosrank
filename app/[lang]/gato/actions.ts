"use server";

import { project } from "@/lib/bidding";
import { getBoardSnapshot } from "@/lib/board";
import { prisma } from "@/lib/db";
import { isValidAmount } from "@/lib/money";
import { minTargetFor } from "@/lib/bidding";
import { payments } from "@/lib/payments";
import type { Locale } from "@/lib/i18n/config";

export type RaiseResponse =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Subida de puja de un ejemplar que ya está en el catálogo.
 * Solo se cobra la DIFERENCIA contra su monto actual.
 */
export async function startRaise(
  catId: string,
  targetCents: number,
  locale: Locale,
): Promise<RaiseResponse> {
  if (!isValidAmount(targetCents)) return { ok: false, error: "amount" };

  const cat = await prisma.cat.findUnique({
    where: { id: catId },
    select: { id: true, amountCents: true, status: true },
  });

  if (!cat || cat.status !== "LIVE") return { ok: false, error: "not_live" };

  // El objetivo tiene que ser al menos su monto actual + $1.
  if (targetCents < minTargetFor(cat.amountCents)) {
    return { ok: false, error: "too_low" };
  }

  const board = await getBoardSnapshot();
  const projection = project(board, targetCents, cat.id);

  if (projection.chargeCents <= 0) return { ok: false, error: "too_low" };

  try {
    const checkout = await payments().createCheckout({
      catDraftId: cat.id,
      amountCents: projection.chargeCents,
      resultingCents: projection.resultingCents,
      locale,
    });
    return { ok: true, url: checkout.url };
  } catch {
    return { ok: false, error: "checkout" };
  }
}
