import { NextResponse } from "next/server";

import { beat } from "@/lib/presence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Latido del contador en vivo. Lo llama la píldora de stats cada 30 s. */
export async function POST() {
  const stats = await beat();
  return NextResponse.json(stats, {
    headers: { "Cache-Control": "no-store" },
  });
}
