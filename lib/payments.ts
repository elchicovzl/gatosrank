import "server-only";

import { activeProviderId, PROVIDERS, type PaymentProvider } from "@/lib/payments-core";
import { mockProvider } from "@/lib/payments-mock";
import { paypalProvider } from "@/lib/payments-paypal";
import { polarProvider } from "@/lib/payments-polar";

/**
 * Punto de entrada de pagos.
 *
 * NADA fuera de esta carpeta sabe qué proveedor se usa. El proyecto opera
 * desde Colombia, así que el proveedor es un merchant of record (Polar) y
 * no Stripe — pero el resto del código no debería tener que enterarse.
 */
export {
  activeProviderId,
  PROVIDERS,
  siteUrl,
  type CheckoutInput,
  type CheckoutResult,
  type PaymentEvent,
  type PaymentProvider,
  type ProviderId,
  type WebhookOutcome,
} from "@/lib/payments-core";

const REGISTRO: Record<string, PaymentProvider> = {
  [PROVIDERS.POLAR]: polarProvider,
  [PROVIDERS.PAYPAL]: paypalProvider,
  [PROVIDERS.MOCK]: mockProvider,
};

export function payments(): PaymentProvider {
  return REGISTRO[activeProviderId()] ?? mockProvider;
}
