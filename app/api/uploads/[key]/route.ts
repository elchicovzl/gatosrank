import { NextResponse } from "next/server";

import { isR2Configured, readLocalImage } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Sirve las imágenes del modo local. En producción con R2 configurado
 * esta ruta no se usa: las URLs apuntan al dominio público del bucket.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/uploads/[key]">,
) {
  if (isR2Configured()) return new NextResponse(null, { status: 404 });

  const { key } = await params;
  const body = await readLocalImage(key).catch(() => null);
  if (!body) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
