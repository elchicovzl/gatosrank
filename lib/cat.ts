import "server-only";

import { unstable_cache } from "next/cache";

import { rankFor, type BoardEntry } from "@/lib/bidding";
import { BOARD_TAG, getBoardSnapshot } from "@/lib/board";
import { prisma } from "@/lib/db";

export interface CatBid {
  id: string;
  amountCents: number;
  resultingCents: number;
  createdAt: number;
}

export interface CatDetail {
  id: string;
  slug: string;
  name: string;
  imageKey: string;
  ownerHandle: string | null;
  country: string | null;
  linkUrl: string | null;
  amountCents: number;
  firstBidAt: number | null;
  clicks: number;
  status: "PENDING" | "LIVE" | "REMOVED";
  /** Puesto derivado. null si el ejemplar no está publicado. */
  rank: number | null;
  /** Total de ejemplares en el catálogo, para el "#7 de 412". */
  total: number;
  bids: CatBid[];
}

async function readCat(slug: string): Promise<CatDetail | null> {
  const cat = await prisma.cat.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      imageKey: true,
      ownerHandle: true,
      country: true,
      linkUrl: true,
      amountCents: true,
      firstBidAt: true,
      clicks: true,
      status: true,
      bids: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amountCents: true,
          resultingCents: true,
          createdAt: true,
        },
      },
    },
  });

  if (!cat) return null;

  const isLive = cat.status === "LIVE" && cat.firstBidAt !== null;
  const board = isLive ? await getBoardSnapshot() : [];
  const total = isLive
    ? board.length
    : await prisma.cat.count({ where: { status: "LIVE" } });

  return {
    id: cat.id,
    slug: cat.slug,
    name: cat.name,
    imageKey: cat.imageKey,
    ownerHandle: cat.ownerHandle,
    country: cat.country,
    linkUrl: cat.linkUrl,
    amountCents: cat.amountCents,
    firstBidAt: cat.firstBidAt?.getTime() ?? null,
    clicks: cat.clicks,
    status: cat.status,
    rank: isLive
      ? rankFor(board, cat.amountCents, cat.firstBidAt!.getTime(), cat.id)
      : null,
    total,
    bids: cat.bids.map((bid) => ({
      id: bid.id,
      amountCents: bid.amountCents,
      resultingCents: bid.resultingCents,
      createdAt: bid.createdAt.getTime(),
    })),
  };
}

export const getCat = unstable_cache(readCat, ["cat-detail"], {
  tags: [BOARD_TAG],
  revalidate: 10,
});

/** El tablero completo, para proyectar una subida de puja en la ficha. */
export async function getBoardForCat(): Promise<BoardEntry[]> {
  return getBoardSnapshot();
}
