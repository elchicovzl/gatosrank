import "server-only";

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { purgeFromCdn, servedThroughCdn } from "@/lib/cdn-purge";
import { imageUrl } from "@/lib/images";

/**
 * Almacenamiento de imágenes.
 *
 * Con credenciales de R2 va a R2. Sin ellas, a `.uploads/` en disco y se
 * sirve por /api/uploads/[key]. El fallback existe para que `pnpm dev`
 * arranque sin cuenta de Cloudflare; en Vercel R2 es obligatorio porque
 * el filesystem es efímero.
 */

const LOCAL_DIR = path.join(process.cwd(), ".uploads");

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET,
  );
}

let client: S3Client | null = null;

function r2(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
      },
    });
  }
  return client;
}

/** Las keys se generan acá; nunca vienen del cliente. */
function assertSafeKey(key: string): void {
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(key) || key.includes("..")) {
    throw new Error("Key de imagen inválida");
  }
}

export async function putImage(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  assertSafeKey(key);

  if (isR2Configured()) {
    await r2().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return;
  }

  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, key), body);
}

export async function deleteImage(key: string): Promise<void> {
  if (/^https?:\/\//.test(key)) return; // gatos del seed: nada que borrar
  assertSafeKey(key);

  if (isR2Configured()) {
    await r2().send(
      new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }),
    );

    /*
      Con dominio propio hay caché de borde delante del bucket, y sacarlo
      de uno sin sacarlo del otro deja la foto accesible por su URL. Va
      después del borrado a propósito: si purgáramos primero, cualquier
      pedido en el medio volvería a cachear el objeto que aún existe.
    */
    if (servedThroughCdn()) await purgeFromCdn([imageUrl(key)]);
    return;
  }

  await unlink(path.join(LOCAL_DIR, key)).catch(() => {
    // Ya no estaba: borrar es idempotente.
  });
}

/** Solo para el modo local. Con R2 la imagen se sirve desde el bucket. */
export async function readLocalImage(key: string): Promise<Buffer | null> {
  assertSafeKey(key);
  return readFile(path.join(LOCAL_DIR, key)).catch(() => null);
}
