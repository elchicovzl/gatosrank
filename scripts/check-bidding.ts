import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { project, priceToTakeRank, occupantOfRank, SHOWCASE_RANKS, type BoardEntry } from "../lib/bidding";
import { formatMoney } from "../lib/money";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const rows = await prisma.cat.findMany({
    where: { status: "LIVE" },
    orderBy: [{ amountCents: "desc" }, { firstBidAt: "asc" }],
  });
  const board: BoardEntry[] = rows.map((c) => ({
    id: c.id, slug: c.slug, name: c.name, imageKey: c.imageKey,
    ownerHandle: c.ownerHandle, country: c.country,
    amountCents: c.amountCents, firstBidAt: c.firstBidAt!.getTime(),
  }));

  console.log("--- tira del paso 4 ---");
  for (const r of SHOWCASE_RANKS) {
    const occ = occupantOfRank(board, r);
    console.log(`#${r}: ${occ ? occ.name.padEnd(9) : "libre".padEnd(9)} -> tomarlo cuesta ${formatMoney(priceToTakeRank(board, r))}`);
  }

  console.log("\n--- proyección de gato NUEVO ---");
  for (const usd of [3, 7, 13, 96, 413]) {
    const p = project(board, usd * 100);
    console.log(
      `Con ${formatMoney(usd*100)} entras en el #${p.rank}` +
      (p.displaced ? ` y tumbas a ${p.displaced.name} (su puja: ${formatMoney(p.displaced.amountCents)})` : " y el puesto estaba libre") +
      ` | cobro ${formatMoney(p.chargeCents)} | arriba: ${p.above?.name ?? "nadie"}`
    );
  }

  console.log("\n--- SUBIDA de puja (Sombra, el ultimo, con $3) ---");
  const sombra = board.find((b) => b.slug === "sombra")!;
  for (const usd of [4, 13, 96]) {
    const p = project(board, usd * 100, sombra.id);
    console.log(
      `Sombra ${formatMoney(sombra.amountCents)} -> ${formatMoney(usd*100)}: #${p.currentRank} => #${p.rank}` +
      ` | paga ${formatMoney(p.chargeCents)} | mejora: ${p.improves ? "si" : "NO"}` +
      (p.displaced ? ` | tumba a ${p.displaced.name}` : " | no tumba a nadie")
    );
  }

  console.log("\n--- SUBIDA del #1 (no puede tumbar a nadie) ---");
  const michi = board.find((b) => b.slug === "michi")!;
  const up = project(board, michi.amountCents + 100, michi.id);
  console.log(
    `Michi ${formatMoney(michi.amountCents)} -> ${formatMoney(michi.amountCents+100)}: #${up.currentRank} => #${up.rank}` +
    ` | mejora: ${up.improves ? "si" : "NO"} | tumba a: ${up.displaced?.name ?? "nadie"}`
  );

  console.log("\n--- empate: un gato nuevo pierde contra los que ya tienen ese monto ---");
  // La expectativa se CALCULA: con un seed más grande, un monto de $12 ya no
  // cae en el #12, y una constante escrita a mano se leería como un fallo.
  const tieAmount = 1200;
  const conMasOIgual = board.filter((b) => b.amountCents >= tieAmount).length;
  const tie = project(board, tieAmount);
  const empatados = board.filter((b) => b.amountCents === tieAmount);
  const ok = tie.rank === conMasOIgual + 1;
  console.log(
    `nuevo con ${formatMoney(tieAmount)} -> #${tie.rank} | esperado #${conMasOIgual + 1} ` +
    `(hay ${conMasOIgual} con monto mayor o igual) | ${ok ? "OK" : "FALLA"}`
  );
  if (empatados.length > 0) {
    console.log(
      `   empatados en ${formatMoney(tieAmount)}: ${empatados.map((e) => e.name).join(", ")}` +
      ` — todos quedan ARRIBA del nuevo`
    );
  }
  if (!ok) process.exitCode = 1;

  await prisma.$disconnect();
}
main();
