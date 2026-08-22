/**
 * Verifica el circuito de almacenamiento de imágenes de punta a punta.
 *
 *   pnpm check:r2
 *
 * No alcanza con que las variables estén definidas: hace falta saber que
 * las credenciales escriben en ESE bucket y que lo escrito se lee sin
 * credenciales, que es como lo va a pedir el navegador. Son dos permisos
 * distintos en Cloudflare y se configuran en pantallas distintas.
 *
 * El error clásico es apuntar R2_PUBLIC_URL al endpoint de la API S3
 * (<cuenta>.r2.cloudflarestorage.com), que exige firma SigV4 y le
 * responde 401 a cualquier <img>. Este script lo detecta.
 *
 * Sube un PNG de 1x1, lo lee sin firmar y lo borra. No deja rastro.
 */
import "dotenv/config";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { imageUrl } from "@/lib/images";

const KEY = "check-r2-prueba.png";

/** PNG de 1x1 px: lo mínimo que sigue siendo una imagen válida. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/*
  Mismo cliente que arma lib/storage.ts. No se importa de ahí porque ese
  módulo declara "server-only", que sólo resuelve dentro del empaquetador
  de Next. Si cambian los parámetros allá, hay que cambiarlos acá.
*/
function r2(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });
}

interface Probe {
  status: number;
  type: string | null;
  cache: string | null;
}

async function probe(url: string): Promise<Probe> {
  const res = await fetch(url, { cache: "no-store" });
  return {
    status: res.status,
    type: res.headers.get("content-type"),
    cache: res.headers.get("cache-control"),
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name}`);
  return value;
}

async function main(): Promise<void> {
  const bucket = required("R2_BUCKET");
  required("R2_ACCOUNT_ID");
  required("R2_ACCESS_KEY_ID");
  required("R2_SECRET_ACCESS_KEY");
  const publicUrl = required("R2_PUBLIC_URL");

  if (/\.r2\.cloudflarestorage\.com/.test(publicUrl)) {
    throw new Error(
      "R2_PUBLIC_URL apunta al endpoint de la API S3, que exige firma en cada\n" +
        "  pedido y le responde 401 a un <img>. Usá el Public Development URL\n" +
        "  del bucket (https://pub-<hash>.r2.dev) o un dominio propio.",
    );
  }

  const url = imageUrl(KEY);
  console.log(`bucket   ${bucket}`);
  console.log(`URL      ${url}\n`);

  const client = r2();

  console.log("1. subiendo con las credenciales del entorno");
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: KEY,
      Body: PNG,
      ContentType: "image/png",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  console.log("   ✓ subida\n");

  try {
    console.log("2. leyendo SIN credenciales, como un navegador");
    const read = await probe(url);
    console.log(`   status ${read.status} · ${read.type}`);
    console.log(`   cache-control ${read.cache}`);

    if (read.status === 401 || read.status === 403) {
      throw new Error(
        `El objeto existe pero no se sirve público (${read.status}).\n` +
          "  Activá el acceso público del bucket: R2 -> Settings ->\n" +
          "  Public Development URL, o conectá un dominio propio.",
      );
    }
    if (read.status !== 200) {
      throw new Error(
        `Se subió al bucket pero la URL pública devolvió ${read.status}.\n` +
          "  Probablemente R2_PUBLIC_URL apunta a otro bucket.",
      );
    }
    if (read.type !== "image/png") {
      throw new Error(`content-type inesperado: ${read.type}`);
    }
    console.log("   ✓ lectura pública\n");
  } finally {
    // Se borra pase lo que pase: un fallo no debe dejar basura en el bucket.
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: KEY }));
  }

  const gone = await probe(url);
  console.log(`3. borrado · status ${gone.status}\n`);

  console.log("Circuito de imágenes OK: sube, se lee público, se borra.");
}

main().catch((error: unknown) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
