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

export interface PaymentProvider {
  readonly id: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  /** Devuelve null si la firma no valida o el evento no interesa. */
  verifyWebhook(request: Request): Promise<PaymentEvent | null>;
}

export const PROVIDERS = {
  MOCK: "mock",
  POLAR: "polar",
} as const;

export type ProviderId = (typeof PROVIDERS)[keyof typeof PROVIDERS];

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
    "http://localhost:3000"
  );
}

export function activeProviderId(): ProviderId {
  return process.env.PAYMENTS_PROVIDER === PROVIDERS.POLAR
    ? PROVIDERS.POLAR
    : PROVIDERS.MOCK;
}
