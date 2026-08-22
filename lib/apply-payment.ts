import "server-only";

import { revalidateTag } from "next/cache";

import { BOARD_TAG } from "@/lib/board";
import { prisma } from "@/lib/db";
import type { PaymentEvent } from "@/lib/payments";

export const PAYMENT_RESULTS = {
  APPLIED: "applied",
  DUPLICATE: "duplicate",
  UNKNOWN_CAT: "unknown_cat",
} as const;

export type PaymentResult =
  (typeof PAYMENT_RESULTS)[keyof typeof PAYMENT_RESULTS];

/**
 * Otorga el puesto. Este es el ÚNICO lugar donde una puja se hace efectiva:
 * nunca en el redirect de éxito, que el usuario puede fabricar.
 *
 * Tres garantías:
 *  1. Idempotencia por `eventId` contra ProcessedWebhook, dentro de la misma
 *     transacción — reenviar el evento no duplica nada.
 *  2. Bloqueo de fila (SELECT … FOR UPDATE) sobre el gato: va a haber pagos
 *     simultáneos apuntando al mismo puesto.
 *  3. El monto nunca baja. Si el gato subió su puja mientras el pago volaba,
 *     se queda con el mayor de los dos.
 */
export async function applyPayment(event: PaymentEvent): Promise<PaymentResult> {
  const already = await prisma.processedWebhook.findUnique({
    where: { eventId: event.eventId },
    select: { eventId: true },
  });
  if (already) return PAYMENT_RESULTS.DUPLICATE;

  const cat = await prisma.cat.findUnique({
    where: { id: event.catDraftId },
    select: { id: true },
  });
  if (!cat) return PAYMENT_RESULTS.UNKNOWN_CAT;

  try {
    await prisma.$transaction(async (tx) => {
      // La marca del evento va PRIMERO: si otro proceso ya la insertó,
      // esto revienta por clave duplicada y la transacción entera se cae.
      await tx.processedWebhook.create({
        data: { eventId: event.eventId },
      });

      const locked = await tx.$queryRaw<
        { id: string; amountCents: number; firstBidAt: Date | null; moderation: string | null }[]
      >`
        SELECT "id", "amountCents", "firstBidAt", "moderation"::text AS moderation
        FROM "Cat"
        WHERE "id" = ${event.catDraftId}
        FOR UPDATE
      `;

      const current = locked[0];
      if (!current) throw new Error("cat_vanished");

      // Nunca hacia abajo.
      const resulting = Math.max(current.amountCents, event.resultingCents);

      await tx.bid.create({
        data: {
          catId: current.id,
          amountCents: event.amountCents,
          resultingCents: resulting,
          providerRef: event.providerRef,
        },
      });

      await tx.cat.update({
        where: { id: current.id },
        data: {
          amountCents: resulting,
          firstBidAt: current.firstBidAt ?? new Date(),
          /*
            Quien paga se publica. La moderación es POSTERIOR: el control
            automático corre al subir la foto y lo que se escape se baja
            desde /admin.

            La única excepción es un REJECT: eso no es "dudoso", es que el
            control dijo que está mal. Publicarlo y esperar a que alguien
            lo reporte es exactamente el riesgo que tumba la cuenta con el
            proveedor de pagos.

            REVIEW y null (proveedor caído) sí se publican, pero quedan
            marcados y salen en la cola de revisión del panel.
          */
          status: current.moderation === "REJECT" ? "PENDING" : "LIVE",
        },
      });
    });
  } catch (error) {
    // Carrera perdida contra otro proceso con el mismo evento: ya se aplicó.
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Unique constraint") || message.includes("P2002")) {
      return PAYMENT_RESULTS.DUPLICATE;
    }
    throw error;
  }

  /**
   * `{ expire: 0 }` fuerza expiración inmediata: es el modo recomendado para
   * webhooks. Con "max" se serviría contenido viejo mientras revalida, y el
   * que acaba de pagar tiene que ver su puesto ahora, no en diez segundos.
   */
  revalidateTag(BOARD_TAG, { expire: 0 });
  return PAYMENT_RESULTS.APPLIED;
}
