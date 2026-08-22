import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";
import { FILLER_NAMES } from "./seed-names";
import { SEED_PHOTO_IDS } from "./seed-photos";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Falta DATABASE_URL");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const MINUTE = 60_000;

interface SeedCat {
  slug: string;
  name: string;
  dollars: number;
  handle: string | null;
  country: string | null;
  link: string | null;
  /** Minutos hacia atrás desde ahora para el primer pago. */
  agoMinutes: number;
  clicks: number;
}

/**
 * 20 gatos LIVE. Los pares (Kuro/Empanada) y (Manchas/Croqueta) comparten
 * monto a propósito: sirven para verificar que el desempate por antigüedad
 * funciona (el más viejo queda arriba).
 */
const LIVE: SeedCat[] = [
  { slug: "michi",    name: "Michi",    dollars: 412, handle: "michicat",   country: "CO", link: "https://example.com/michi", agoMinutes: 4 * 24 * 60, clicks: 1843 },
  { slug: "pelusa",   name: "Pelusa",   dollars: 180, handle: "pelusaok",   country: "AR", link: null,                         agoMinutes: 3 * 24 * 60, clicks: 902 },
  { slug: "tomas",    name: "Tomás",    dollars: 95,  handle: "tomasgato",  country: "MX", link: "https://example.com/tomas",  agoMinutes: 2 * 24 * 60, clicks: 511 },
  { slug: "gordo",    name: "Gordo",    dollars: 44,  handle: "elgordo",    country: "CL", link: null,                         agoMinutes: 40 * 60,     clicks: 288 },
  { slug: "nube",     name: "Nube",     dollars: 31,  handle: null,         country: "PE", link: null,                         agoMinutes: 30 * 60,     clicks: 174 },
  { slug: "simba",    name: "Simba",    dollars: 27,  handle: "simbaking",  country: "UY", link: "https://example.com/simba",  agoMinutes: 26 * 60,     clicks: 140 },
  { slug: "milanesa", name: "Milanesa", dollars: 22,  handle: "milaneesa",  country: "AR", link: null,                         agoMinutes: 22 * 60,     clicks: 119 },
  { slug: "chispa",   name: "Chispa",   dollars: 19,  handle: null,         country: "CR", link: null,                         agoMinutes: 19 * 60,     clicks: 97 },
  { slug: "frida",    name: "Frida",    dollars: 15,  handle: "fridagata",  country: "MX", link: "https://example.com/frida",  agoMinutes: 15 * 60,     clicks: 83 },
  { slug: "kuro",     name: "Kuro",     dollars: 12,  handle: "kuro_neko",  country: "JP", link: null,                         agoMinutes: 12 * 60,     clicks: 61 },
  { slug: "empanada", name: "Empanada", dollars: 12,  handle: "empanadita", country: "CO", link: null,                         agoMinutes: 9 * 60,      clicks: 58 },
  { slug: "lolo",     name: "Lolo",     dollars: 10,  handle: null,         country: "EC", link: null,                         agoMinutes: 7 * 60,      clicks: 44 },
  { slug: "tuna",     name: "Tuna",     dollars: 9,   handle: "tunafish",   country: "US", link: "https://example.com/tuna",   agoMinutes: 6 * 60,      clicks: 39 },
  { slug: "bigotes",  name: "Bigotes",  dollars: 8,   handle: "donbigotes", country: "VE", link: null,                         agoMinutes: 5 * 60,      clicks: 31 },
  { slug: "nala",     name: "Nala",     dollars: 7,   handle: null,         country: "ES", link: null,                         agoMinutes: 4 * 60,      clicks: 27 },
  { slug: "zorro",    name: "Zorro",    dollars: 6,   handle: "zorrogato",  country: "PY", link: null,                         agoMinutes: 3 * 60,      clicks: 20 },
  { slug: "manchas",  name: "Manchas",  dollars: 5,   handle: null,         country: "BO", link: null,                         agoMinutes: 2 * 60,      clicks: 14 },
  { slug: "croqueta", name: "Croqueta", dollars: 5,   handle: "croquetita", country: "GT", link: null,                         agoMinutes: 95,          clicks: 12 },
  { slug: "ronroneo", name: "Ronroneo", dollars: 4,   handle: null,         country: "PA", link: null,                         agoMinutes: 34,          clicks: 6 },
  { slug: "sombra",   name: "Sombra",   dollars: 3,   handle: "sombrita",   country: "DO", link: null,                         agoMinutes: 8,           clicks: 2 },
];

