import "server-only";

/**
 * Purga del caché de borde de Cloudflare.
 *
 * Las fotos se suben con `immutable` y un año de caché, que es lo correcto
 * porque una key nunca se reescribe. Pero con dominio propio el CDN queda
 * delante del bucket, y entonces borrar el objeto NO alcanza: el borde
 * sigue sirviendo su copia hasta que expire.
 *
 * Eso rompe dos cosas a la vez: la baja de contenido indebido —la única
 * red de seguridad que tenemos, porque lo pagado se publica solo— y la
 * promesa de la página de privacidad, que dice que borramos la foto.
 *
 * Por eso, cuando hay CDN de por medio, borrar es siempre dos pasos.
 */

const API = "https://api.cloudflare.com/client/v4/zones";

/** Límite de la API: como mucho 100 URLs por pedido en los planes no Enterprise. */
const MAX_POR_PEDIDO = 100;

export function isCdnPurgeConfigured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID,
  );
}

/**
 * ¿Las imágenes salen por un CDN que cachea?
 *
 * El dominio de desarrollo `*.r2.dev` va directo al bucket, sin borde que
 * guarde copias: ahí borrar el objeto basta. Un dominio propio de R2, en
 * cambio, siempre pasa por el caché de Cloudflare.
 */
export function servedThroughCdn(): boolean {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) return false; // disco local, sin CDN
  return !/\.r2\.dev$/i.test(new URL(publicUrl).hostname);
}

interface PurgeResponse {
  success: boolean;
  errors?: { code: number; message: string }[];
}

/**
 * Borra esas URLs del borde. Tira si no lo logra: quien dio de baja una
 * foto tiene que enterarse si sigue accesible, no descubrirlo después.
 */
export async function purgeFromCdn(urls: string[]): Promise<void> {
  if (urls.length === 0) return;

  if (!isCdnPurgeConfigured()) {
    throw new Error(
      "Las imágenes salen por un CDN que cachea, pero falta CLOUDFLARE_API_TOKEN " +
        "o CLOUDFLARE_ZONE_ID: el objeto se borra del bucket y el borde lo sigue " +
        "sirviendo. La baja quedaría a medias.",
    );
  }

  const zone = process.env.CLOUDFLARE_ZONE_ID;

  for (let i = 0; i < urls.length; i += MAX_POR_PEDIDO) {
    const lote = urls.slice(i, i + MAX_POR_PEDIDO);

    const res = await fetch(`${API}/${zone}/purge_cache`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files: lote }),
    });

    const body = (await res.json().catch(() => null)) as PurgeResponse | null;

    if (!res.ok || !body?.success) {
      const detalle =
        body?.errors?.map((e) => `${e.code} ${e.message}`).join("; ") ??
        `HTTP ${res.status}`;
      throw new Error(`La purga del CDN falló: ${detalle}`);
    }
  }
}
