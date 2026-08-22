import "server-only";

import { PROVIDERS, siteUrl, type PaymentProvider } from "@/lib/payments-core";
import { localePath } from "@/lib/i18n/config";

/**
 * Proveedor simulado. Existe para desarrollar el embudo completo sin
 * credenciales y para probar el webhook real (idempotencia incluida).
 * Nunca debe quedar activo en producción.
 */
export const mockProvider: PaymentProvider = {
  id: PROVIDERS.MOCK,

  async createCheckout({ catDraftId, amountCents, resultingCents, locale }) {
    const params = new URLSearchParams({
      draft: catDraftId,
      monto: String(amountCents),
      total: String(resultingCents),
    });
    return { url: `${siteUrl()}${localePath(locale, "/pago-simulado")}?${params}` };
  },

  async verifyWebhook(request) {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return null;

    const data = body as Record<string, unknown>;
    if (
      typeof data.eventId !== "string" ||
      typeof data.providerRef !== "string" ||
      typeof data.catDraftId !== "string" ||
      typeof data.amountCents !== "number" ||
      typeof data.resultingCents !== "number"
    ) {
      return null;
    }

    return {
      eventId: data.eventId,
      providerRef: data.providerRef,
      catDraftId: data.catDraftId,
      amountCents: data.amountCents,
      resultingCents: data.resultingCents,
    };
  },
};
