/**
 * Verifica que el webhook de PayPal RECHACE lo que tiene que rechazar.
 *
 *   pnpm check:webhook:paypal
 *   NEXT_PUBLIC_SITE_URL=http://localhost:3002 pnpm check:webhook:paypal
 *
 * Por qué existe este archivo y no alcanza con probar que un pago bueno
 * funcione: el endpoint de verificación de PayPal
 * (/v1/notifications/verify-webhook-signature) responde
 * `{"verification_status":"SUCCESS"}` en SANDBOX ante una firma inventada,
 * un transmission id inventado y un cert_url inexistente. Comprobado. Es
 * decir: si confiáramos en él, el test de "rechaza falsificaciones" daría
 * verde aunque no rechazáramos nada.
 *
 * Por eso la verificación es local, y por eso estos casos se pueden probar
 * de forma determinista: la cuenta la hacemos nosotros.
 *
 * Lo que ESTE script no prueba: que una firma legítima se acepte. Eso
 * necesita una firma real de PayPal, y sale de un pago de sandbox. La
 * asimetría es a propósito — un falso negativo cuesta un pago; un falso
 * positivo regala el puesto #1 a cualquiera.
 */
import "dotenv/config";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const RUTA = "/api/webhooks/pagos";

/** Un certificado real de PayPal: el host pasa la lista blanca. */
const CERT_REAL =
  "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360caa42-fca2a594-a5cafa77";

const EVENTO = JSON.stringify({
  id: "WH-prueba-falsificada",
  event_type: "PAYMENT.CAPTURE.COMPLETED",
  resource: {
    id: "captura-falsa",
    custom_id: "gato-inexistente:41300",
    amount: { currency_code: "USD", value: "413.00" },
  },
});

let fallan = 0;
function check(label: string, ok: boolean, detalle: string) {
  if (!ok) fallan += 1;
  console.log(`  ${ok ? "OK  " : "FALLA"} ${label} — ${detalle}`);
}

interface Cabeceras {
  id?: string;
  time?: string;
  sig?: string;
  cert?: string;
  algo?: string;
}

async function enviar(h: Cabeceras, cuerpo = EVENTO): Promise<number> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (h.id) headers["paypal-transmission-id"] = h.id;
  if (h.time) headers["paypal-transmission-time"] = h.time;
  if (h.sig) headers["paypal-transmission-sig"] = h.sig;
  if (h.cert) headers["paypal-cert-url"] = h.cert;
  if (h.algo) headers["paypal-auth-algo"] = h.algo;

  const res = await fetch(`${BASE}${RUTA}`, {
    method: "POST",
    headers,
    body: cuerpo,
  });
  return res.status;
}

const COMPLETAS: Cabeceras = {
  id: "11111111-2222-3333-4444-555555555555",
  time: "2026-08-23T01:00:00Z",
  sig: "ZmlybWFJbnZlbnRhZGE=",
  cert: CERT_REAL,
  algo: "SHA256withRSA",
};

async function main(): Promise<void> {
  if (process.env.PAYMENTS_PROVIDER !== "paypal") {
    console.error('PAYMENTS_PROVIDER no es "paypal". Nada que verificar acá.');
    process.exit(1);
  }

  console.log(`\nContra ${BASE}${RUTA}\n`);
  console.log("== Firmas que hay que rechazar (400) ==");

  check(
    "sin cabeceras de firma",
    (await enviar({})) === 400,
    "un POST pelado no puede otorgar nada",
  );

  check(
    "firma inventada con certificado real",
    (await enviar(COMPLETAS)) === 400,
    "la verificación RSA tiene que fallar",
  );

  /*
    El caso que la documentación de PayPal no advierte y que vuelve inútil
    al método local si se implementa tal cual está escrita: el atacante
    apunta el certificado a su propio servidor y firma con su clave.
  */
  check(
    "certificado en un host ajeno",
    (await enviar({ ...COMPLETAS, cert: "https://example.com/atacante.pem" })) === 400,
    "sólo se aceptan certificados de paypal.com",
  );

  check(
    "host que imita a PayPal",
    (await enviar({ ...COMPLETAS, cert: "https://evil-paypal.com/x.pem" })) === 400,
    "evil-paypal.com no termina en .paypal.com",
  );

  check(
    "certificado por HTTP sin cifrar",
    (await enviar({ ...COMPLETAS, cert: "http://api.paypal.com/x.pem" })) === 400,
    "un certificado por HTTP se puede interceptar",
  );

  check(
    "algoritmo distinto al que usa PayPal",
    (await enviar({ ...COMPLETAS, algo: "SHA1withRSA" })) === 400,
    "sólo SHA256withRSA",
  );

  check(
    "falta el transmission id",
    (await enviar({ ...COMPLETAS, id: undefined })) === 400,
    "el id es parte de lo que se firma",
  );

  console.log(`\n${fallan === 0 ? "TODO OK — el webhook rechaza lo falsificado" : `${fallan} FALLAN`}`);
  process.exit(fallan === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