/** Cola de moderación para poder probar /admin sin subir fotos a mano. */
const HELD = [
  { slug: "tigrillo", name: "Tigrillo", moderation: "REVIEW" as const },
  { slug: "morocho",  name: "Morocho",  moderation: null },
];

function imageFor(index: number): string {
  const id = SEED_PHOTO_IDS[index % SEED_PHOTO_IDS.length];
  return `https://cataas.com/cat/${id}?width=800&height=800`;
}

/**
 * Cuántos ejemplares de relleno se agregan además de los 20 con nombre.
 *
 * Por defecto son 100, que dejan 120 vivos: 117 en el catálogo general y
 * por lo tanto TRES páginas de 50. Con menos de 54 el paginador no tiene
 * a dónde ir y no se puede probar.
 *
 *   SEED_EXTRA=0 pnpm db:seed   -> solo los 20 curados
 */
const EXTRA = Math.min(
  Number(process.env.SEED_EXTRA ?? 100) || 0,
  FILLER_NAMES.length,
);

const FILLER_COUNTRIES = [
  "AR", "MX", "CO", "CL", "PE", "UY", "EC", "VE", "BO", "PY",
  "CR", "GT", "PA", "DO", "ES", "US", null,
] as const;

/**
 * Curva de montos con cola larga: pocos caros, muchos baratos. Es como se
 * ve un tablero real, y de paso genera empates naturales en la cola —
 * justo lo que ejercita el desempate por antigüedad.
 */
function fillerDollars(index: number): number {
  if (EXTRA <= 1) return 3;
  const t = (EXTRA - 1 - index) / (EXTRA - 1);
  return 3 + Math.round(55 * t ** 2.4);
}

function fillerCats() {
  return Array.from({ length: EXTRA }, (_, i) => {
    const name = FILLER_NAMES[i];
    const dollars = fillerDollars(i);
    return {
      slug: slugifyName(name),
      name,
      dollars,
      // Sin handle uno de cada cinco: en el tablero real tampoco todos tienen.
      handle: i % 5 === 0 ? null : `${slugifyName(name)}${i % 3 === 0 ? "" : "cat"}`,
      country: FILLER_COUNTRIES[i % FILLER_COUNTRIES.length],
      link: i % 5 === 0 ? `https://ejemplo.com/${slugifyName(name)}` : null,
      agoMinutes: 45 + i * 7 + (i % 13) * 3,
      clicks: Math.max(1, dollars * 3 + (i % 17)),
    };
  });
}

/** Mismo criterio que `lib/slug.ts`, replicado para no importar del server. */
function slugifyName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Historial de pujas coherente con el monto final: entra por el mínimo
 * y sube en uno o dos saltos, pagando siempre solo la diferencia.
 */
function bidsFor(cat: SeedCat, firstBidAt: Date) {
  const total = cat.dollars * 100;
  if (total <= 500) {
    return [
      {
        amountCents: total,
        resultingCents: total,
        providerRef: `seed-${cat.slug}-1`,
        createdAt: firstBidAt,
      },
    ];
  }

  const entry = 300;
  const mid = Math.max(entry + 100, Math.round(total * 0.4 / 100) * 100);
  const steps = mid < total ? [entry, mid, total] : [entry, total];

  return steps.map((resulting, i) => ({
    amountCents: resulting - (steps[i - 1] ?? 0),
    resultingCents: resulting,
    providerRef: `seed-${cat.slug}-${i + 1}`,
    createdAt: new Date(
      firstBidAt.getTime() + i * Math.round(cat.agoMinutes * MINUTE * 0.2),
    ),
  }));
}

