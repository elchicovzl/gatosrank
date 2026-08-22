import { randomUUID } from "node:crypto";

import { fileTypeFromBuffer } from "file-type";
import { NextResponse } from "next/server";
import sharp from "sharp";

import { callerKey, rateLimit } from "@/lib/rate-limit";
import { putImage } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Tipos aceptados. Se validan por MAGIC BYTES, no por la extensión ni por
 * el content-type que manda el navegador: los dos son texto libre.
 */
const ACCEPTED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
]);

/** Lado del cuadrado que se guarda. Alcanza para la placa del #1 y para la OG. */
const OUTPUT_SIZE = 1000;

export async function POST(request: Request) {
  if (!rateLimit(callerKey(request, "upload"), 12, 10 * 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(input);

  if (!detected || !ACCEPTED.has(detected.mime)) {
    return NextResponse.json({ error: "not_an_image" }, { status: 415 });
  }

  try {
    /**
     * `rotate()` aplica la orientación EXIF y después la descarta.
     * Re-codificar a webp elimina TODO el resto de metadatos, incluida
     * la geolocalización que traen las fotos de teléfono.
     */
    const output = await sharp(input, { animated: false })
      .rotate()
      .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();

    const key = `${randomUUID()}.webp`;
    await putImage(key, output, "image/webp");

    return NextResponse.json({ key });
  } catch {
    return NextResponse.json({ error: "process_failed" }, { status: 422 });
  }
}
