import "server-only";

import sharp from "sharp";

import { readLocalImage } from "@/lib/storage";

/**
 * Carga la foto de un ejemplar como data URI JPEG para la imagen OG.
 *
 * Por qué no pasar la URL directo: el renderizador de ImageResponse no
 * decodifica webp, y TODO lo que sube el usuario se guarda en webp.
 * Así que se decodifica acá y se entrega en un formato que sí entiende.
 */
export async function catPhotoDataUri(
  imageKey: string,
  size: number,
): Promise<string | null> {
  const source = await loadBytes(imageKey);
  if (!source) return null;

  try {
    const jpeg = await sharp(source)
      .resize(size, size, { fit: "cover", position: "attention" })
      .jpeg({ quality: 88 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

async function loadBytes(imageKey: string): Promise<Buffer | null> {
  if (/^https?:\/\//.test(imageKey)) {
    try {
      const response = await fetch(imageKey, {
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) return null;
      return Buffer.from(await response.arrayBuffer());
    } catch {
      return null;
    }
  }

  const publicUrl = process.env.R2_PUBLIC_URL;
  if (publicUrl) {
    try {
      const response = await fetch(
        `${publicUrl.replace(/\/+$/, "")}/${imageKey}`,
        { signal: AbortSignal.timeout(6000) },
      );
      if (!response.ok) return null;
      return Buffer.from(await response.arrayBuffer());
    } catch {
      return null;
    }
  }

  return readLocalImage(imageKey);
}
