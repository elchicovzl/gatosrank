import "server-only";

import {
  ACK,
  INVALID,
  paymentOutcome,
  PROVIDERS,
  siteUrl,
  type PaymentProvider,
  type WebhookOutcome,
} from "@/lib/payments-core";
import { localePath } from "@/lib/i18n/config";

/**
 * Proveedor PayPal (Orders v2).
 *
 * A diferencia de un merchant of record, acá el vendedor legal sos vos:
 * PayPal sólo procesa. El IVA y la facturación quedan de tu lado.
 *
 * Y hay una diferencia de flujo que define todo este archivo: **PayPal no
 * cobra solo**. El comprador aprueba, y recién cuando el comercio llama a
 * `capture` existe el dinero. Por eso se escuchan DOS eventos con trabajos
 * distintos:
 *
 *   CHECKOUT.ORDER.APPROVED    -> aprobó, todavía no hay plata: capturamos.
 *   PAYMENT.CAPTURE.COMPLETED  -> la plata se cobró: se otorga el puesto.
 *
 * Otorgar el puesto con APPROVED sería otorgarlo antes de cobrar, que es
 * exactamente lo que todo el diseño evita. Y capturar desde el webhook
 * —además de hacerlo en el retorno— cubre a quien aprueba y cierra la
 * pestaña: sin eso, el pago nunca se completa y el borrador queda colgado.
 *
 * Configuración necesaria:
 *  - App REST en developer.paypal.com -> client id y secret.
 *  - Un webhook apuntando a /api/webhooks/pagos suscripto a esos dos
 *    eventos. Su id va en PAYPAL_WEBHOOK_ID: la verificación lo exige.
 */

const HOSTS = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
} as const;

