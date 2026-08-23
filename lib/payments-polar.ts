import "server-only";

import { Polar } from "@polar-sh/sdk";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks.js";

import {
  ACK,
  INVALID,
  paymentOutcome,
  PROVIDERS,
  siteUrl,
  type PaymentEvent,
  type PaymentProvider,
} from "@/lib/payments-core";
import { localePath } from "@/lib/i18n/config";

/**
 * Proveedor Polar (merchant of record).
 *
 * Polar factura como vendedor registrado, cobra el IVA donde corresponde y
 * paga a la organización. Es lo que permite operar desde Colombia, donde
 * Stripe no acepta entidades.
 *
 * Configuración necesaria:
 *  - Un producto con precio "pay what you want" (mínimo $3). El monto real
 *    de cada puja se manda por `amount` en cada checkout.
 *  - Un webhook apuntando a /api/webhooks/pagos suscripto a `order.paid`.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta ${name} para operar con Polar.`);
  }
  return value;
}

let client: Polar | null = null;

function polar(): Polar {
  client ??= new Polar({
    accessToken: requireEnv("POLAR_ACCESS_TOKEN"),
    server:
      process.env.POLAR_SERVER === "production" ? "production" : "sandbox",
  });
  return client;
}

export const polarProvider: PaymentProvider = {
  id: PROVIDERS.POLAR,

  async createCheckout({ catDraftId, amountCents, resultingCents, locale }) {
    const checkout = await polar().checkouts.create({
      products: [requireEnv("POLAR_PRODUCT_ID")],
      // Precio a medida: cada puja cobra un monto distinto.
      amount: amountCents,
      successUrl: `${siteUrl()}${localePath(locale, "/listo")}?draft=${catDraftId}`,
      /**
       * La metadata es el único vínculo entre el pago y el ejemplar.
       * `resultingCents` viaja acá porque el webhook no puede recalcularlo:
       * el tablero pudo cambiar entre el checkout y la confirmación.
       */
      metadata: {
        catDraftId,
        resultingCents,
      },
    });

    return { url: checkout.url };
  },

  async verifyWebhook(request) {
    const secret = process.env.POLAR_WEBHOOK_SECRET;
    if (!secret) return INVALID;

    /**
     * La firma se calcula sobre el cuerpo CRUDO. Parsear antes de verificar
     * invalidaría la firma, así que se lee como texto.
     */
    const body = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    let event;
    try {
      event = validateEvent(body, headers, secret);
    } catch (error) {
      if (error instanceof WebhookVerificationError) return INVALID;
      throw error;
    }

    /*
      La firma ya validó: de acá en adelante el evento es legítimo aunque
      no nos sirva, así que se responde `ack` y no `invalid`. Un 400 le
      diría al proveedor que reintente algo que nunca vamos a aceptar.
    */
    if (event.type !== "order.paid") return ACK;

    const order = event.data;
    if (!order.paid) return ACK;

    const metadata = order.metadata ?? {};
    const catDraftId = metadata.catDraftId;
    const resultingCents = Number(metadata.resultingCents);

    if (typeof catDraftId !== "string" || !Number.isInteger(resultingCents)) {
      return ACK;
    }

    /**
     * `webhook-id` es el identificador único del evento en el estándar
     * Standard Webhooks. Es la clave de idempotencia: un reenvío del mismo
     * evento trae el mismo id.
     */
    const eventId = headers["webhook-id"] ?? `order_paid_${order.id}`;

    const payment: PaymentEvent = {
      eventId,
      providerRef: order.id,
      catDraftId,
      amountCents: order.totalAmount,
      resultingCents,
    };

    return paymentOutcome(payment);
  },
};
