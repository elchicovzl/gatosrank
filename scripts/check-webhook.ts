/**
 * Verificación de los criterios de aceptación 3 y 4:
 *  - reenviar el mismo webhook no duplica la puja
 *  - dos pagos simultáneos al mismo puesto dejan el tablero consistente
 *
 * Corre contra el servidor de desarrollo con PAYMENTS_PROVIDER=mock.
 *   pnpm check:webhook
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? "  OK  " : " FALLA"} ${label} — ${detail}`);
}

async function makeDraft(name: string) {
  return prisma.cat.create({
    data: {
      slug: `prueba-${name}-${Date.now().toString(36)}`,
      name,
      imageKey: "https://cataas.com/cat/04eEQhDfAL8l5nt3?width=800&height=800",
      amountCents: 0,
      status: "PENDING",
      moderation: "OK",
    },
    select: { id: true },
  });
}

function fire(payload: Record<string, unknown>) {
  return fetch(`${BASE}/api/webhooks/pagos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
}

async function testIdempotency() {
  console.log("\n== Criterio 4: reenviar el mismo webhook ==");
  const cat = await makeDraft("Idempotente");
  const payload = {
    eventId: `evt_idem_${cat.id}`,
    providerRef: `txn_idem_${cat.id}`,
    catDraftId: cat.id,
    amountCents: 700,
    resultingCents: 700,
  };

  const first = await fire(payload);
  const second = await fire(payload);
  const third = await fire(payload);

  const bids = await prisma.bid.count({ where: { catId: cat.id } });
  const after = await prisma.cat.findUniqueOrThrow({
    where: { id: cat.id },
    select: { amountCents: true, status: true },
  });

  check("primer envío aplica", first.body?.result === "applied", `respuesta: ${first.body?.result}`);
  check("reenvíos no duplican", second.body?.result === "duplicate" && third.body?.result === "duplicate",
    `respuestas: ${second.body?.result} / ${third.body?.result}`);
  check("una sola puja registrada", bids === 1, `pujas: ${bids}`);
  check("monto sin duplicar", after.amountCents === 700, `monto: ${after.amountCents}`);
  check("quedó publicado", after.status === "LIVE", `estado: ${after.status}`);
}

async function testConcurrentSameSpot() {
  console.log("\n== Criterio 3: dos pagos simultáneos al mismo puesto ==");
  const [a, b] = await Promise.all([makeDraft("Simultaneo A"), makeDraft("Simultaneo B")]);

  // Los dos apuntan exactamente al mismo monto, en el mismo instante.
  const [ra, rb] = await Promise.all([
    fire({ eventId: `evt_c_${a.id}`, providerRef: `txn_c_${a.id}`, catDraftId: a.id, amountCents: 5000, resultingCents: 5000 }),
    fire({ eventId: `evt_c_${b.id}`, providerRef: `txn_c_${b.id}`, catDraftId: b.id, amountCents: 5000, resultingCents: 5000 }),
  ]);

  const cats = await prisma.cat.findMany({
    where: { id: { in: [a.id, b.id] } },
    select: { id: true, name: true, amountCents: true, firstBidAt: true, status: true },
  });

  check("los dos pagos se aplicaron", ra.body?.result === "applied" && rb.body?.result === "applied",
    `${ra.body?.result} / ${rb.body?.result}`);
  check("nadie perdió su plata", cats.every((c) => c.amountCents === 5000),
    cats.map((c) => `${c.name}=${c.amountCents}`).join(", "));
  check("los dos quedaron publicados", cats.every((c) => c.status === "LIVE"),
    cats.map((c) => c.status).join(", "));

  const ordered = await prisma.cat.findMany({
    where: { status: "LIVE", amountCents: 5000 },
    orderBy: [{ amountCents: "desc" }, { firstBidAt: "asc" }],
    select: { name: true, firstBidAt: true },
  });
  const strictlyOrdered = ordered.every(
    (c, i) => i === 0 || ordered[i - 1].firstBidAt!.getTime() <= c.firstBidAt!.getTime(),
  );
  check("el desempate es determinista", strictlyOrdered && ordered.length >= 2,
    ordered.map((c) => c.name).join(" > "));
}

async function testConcurrentRaisesSameCat() {
  console.log("\n== Bloqueo de fila: dos subidas del MISMO ejemplar a la vez ==");
  const cat = await makeDraft("Contendiente");
  await fire({ eventId: `evt_base_${cat.id}`, providerRef: `txn_base_${cat.id}`, catDraftId: cat.id, amountCents: 300, resultingCents: 300 });

  // Sube a $20 y a $10 exactamente al mismo tiempo.
  await Promise.all([
    fire({ eventId: `evt_hi_${cat.id}`, providerRef: `txn_hi_${cat.id}`, catDraftId: cat.id, amountCents: 1700, resultingCents: 2000 }),
    fire({ eventId: `evt_lo_${cat.id}`, providerRef: `txn_lo_${cat.id}`, catDraftId: cat.id, amountCents: 700, resultingCents: 1000 }),
  ]);

  const after = await prisma.cat.findUniqueOrThrow({
    where: { id: cat.id },
    select: { amountCents: true, bids: { select: { amountCents: true } } },
  });

  check("la puja nunca bajó", after.amountCents === 2000, `monto final: ${after.amountCents} (esperado 2000)`);
  check("las tres transacciones quedaron registradas", after.bids.length === 3, `pujas: ${after.bids.length}`);
}

async function main() {
  await testIdempotency();
  await testConcurrentSameSpot();
  await testConcurrentRaisesSameCat();

  // Limpieza: los ejemplares de prueba no se quedan en el catálogo.
  await prisma.cat.deleteMany({ where: { slug: { startsWith: "prueba-" } } });
  console.log(`\n${failures === 0 ? "TODO OK" : `${failures} VERIFICACIONES FALLARON`}`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main();
