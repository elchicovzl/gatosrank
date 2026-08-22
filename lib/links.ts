/**
 * Manejo del enlace de destino de cada ejemplar.
 *
 * Dos reglas:
 *  1. No entran acortadores. Si detectamos uno, lo resolvemos ANTES de
 *     guardar, para que el destino real quede visible y auditable.
 *  2. Al redirigir se limpian los parámetros de TRACKING. No todos los
 *     query params: borrarlos todos rompería youtube.com/watch?v=…
 */

const SHORTENERS = new Set([
  "bit.ly",
  "t.co",
  "tinyurl.com",
  "goo.gl",
  "ow.ly",
  "buff.ly",
  "is.gd",
  "cutt.ly",
  "rebrand.ly",
  "shorturl.at",
  "rb.gy",
  "linktr.ee",
  "s.id",
  "bl.ink",
  "lnkd.in",
  "youtu.be",
  "amzn.to",
  "spoti.fi",
  "shrtco.de",
  "tiny.cc",
  "v.gd",
  "clck.ru",
  "surl.li",
]);

const TRACKING_PARAMS = [
  /^utm_/i,
  /^fbclid$/i,
  /^gclid$/i,
  /^dclid$/i,
  /^msclkid$/i,
  /^mc_[ce]id$/i,
  /^igshid$/i,
  /^ttclid$/i,
  /^twclid$/i,
  /^yclid$/i,
  /^_hs(enc|mi)$/i,
  /^ref_src$/i,
  /^vero_(id|conv)$/i,
  /^wickedid$/i,
  /^si$/i,
];

export function isShortener(url: URL): boolean {
  return SHORTENERS.has(url.hostname.replace(/^www\./, "").toLowerCase());
}

/** Solo http(s), solo hosts públicos. Nada de javascript:, data:, localhost. */
export function parsePublicUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
    !host.includes(".")
  ) {
    return null;
  }

  return url;
}

/** Quita los parámetros de tracking y deja el resto intacto. */
export function stripTracking(raw: string): string {
  const url = parsePublicUrl(raw);
  if (!url) return raw;

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.some((pattern) => pattern.test(key))) {
      url.searchParams.delete(key);
    }
  }

  return url.toString();
}

const MAX_HOPS = 5;

/**
 * Sigue los redirects de un acortador hasta el destino real.
 * Si no resuelve, devuelve null: preferimos rechazar el enlace a guardar
 * un intermediario que puede cambiar de destino después del pago.
 */
export async function resolveShortener(url: URL): Promise<URL | null> {
  let current = url;

  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    let response: Response;
    try {
      response = await fetch(current, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      return null;
    }

    const location = response.headers.get("location");
    if (!location) {
      return response.ok || response.status === 405 ? current : null;
    }

    const next = parsePublicUrl(new URL(location, current).toString());
    if (!next) return null;
    if (!isShortener(next)) return next;

    current = next;
  }

  return null;
}

/**
 * Normaliza el enlace que manda el usuario.
 * Devuelve `null` cuando no hay enlace (los clics van a la ficha del gato).
 */
export async function normalizeLink(
  raw: string | null | undefined,
): Promise<{ url: string | null } | { error: "invalid" | "shortener" }> {
  const trimmed = raw?.trim();
  if (!trimmed) return { url: null };

  const parsed = parsePublicUrl(trimmed);
  if (!parsed) return { error: "invalid" };

  if (!isShortener(parsed)) return { url: parsed.toString() };

  const resolved = await resolveShortener(parsed);
  if (!resolved) return { error: "shortener" };

  return { url: resolved.toString() };
}
