/**
 * Verifica el webhook REAL de Polar sin depender de que Polar nos alcance.
 *
 *   pnpm check:webhook:polar
 *   NEXT_PUBLIC_SITE_URL=https://topcats.lol pnpm check:webhook:polar
 *
 * El cuerpo NO se inventa: sale de `fixtures/polar-order-paid.json`, que es
 * una entrega real capturada de la pestaña Deliveries de Polar (con los
 * datos personales reemplazados). El script sólo lo refirma con nuestro
 * secreto y le cambia el gato y el monto.
 *
 * Esto importa: el SDK valida el esquema del cuerpo DESPUÉS de verificar la
 * firma, y un campo faltante tira un error que no es de verificación — se
 * relanza y sale un 500 con firma VÁLIDA. Mantener a mano una copia del
 * esquema ajeno es una cinta de correr que además da falsas alarmas: ya nos
 * hizo creer que producción estaba rota. Si Polar cambia el esquema, se
 * captura una entrega nueva y se reemplaza el fixture.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

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

const FIXTURE = JSON.parse(
  readFileSync(
    path.join(process.cwd(), "scripts", "fixtures", "polar-order-paid.json"),
    "utf-8",
  ),
) as { data: Record<string, unknown> };

/**
 * Toma la entrega real y le cambia sólo lo que este script necesita: a qué
 * gato apunta, cuánto sale y un id de orden distinto por corrida. Todo lo
 * demás queda tal cual llegó de Polar, que es el punto.
 */
function eventoOrderPaid(catDraftId: string, resultingCents: number) {
  const copia = structuredClone(FIXTURE);
  Object.assign(copia.data, {
    id: randomUUID(),
    subtotal_amount: resultingCents,
    total_amount: resultingCents,
    due_amount: resultingCents,
    metadata: { catDraftId, resultingCents },
  });
  return copia;
}

/*
  Ids emitidos por este script, para poder borrarlos al final sin tocar el
  libro de pagos real. Se borra por id exacto y no por prefijo a propósito:
  Polar manda como `webhook-id` un UUID pelado —verificado contra una
  entrega real: `9e886ab6-4922-4899-a5c4-fd518af53798`— así que cualquier
  heurística de prefijo depende de un formato ajeno que puede cambiar.
  La lista exacta no depende de nada.
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
  /* El estado va en el mensaje: 400 es firma rechazada, 500 es que pasó
     la firma y reventó después. Sin ese número el diagnóstico es a ciegas. */
  check(
    "acepta el evento",
    r1.body?.result === "applied",
    `HTTP ${r1.status} · respuesta: ${r1.body?.result ?? "(sin cuerpo)"}`,
  );
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
