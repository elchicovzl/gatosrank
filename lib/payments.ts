import "server-only";

import { activeProviderId, PROVIDERS, type PaymentProvider } from "@/lib/payments-core";
import { mockProvider } from "@/lib/payments-mock";
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
} from "@/lib/payments-core";

export function payments(): PaymentProvider {
  return activeProviderId() === PROVIDERS.POLAR ? polarProvider : mockProvider;
}
