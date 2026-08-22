import "server-only";

/**
 * Limitador en memoria, por proceso. No es distribuido y no pretende serlo:
 * lo único que evita es que alguien llene el bucket subiendo fotos gratis
 * antes de pagar. Para un proyecto de vida corta alcanza.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

/** Identificador del que llama. Detrás de Vercel llega en x-forwarded-for. */
export function callerKey(req: Request, prefix: string): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "local";
  return `${prefix}:${ip}`;
}
