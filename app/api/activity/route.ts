import { NextResponse } from "next/server";

import { getActivity } from "@/lib/board";

/** Lo consume el polling del feed cada 10s. Nada más. */
export async function GET() {
  const items = await getActivity();
  return NextResponse.json(items, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=10" },
  });
}