async function main() {
  await prisma.processedWebhook.deleteMany();
  await prisma.report.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.cat.deleteMany();

  const now = Date.now();

  for (const [index, cat] of LIVE.entries()) {
    const firstBidAt = new Date(now - cat.agoMinutes * MINUTE);

    await prisma.cat.create({
      data: {
        slug: cat.slug,
        name: cat.name,
        imageKey: imageFor(index),
        ownerHandle: cat.handle,
        linkUrl: cat.link,
        country: cat.country,
        amountCents: cat.dollars * 100,
        firstBidAt,
        status: "LIVE",
        moderation: "OK",
        clicks: cat.clicks,
        createdAt: new Date(firstBidAt.getTime() - 3 * MINUTE),
        bids: { create: bidsFor(cat, firstBidAt) },
      },
    });
  }

  /*
    Relleno del catálogo. Va con `createMany` y una sola puja por ejemplar:
    crearlos de a uno con historial completo son cientos de round-trips y el
    seed pasa de dos segundos a casi un minuto.
  */
  const filler = fillerCats();

  if (filler.length > 0) {
    await prisma.cat.createMany({
      data: filler.map((cat, index) => {
        const firstBidAt = new Date(now - cat.agoMinutes * MINUTE);
        return {
          id: `seedfill${String(index).padStart(4, "0")}`,
          slug: cat.slug,
          name: cat.name,
          imageKey: imageFor(LIVE.length + 8 + index),
          ownerHandle: cat.handle,
          linkUrl: cat.link,
          country: cat.country,
          amountCents: cat.dollars * 100,
          firstBidAt,
          status: "LIVE" as const,
          moderation: "OK" as const,
          clicks: cat.clicks,
          createdAt: new Date(firstBidAt.getTime() - 3 * MINUTE),
        };
      }),
    });

    await prisma.bid.createMany({
      data: filler.map((cat, index) => ({
        catId: `seedfill${String(index).padStart(4, "0")}`,
        amountCents: cat.dollars * 100,
        resultingCents: cat.dollars * 100,
        providerRef: `seed-fill-${index}`,
        createdAt: new Date(now - cat.agoMinutes * MINUTE),
      })),
    });
  }

  for (const [index, cat] of HELD.entries()) {
    await prisma.cat.create({
      data: {
        slug: cat.slug,
        name: cat.name,
        imageKey: imageFor(LIVE.length + index),
        country: index === 0 ? "CO" : "AR",
        amountCents: 0,
        status: "PENDING",
        moderation: cat.moderation,
        createdAt: new Date(now - (index + 1) * 20 * MINUTE),
      },
    });
  }

  await prisma.cat.create({
    data: {
      slug: "bajado",
      name: "Bajado",
      imageKey: imageFor(LIVE.length + HELD.length),
      amountCents: 800,
      firstBidAt: new Date(now - 3 * 24 * 60 * MINUTE),
      status: "REMOVED",
      moderation: "REJECT",
      createdAt: new Date(now - 3 * 24 * 60 * MINUTE),
    },
  });

  const [live, pending, removed, bids] = await Promise.all([
    prisma.cat.count({ where: { status: "LIVE" } }),
    prisma.cat.count({ where: { status: "PENDING" } }),
    prisma.cat.count({ where: { status: "REMOVED" } }),
    prisma.bid.count(),
  ]);

  const catalogo = Math.max(0, live - 3);
  const paginas = Math.max(1, Math.ceil(catalogo / 50));

  console.log(
    `Seed listo: ${live} LIVE · ${pending} PENDING · ${removed} REMOVED · ${bids} pujas`,
  );
  console.log(
    `Catálogo general: ${catalogo} ejemplares en ${paginas} página(s) de 50.` +
      (paginas > 1 ? "" : " Subí SEED_EXTRA para ver el paginador."),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
