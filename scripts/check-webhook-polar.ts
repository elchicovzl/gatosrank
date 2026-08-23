/**
 * Verifica el webhook REAL de Polar sin necesidad de un túnel.
 *
 * Firma un evento `order.paid` con el mismo secreto y el mismo estándar que
 * usa Polar, y lo manda al endpoint local. Así se ejercita el camino que de
 * verdad importa — validación de firma incluida — sin exponer nada a
 * internet y sin esperar a tener dominio.
 *
 * Lo que ESTO no prueba: que Polar pueda alcanzarte. Eso necesita un túnel
 * o un despliegue; para eso está `pnpm tunnel`.
 *
 *   pnpm dev              # en otra terminal, con PAYMENTS_PROVIDER=polar
 *   pnpm check:webhook:polar
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { Webhook } from "standardwebhooks";

import { PrismaClient } from "../generated/prisma/client";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SECRET = process.env.POLAR_WEBHOOK_SECRET;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

let fallan = 0;
function check(label: string, ok: boolean, detalle: string) {
  if (!ok) fallan += 1;
  console.log(`  ${ok ? "OK  " : "FALLA"} ${label} — ${detalle}`);
}

/**
 * Polar firma con Standard Webhooks. El SDK codifica el secreto a base64
 * antes de verificar, así que para firmar hay que hacer lo mismo — si no,
 * las firmas nunca coinciden.
 */
function firmar(secret: string, id: string, cuerpo: string, cuando: Date) {
  const wh = new Webhook(Buffer.from(secret, "utf-8").toString("base64"));
  return wh.sign(id, cuando, cuerpo);
}

function eventoOrderPaid(catDraftId: string, resultingCents: number) {
  return {
    type: "order.paid",
    timestamp: new Date().toISOString(),
    data: {
      id: `order_${randomUUID()}`,
      created_at: new Date().toISOString(),
      modified_at: null,
      status: "paid",
      paid: true,
      subtotal_amount: resultingCents,
      discount_amount: 0,
      net_amount: resultingCents,
      tax_amount: 0,
      total_amount: resultingCents,
      refunded_amount: 0,
      refunded_tax_amount: 0,
      currency: "usd",
      billing_reason: "purchase",
      billing_address: null,
      customer_id: `cus_${randomUUID()}`,
      product_id: process.env.POLAR_PRODUCT_ID ?? "prod_x",
      discount_id: null,
      subscription_id: null,
      checkout_id: `chk_${randomUUID()}`,
      metadata: { catDraftId, resultingCents },
      custom_field_data: {},
      customer: {
        id: `cus_${randomUUID()}`,
        created_at: new Date().toISOString(),
        modified_at: null,
        metadata: {},
        external_id: null,
        email: "prueba@example.com",
        email_verified: true,
        name: null,
        billing_address: null,
        tax_id: null,
        organization_id: `org_${randomUUID()}`,
        deleted_at: null,
        avatar_url: "",
      },
      product: null,
      discount: null,
      subscription: null,
      items: [],
    },
  };
}

/*
  Ids emitidos por este script, para poder borrarlos al final. NO se puede
  limpiar por prefijo: `msg_` es el formato de Standard Webhooks y los
  eventos reales de Polar lo usan también, así que un `startsWith` se
  llevaría puesto el libro de pagos de verdad.
*/
const IDS_EMITIDOS: string[] = [];

function nuevoId(): string {
  const id = `msg_${randomUUID()}`;
  IDS_EMITIDOS.push(id);
  return id;
}

