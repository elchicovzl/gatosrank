import "server-only";

import type { Locale } from "@/lib/i18n/config";

/**
 * Núcleo de la capa de pagos: tipos y helpers que comparten TODOS los
 * proveedores.
 *
 * Vive aparte de `payments.ts` a propósito. Si los proveedores importaran
 * de ahí y `payments.ts` importara los proveedores, el ciclo dejaría las
 * constantes en `undefined` al inicializar el módulo.
 */

export interface CheckoutInput {
  /** Idioma desde el que se compró: el checkout tiene que volver ahí. */
  locale: Locale;
  /** Id del borrador de gato, ya guardado como PENDING. */
  catDraftId: string;
  /** Lo que se cobra AHORA (delta si es una subida de puja). */
  amountCents: number;
  /** Puja total que queda tras el pago. Viaja en la metadata. */
  resultingCents: number;
}

export interface CheckoutResult {
  url: string;
}

export interface PaymentEvent {
  /** Id del evento del proveedor. Clave de idempotencia. */
  eventId: string;
  /** Id de la transacción. Único por pago. */
  providerRef: string;
  catDraftId: string;
  amountCents: number;
  resultingCents: number;
}

/**
 * Resultado de interpretar un webhook. Distingue tres cosas que antes se
 * confundían en un `null`:
 *
 *  - `payment`: hay que otorgar el puesto.
 *  - `ack`:     evento legítimo que no otorga nada. Responde 200 para que
 *               el proveedor DEJE de reintentarlo.
 *  - `invalid`: la firma no valida. Responde 400.
 *
 * La distinción importa por las políticas de reintento: PayPal reintenta
 * 25 veces durante 3 días ante cualquier respuesta que no sea 2xx. Con un
 * solo `null` para ambos casos, cada evento que no nos interesa se
 * reintentaría durante tres días.
 */
export type WebhookOutcome =
  | { kind: "payment"; event: PaymentEvent }
  | { kind: "ack" }
  | { kind: "invalid" };

export const ACK: WebhookOutcome = { kind: "ack" };
export const INVALID: WebhookOutcome = { kind: "invalid" };

export function paymentOutcome(event: PaymentEvent): WebhookOutcome {
  return { kind: "payment", event };
}

export interface PaymentProvider {
  readonly id: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  /**
   * Verifica la firma e interpreta el evento.
   *
   * Puede tener efectos: un proveedor que necesita un paso extra para que
   * el dinero exista —PayPal exige que el comercio llame a capture— lo
   * hace acá y devuelve `ack`, porque ese paso genera después el evento
   * que sí otorga el puesto.
   */
  verifyWebhook(request: Request): Promise<WebhookOutcome>;
}

export const PROVIDERS = {
  MOCK: "mock",
  POLAR: "polar",
  PAYPAL: "paypal",
} as const;

export type ProviderId = (typeof PROVIDERS)[keyof typeof PROVIDERS];

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
    "http://localhost:3000"
  );
}

export function activeProviderId(): ProviderId {
  const configured = process.env.PAYMENTS_PROVIDER;
  if (configured === PROVIDERS.POLAR) return PROVIDERS.POLAR;
  if (configured === PROVIDERS.PAYPAL) return PROVIDERS.PAYPAL;
  return PROVIDERS.MOCK;
}