const EVENTS = {
  APPROVED: "CHECKOUT.ORDER.APPROVED",
  CAPTURED: "PAYMENT.CAPTURE.COMPLETED",
} as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name} para operar con PayPal.`);
  return value;
}

function apiBase(): string {
  return process.env.PAYPAL_ENV === "live" ? HOSTS.live : HOSTS.sandbox;
}

/* -------------------------------------------------------------------------
   Autenticación
   ------------------------------------------------------------------------- */

interface CachedToken {
  value: string;
  expiresAt: number;
}

let token: CachedToken | null = null;

/** Margen antes del vencimiento: un token que expira en vuelo es un 401. */
const TOKEN_MARGIN_MS = 60_000;

async function accessToken(): Promise<string> {
  if (token && Date.now() < token.expiresAt - TOKEN_MARGIN_MS) {
    return token.value;
  }

  const basic = Buffer.from(
    `${requireEnv("PAYPAL_CLIENT_ID")}:${requireEnv("PAYPAL_SECRET")}`,
  ).toString("base64");

  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`PayPal rechazó las credenciales (HTTP ${res.status})`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  token = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return token.value;
}

async function api<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PayPal ${path} respondió ${res.status}: ${text.slice(0, 300)}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

/* -------------------------------------------------------------------------
   Montos
   ------------------------------------------------------------------------- */

/**
 * PayPal maneja los montos como cadenas decimales ("413.00"). Convertir con
 * `parseFloat(v) * 100` introduce el error de coma flotante justo donde no
 * se puede: 4.13 * 100 da 412.99999999999994. Se parte por el punto y se
 * hace aritmética entera.
 */
function toCents(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const enteros = Number(match[1]);
  const decimales = (match[2] ?? "").padEnd(2, "0");
  return enteros * 100 + Number(decimales);
}

function toAmountString(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------
   Metadata
   ------------------------------------------------------------------------- */

/**
 * `custom_id` es el único vínculo entre el pago y el ejemplar, y PayPal lo
 * limita a 127 caracteres, así que van los dos datos en una sola cadena.
 * `resultingCents` viaja acá porque el webhook no puede recalcularlo: el
 * tablero pudo moverse entre el checkout y la confirmación.
 */
function packCustomId(catDraftId: string, resultingCents: number): string {
  return `${catDraftId}:${resultingCents}`;
}

function unpackCustomId(
  raw: unknown,
): { catDraftId: string; resultingCents: number } | null {
  if (typeof raw !== "string") return null;
  const corte = raw.lastIndexOf(":");
  if (corte <= 0) return null;

  const catDraftId = raw.slice(0, corte);
  const resultingCents = Number(raw.slice(corte + 1));
  if (!catDraftId || !Number.isInteger(resultingCents)) return null;

  return { catDraftId, resultingCents };
}

/* -------------------------------------------------------------------------
   Verificación de firma
   ------------------------------------------------------------------------- */

interface VerifyResponse {
  verification_status: "SUCCESS" | "FAILURE";
}

/**
 * Verificación por postback contra PayPal.
 *
 * Existe también un método local (CRC32 del cuerpo + RSA contra el
 * certificado de `paypal-cert-url`). NO se usa a propósito: obliga a
 * validar a mano que esa URL sea de PayPal, y la documentación no lo
 * advierte. Si no se valida, cualquiera manda un webhook falso apuntando
 * el certificado a su propio servidor, lo firma con su clave, y se lleva
 * el puesto #1 gratis. Acá la criptografía la hace PayPal.
 *
 * El costo es una llamada extra por webhook. Es barato al lado de que el
 * endpoint que reparte puestos pagos acepte firmas fabricadas.
 */
async function firmaValida(
  rawBody: string,
  headers: Headers,
): Promise<boolean> {
  const requeridas = [
    "paypal-transmission-id",
    "paypal-transmission-time",
    "paypal-transmission-sig",
    "paypal-cert-url",
    "paypal-auth-algo",
  ];

  const h: Record<string, string> = {};
  for (const nombre of requeridas) {
    const valor = headers.get(nombre);
    if (!valor) return false;
    h[nombre] = valor;
  }

  /*
    El cuerpo se inyecta CRUDO por concatenación de cadenas. PayPal avisa:
    "It is essential that the webhook_event data be posted back exactly as
    it was received, with no deviations in formatting or content of any
    kind." Armar este objeto con JSON.stringify reserializaría el evento
    —cambiando espacios, orden de claves o escapes— y la verificación
    fallaría de formas difíciles de diagnosticar.
  */
  const cuerpo =
    "{" +
    [
      `"transmission_id":${JSON.stringify(h["paypal-transmission-id"])}`,
      `"transmission_time":${JSON.stringify(h["paypal-transmission-time"])}`,
      `"cert_url":${JSON.stringify(h["paypal-cert-url"])}`,
      `"auth_algo":${JSON.stringify(h["paypal-auth-algo"])}`,
      `"transmission_sig":${JSON.stringify(h["paypal-transmission-sig"])}`,
      `"webhook_id":${JSON.stringify(requireEnv("PAYPAL_WEBHOOK_ID"))}`,
      `"webhook_event":${rawBody}`,
    ].join(",") +
    "}";

  const data = await api<VerifyResponse>(
    "/v1/notifications/verify-webhook-signature",
    { method: "POST", body: cuerpo },
  );

  return data.verification_status === "SUCCESS";
}

/* -------------------------------------------------------------------------
   Captura
   ------------------------------------------------------------------------- */

/** PayPal usa este código cuando la orden ya fue capturada. */
const YA_CAPTURADA = "ORDER_ALREADY_CAPTURED";

/**
 * Captura una orden aprobada. Idempotente a propósito: si ya estaba
 * capturada no es un error, es el resultado que buscábamos. Sin esto, un
 * reenvío del evento APPROVED —PayPal reintenta 25 veces— dejaría el
 * webhook fallando para siempre sobre una orden que ya se cobró.
 */
export async function captureOrder(orderId: string): Promise<void> {
  try {
    await api(`/v2/checkout/orders/${orderId}/capture`, { method: "POST" });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "";
    if (mensaje.includes(YA_CAPTURADA)) return;
    throw error;
  }
}

/* -------------------------------------------------------------------------
   Proveedor
   ------------------------------------------------------------------------- */

interface OrderResponse {
  id: string;
  links?: { rel: string; href: string }[];
}

export const paypalProvider: PaymentProvider = {
  id: PROVIDERS.PAYPAL,

  async createCheckout({ catDraftId, amountCents, resultingCents, locale }) {
    const volver = `${siteUrl()}${localePath(locale, "/listo")}?draft=${catDraftId}`;

    const order = await api<OrderResponse>("/v2/checkout/orders", {
      method: "POST",
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: "USD", value: toAmountString(amountCents) },
            custom_id: packCustomId(catDraftId, resultingCents),
          },
        ],
        /*
          PRIMERO A COMPROBAR EN SANDBOX, antes que cualquier otra cosa:
          ¿esta orden le ofrece pagar con TARJETA a quien no tiene cuenta
          de PayPal, o lo manda derecho al muro de login?

          Fijar `payment_source.paypal` puede estar restringiendo el pago a
          la billetera. La documentación del API no expone los valores de
          `landing_page` ni explica la diferencia contra omitir
          `payment_source`, así que no se toca a ciegas: se prueba, se mira
          qué pantalla aparece, y recién ahí se ajusta.

          Importa más que el resto de la integración. El producto es una
          compra por impulso: si le pedimos cuenta a quien sólo quería
          poner su gato en el #1, lo perdimos. Y ojo: aunque esto quede
          bien, PayPal decide por comprador si muestra el pago como
          invitado —según historial, cookies, ubicación y riesgo— así que
          hay que tener "PayPal Account Optional" prendido en la cuenta.
        */
        payment_source: {
          paypal: {
            experience_context: {
              return_url: volver,
              cancel_url: `${siteUrl()}${localePath(locale, "/entrar")}`,
              user_action: "PAY_NOW",
              shipping_preference: "NO_SHIPPING",
            },
          },
        },
      }),
    });

    const aprobar = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve");
    if (!aprobar) {
      throw new Error("PayPal no devolvió enlace de aprobación");
    }
    return { url: aprobar.href };
  },

  async verifyWebhook(request): Promise<WebhookOutcome> {
    const rawBody = await request.text();

    if (!(await firmaValida(rawBody, request.headers))) return INVALID;

    /*
      De acá en adelante el evento es legítimo. Cualquier cosa que no
      podamos aprovechar se responde con `ack`: un 400 haría que PayPal
      reintente 25 veces durante 3 días algo que nunca vamos a aceptar.
    */
    const evento = JSON.parse(rawBody) as {
      id?: string;
      event_type?: string;
      resource?: Record<string, unknown>;
    };

    const recurso = evento.resource ?? {};

    if (evento.event_type === EVENTS.APPROVED) {
      /*
        Todavía no hay dinero. Se captura acá —no sólo en el retorno del
        navegador— para cubrir a quien aprueba y cierra la pestaña. La
        captura dispara PAYMENT.CAPTURE.COMPLETED, y ESE otorga el puesto.

        Si la captura falla se deja propagar: la ruta responde 500, PayPal
        reintenta y se vuelve a intentar. Tragarse el error dejaría un pago
        aprobado que nunca se cobra.
      */
      const orderId = recurso.id;
      if (typeof orderId === "string") await captureOrder(orderId);
      return ACK;
    }

    if (evento.event_type !== EVENTS.CAPTURED) return ACK;

    const meta = unpackCustomId(recurso.custom_id);
    if (!meta) return ACK;

    const monto = (recurso.amount ?? {}) as { value?: unknown };
    const amountCents =
      typeof monto.value === "string" ? toCents(monto.value) : null;
    if (amountCents === null) return ACK;

    const providerRef = recurso.id;
    if (typeof providerRef !== "string") return ACK;

    /*
      El id del EVENTO es la clave de idempotencia, no el de la captura: un
      reenvío del mismo evento trae el mismo id, y eso es lo que el libro
      de webhooks necesita reconocer.
    */
    if (typeof evento.id !== "string") return ACK;

    return paymentOutcome({
      eventId: evento.id,
      providerRef,
      catDraftId: meta.catDraftId,
      amountCents,
      resultingCents: meta.resultingCents,
    });
  },
};
