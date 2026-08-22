import "server-only";

import { unstable_cache } from "next/cache";

import type { BoardEntry } from "./bidding";
import { prisma } from "./db";

/** Tag único de invalidación. El webhook lo revalida al confirmar una puja. */
export const BOARD_TAG = "board";

export const PAGE_SIZE = 50;

/**
 * La mesa de honor queda FUERA de la paginación: los tres primeros se ven
 * siempre, en todas las páginas. El paginador mueve solo el catálogo general.
 */
export const PODIUM_SIZE = 3;

/**
 * Techo del snapshot que viaja al cliente para calcular la previa en vivo.
 * Con 2000 ejemplares el payload ronda los ~35 KB comprimidos, y nadie
 * inscribe un gato apuntando a un puesto que no puede ver.
 */
export const SNAPSHOT_LIMIT = 2000;

const BOARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  imageKey: true,
  ownerHandle: true,
  country: true,
  amountCents: true,
  firstBidAt: true,
} as const;

/** Orden canónico del tablero. No existe columna `rank`. */
const BOARD_ORDER = [
  { amountCents: "desc" },
  { firstBidAt: "asc" },
] satisfies { amountCents?: "desc"; firstBidAt?: "asc" }[];

interface BoardRow {
  id: string;
  slug: string;
  name: string;
  imageKey: string;
  ownerHandle: string | null;
  country: string | null;
  amountCents: number;
  firstBidAt: Date | null;
}

function toEntry(row: BoardRow): BoardEntry {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    imageKey: row.imageKey,
    ownerHandle: row.ownerHandle,
    country: row.country,
    amountCents: row.amountCents,
    // Un LIVE siempre tiene firstBidAt; el fallback es defensivo.
    firstBidAt: row.firstBidAt?.getTime() ?? Number.MAX_SAFE_INTEGER,
  };
}

/**
 * Snapshot del tablero para el cálculo de puestos y precios.
 * Se usa en el servidor y se serializa al cliente en /entrar.
 */
export const getBoardSnapshot = unstable_cache(
  async (): Promise<BoardEntry[]> => {
    const rows = await prisma.cat.findMany({
      where: { status: "LIVE" },
      orderBy: BOARD_ORDER,
      take: SNAPSHOT_LIMIT,
      select: BOARD_SELECT,
    });
    return rows.map(toEntry);
  },
  ["board-snapshot"],
  { tags: [BOARD_TAG], revalidate: 10 },
);

export interface BoardStats {
  liveCount: number;
  todayCents: number;
  totalClicks: number;
}

/** Colombia no tiene horario de verano: UTC-5 fijo. */
function startOfBogotaDay(): Date {
  const now = new Date();
  const bogota = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const midnightUtc = Date.UTC(
    bogota.getUTCFullYear(),
    bogota.getUTCMonth(),
    bogota.getUTCDate(),
  );
  return new Date(midnightUtc + 5 * 60 * 60 * 1000);
}

export const getBoardStats = unstable_cache(
  async (): Promise<BoardStats> => {
    const [liveCount, today, clicks] = await Promise.all([
      prisma.cat.count({ where: { status: "LIVE" } }),
      prisma.bid.aggregate({
        _sum: { amountCents: true },
        where: { createdAt: { gte: startOfBogotaDay() } },
      }),
      prisma.cat.aggregate({
        _sum: { clicks: true },
        where: { status: "LIVE" },
      }),
    ]);

    return {
      liveCount,
      todayCents: today._sum.amountCents ?? 0,
      totalClicks: clicks._sum.clicks ?? 0,
    };
  },
  ["board-stats"],
  { tags: [BOARD_TAG], revalidate: 10 },
);

export interface BoardPageEntry extends BoardEntry {
  /** Puesto derivado: offset de la página + índice. */
  rank: number;
  clicks: number;
  lastBidAt: number;
}

export interface BoardPage {
  entries: BoardPageEntry[];
  page: number;
  totalPages: number;
  total: number;
}

const ROW_SELECT = {
  ...BOARD_SELECT,
  clicks: true,
  bids: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { createdAt: true },
  },
} as const;

interface RowWithMeta extends BoardRow {
  clicks: number;
  bids: { createdAt: Date }[];
}

function toPageEntry(row: RowWithMeta, rank: number): BoardPageEntry {
  return {
    ...toEntry(row),
    rank,
    clicks: row.clicks,
    lastBidAt:
      row.bids[0]?.createdAt.getTime() ??
      row.firstBidAt?.getTime() ??
      Date.now(),
  };
}

/** Los tres primeros. Se muestran en todas las páginas. */
async function readPodium(): Promise<BoardPageEntry[]> {
  const rows = await prisma.cat.findMany({
    where: { status: "LIVE" },
    orderBy: BOARD_ORDER,
    take: PODIUM_SIZE,
    select: ROW_SELECT,
  });
  return rows.map((row, index) => toPageEntry(row, index + 1));
}

export const getPodium = unstable_cache(readPodium, ["board-podium"], {
  tags: [BOARD_TAG],
  revalidate: 10,
});

/**
 * Catálogo general: del #4 para abajo. La paginación es SOLO sobre esto,
 * así que la mesa de honor no se pierde al cambiar de página.
 */
async function readCatalogPage(page: number): Promise<BoardPage> {
  const live = await prisma.cat.count({ where: { status: "LIVE" } });
  const total = Math.max(0, live - PODIUM_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);
  const offset = (current - 1) * PAGE_SIZE;

  const rows = await prisma.cat.findMany({
    where: { status: "LIVE" },
    orderBy: BOARD_ORDER,
    skip: PODIUM_SIZE + offset,
    take: PAGE_SIZE,
    select: ROW_SELECT,
  });

  return {
    entries: rows.map((row, index) =>
      toPageEntry(row, PODIUM_SIZE + offset + index + 1),
    ),
    page: current,
    totalPages,
    total,
  };
}

export const getCatalogPage = unstable_cache(readCatalogPage, ["catalog-page"], {
  tags: [BOARD_TAG],
  revalidate: 10,
});

export interface ActivityItem {
  id: string;
  name: string;
  slug: string;
  amountCents: number;
  resultingCents: number;
  createdAt: number;
  /** true si fue la primera puja del ejemplar. */
  isEntry: boolean;
}

/**
 * Feed de movimientos. El puesto que se muestra se deriva del monto
 * resultante contra el tablero actual — para pujas recientes coincide,
 * y no guardamos histórico de puestos a propósito.
 */
export const getActivity = unstable_cache(
  async (limit = 8): Promise<ActivityItem[]> => {
    const bids = await prisma.bid.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      where: { cat: { status: "LIVE" } },
      select: {
        id: true,
        amountCents: true,
        resultingCents: true,
        createdAt: true,
        cat: { select: { name: true, slug: true } },
      },
    });

    return bids.map((bid) => ({
      id: bid.id,
      name: bid.cat.name,
      slug: bid.cat.slug,
      amountCents: bid.amountCents,
      resultingCents: bid.resultingCents,
      createdAt: bid.createdAt.getTime(),
      isEntry: bid.amountCents === bid.resultingCents,
    }));
  },
  ["board-activity"],
  { tags: [BOARD_TAG], revalidate: 10 },
);
