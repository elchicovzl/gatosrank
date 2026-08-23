import "server-only";

import { createVerify } from "node:crypto";

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

/** PayPal sólo firma con este algoritmo. Cualquier otro se rechaza. */
const ALGORITMO = "SHA256withRSA";

/**
 * Tabla CRC32 estándar. PayPal firma sobre el checksum del cuerpo crudo,
 * y Node no trae CRC32.
 */
const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabla[i] = c >>> 0;
  }
  return tabla;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = TABLA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * El certificado tiene que venir de PayPal y de nadie más.
 *
 * ESTA es la validación que la documentación de PayPal NO menciona, y sin
 * ella el método local no vale nada: quien quiera un puesto gratis manda
 * un webhook apuntando `paypal-cert-url` a su propio servidor, lo firma
 * con su clave, y la verificación da bien.
 *
 * `endsWith(".paypal.com")` deja afuera a `evil-paypal.com`, que termina
 * en "-paypal.com" y no en ".paypal.com".
 */
function certUrlConfiable(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (host !== "paypal.com" && !host.endsWith(".paypal.com")) return null;
  return url;
}

/** Los certificados rotan poco: se cachean por URL. */
const certificados = new Map<string, string>();

async function certificado(url: URL): Promise<string> {
  const cacheado = certificados.get(url.href);
  if (cacheado) return cacheado;

  const res = await fetch(url.href);
  if (!res.ok) throw new Error(`No se pudo bajar el certificado (${res.status})`);

  const pem = await res.text();
  certificados.set(url.href, pem);
  return pem;
}

/**
 * Verificación LOCAL de la firma.
 *
 * Existe un método por postback contra PayPal
 * (/v1/notifications/verify-webhook-signature) y era el que estaba acá
 * antes. Se descartó con evidencia: en SANDBOX devuelve
 * `{"verification_status":"SUCCESS"}` ante una firma inventada, un
 * transmission id inventado y un cert_url inexistente. O sea que sella
 * cualquier falsificación y, peor, hace imposible probar que rechazamos
 * las falsas — el test daría verde siempre.
 *
 * Acá la cuenta la hacemos nosotros, así que se puede probar de verdad:
 * cert_url ajeno, cuerpo alterado y firma inventada se rechazan de forma
 * determinista, sin depender de que el proveedor opine bien.
 */
async function firmaValida(rawBody: string, headers: Headers): Promise<boolean> {
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const firma = headers.get("paypal-transmission-sig");
  const certUrlRaw = headers.get("paypal-cert-url");
  const algoritmo = headers.get("paypal-auth-algo");

  if (!transmissionId || !transmissionTime || !firma || !certUrlRaw) return false;
  if (algoritmo !== ALGORITMO) return false;

  const certUrl = certUrlConfiable(certUrlRaw);
  if (!certUrl) return false;

  /*
    Sobre el cuerpo CRUDO. PayPal avisa: "You must use the original raw
    body to calculate this; do not parse the body to an array/object and
    then re-stringify it." Reserializar cambia espacios o escapes y el
    checksum deja de coincidir.
  */
  const checksum = crc32(Buffer.from(rawBody, "utf-8"));
  const mensaje = `${transmissionId}|${transmissionTime}|${requireEnv("PAYPAL_WEBHOOK_ID")}|${checksum}`;

  try {
    const verificador = createVerify("sha256WithRSAEncryption");
    verificador.update(mensaje, "utf-8");
    verificador.end();
    return verificador.verify(await certificado(certUrl), firma, "base64");
  } catch {
    // Certificado ilegible o firma mal formada: no valida, y punto.
    return false;
  }
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
          NO se fija `payment_source.paypal`. Comprobado en sandbox: fijarlo
          restringe el checkout a la billetera y muestra sólo el muro de
          login, sin opción de tarjeta.

          `landing_page: "BILLING"` abre directo en el formulario de
          tarjeta. Importa más que el resto de la integración: el producto
          es una compra por impulso y pedir cuenta en el medio se come la
          conversión.

          Ojo con lo que eso significa según el país del COMPRADOR (no el
          nuestro): PayPal no ofrece pago como invitado en todos lados.
          Colombia no está en su lista, así que a un comprador colombiano
          el formulario le termina en "Abrir cuenta y pagar ahora". A un
          argentino, mexicano, chileno, peruano, uruguayo o español sí le
          alcanza con la tarjeta. Nada de esto se controla desde acá.

          `application_context` es el campo viejo; la documentación nueva
          empuja `payment_source.<fuente>.experience_context`. Se usa éste
          porque es el que se probó funcionando. Si PayPal lo retira, hay
          que verificar a mano —abriendo el checkout— que el reemplazo
          siga mostrando la tarjeta primero.
        */
        application_context: {
          return_url: volver,
          cancel_url: `${siteUrl()}${localePath(locale, "/entrar")}`,
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
          landing_page: "BILLING",
          brand_name: "topcats.lol",
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
