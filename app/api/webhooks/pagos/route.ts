import { NextResponse } from "next/server";

import { applyPayment, PAYMENT_RESULTS } from "@/lib/apply-payment";
import { payments } from "@/lib/payments";

export const runtime = "nodejs";
/** Nada de caché en un webhook. */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const event = await payments().verifyWebhook(request);

  // Firma inválida o evento que no nos interesa.
  if (!event) return new NextResponse(null, { status: 400 });

  const result = await applyPayment(event);

  if (result === PAYMENT_RESULTS.UNKNOWN_CAT) {
    return NextResponse.json({ result }, { status: 404 });
  }

  // APPLIED y DUPLICATE devuelven 200: el proveedor no debe reintentar.
  return NextResponse.json({ result });
}
