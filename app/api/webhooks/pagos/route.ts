import { NextResponse } from "next/server";

import { applyPayment, PAYMENT_RESULTS } from "@/lib/apply-payment";
import { payments } from "@/lib/payments";

export const runtime = "nodejs";
/** Nada de caché en un webhook. */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const outcome = await payments().verifyWebhook(request);

  // Sólo la firma inválida merece un 400.
  if (outcome.kind === "invalid") return new NextResponse(null, { status: 400 });

  /*
    Evento legítimo que no otorga nada. Responde 200 a propósito: los
    proveedores reintentan ante cualquier respuesta que no sea 2xx —PayPal
    hasta 25 veces durante 3 días— y no tiene sentido que reintenten algo
    que ya procesamos o que nunca vamos a aceptar.
  */
  if (outcome.kind === "ack") return NextResponse.json({ result: "ack" });

  const result = await applyPayment(outcome.event);

  if (result === PAYMENT_RESULTS.UNKNOWN_CAT) {
    return NextResponse.json({ result }, { status: 404 });
  }

  // APPLIED y DUPLICATE devuelven 200: el proveedor no debe reintentar.
  return NextResponse.json({ result });
}