async function enviar(evento: unknown, opciones?: { romperFirma?: boolean }) {
  const cuerpo = JSON.stringify(evento);
  const id = nuevoId();
  const cuando = new Date();
  let firma = firmar(SECRET!, id, cuerpo, cuando);
  if (opciones?.romperFirma) firma = firma.slice(0, -4) + "xxxx";

  const res = await fetch(`${BASE}/api/webhooks/pagos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "webhook-id": id,
      "webhook-timestamp": Math.floor(cuando.getTime() / 1000).toString(),
      "webhook-signature": firma,
    },
    body: cuerpo,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function borrador(nombre: string) {
  return prisma.cat.create({
    data: {
      slug: `polar-${nombre}-${Date.now().toString(36)}`,
      name: nombre,
      imageKey: "https://cataas.com/cat/0C2bQ39x8kuhx31p?width=800&height=800",
      amountCents: 0,
      status: "PENDING",
      moderation: "OK",
    },
    select: { id: true },
  });
}

async function main() {
  if (process.env.PAYMENTS_PROVIDER !== "polar") {
    console.error("PAYMENTS_PROVIDER no es 'polar'. Nada que verificar acá.");
    process.exit(1);
  }
  if (!SECRET) {
    console.error("Falta POLAR_WEBHOOK_SECRET.");
    process.exit(1);
  }

  console.log("\n== Firma válida: el puesto se otorga ==");
  const uno = await borrador("PolarFirmado");
  const r1 = await enviar(eventoOrderPaid(uno.id, 1500));
  const tras = await prisma.cat.findUniqueOrThrow({
    where: { id: uno.id },
    select: { amountCents: true, status: true },
  });
  check("acepta el evento", r1.body?.result === "applied", `respuesta: ${r1.body?.result}`);
  check("aplica el monto", tras.amountCents === 1500, `monto: ${tras.amountCents}`);
  check("publica el ejemplar", tras.status === "LIVE", `estado: ${tras.status}`);

  console.log("\n== Firma inválida: se rechaza ==");
  const dos = await borrador("PolarFalsificado");
  const r2 = await enviar(eventoOrderPaid(dos.id, 9900), { romperFirma: true });
  const tras2 = await prisma.cat.findUniqueOrThrow({
    where: { id: dos.id },
    select: { amountCents: true, status: true },
  });
  check("responde 400", r2.status === 400, `status: ${r2.status}`);
  check("NO otorga el puesto", tras2.status === "PENDING" && tras2.amountCents === 0,
    `estado: ${tras2.status}, monto: ${tras2.amountCents}`);

  console.log("\n== Reenvío del mismo evento: no duplica ==");
  const tres = await borrador("PolarRepetido");
  const evento = eventoOrderPaid(tres.id, 800);
  const cuerpo = JSON.stringify(evento);
  const id = nuevoId();
  const cuando = new Date();
  const firma = firmar(SECRET, id, cuerpo, cuando);
  const cabeceras = {
    "Content-Type": "application/json",
    "webhook-id": id,
    "webhook-timestamp": Math.floor(cuando.getTime() / 1000).toString(),
    "webhook-signature": firma,
  };
  /*
    Sin `json()` directo: un 400 responde con cuerpo vacío y parsearlo tira
    SyntaxError, que hace explotar la verificación en vez de reportar el
    fallo. Un verificador que revienta no informa nada.
  */
  const postear = async () => {
    const r = await fetch(`${BASE}/api/webhooks/pagos`, {
      method: "POST",
      headers: cabeceras,
      body: cuerpo,
    });
    const texto = await r.text();
    try {
      return JSON.parse(texto) as { result?: string };
    } catch {
      return { result: `sin cuerpo (HTTP ${r.status})` };
    }
  };

  const a = await postear();
  const bb = await postear();
  const pujas = await prisma.bid.count({ where: { catId: tres.id } });
  check("primero aplica", a?.result === "applied", `${a?.result}`);
  check("segundo es duplicado", bb?.result === "duplicate", `${bb?.result}`);
  check("una sola puja", pujas === 1, `pujas: ${pujas}`);

  await prisma.cat.deleteMany({ where: { slug: { startsWith: "polar-" } } });
  await prisma.processedWebhook.deleteMany({
    where: { eventId: { in: IDS_EMITIDOS } },
  });
  console.log(`\n${fallan === 0 ? "TODO OK — el webhook de Polar está bien cableado" : `${fallan} FALLAN`}`);
  await prisma.$disconnect();
  process.exit(fallan === 0 ? 0 : 1);
}

main();
