import "server-only";

import { imageUrl } from "@/lib/images";
import { isR2Configured } from "@/lib/storage";

/**
 * Moderación automática de imágenes.
 *
 * El resto del sistema solo conoce los tres veredictos. Cambiar de
 * proveedor es escribir otra función acá abajo y sumar un caso.
 *
 * MODERATION_PROVIDER:
 *   "permissive"  -> aprueba todo. SOLO desarrollo.
 *   "review"      -> default seguro: nada se publica sin ojo humano.
 *   "sightengine" -> revisión automática real (requiere usuario y secreto).
 */

export const VERDICTS = {
  OK: "ok",
  REJECT: "reject",
  REVIEW: "review",
} as const;

export type Verdict = (typeof VERDICTS)[keyof typeof VERDICTS];

export const PROVIDERS = {
  PERMISSIVE: "permissive",
  REVIEW: "review",
  SIGHTENGINE: "sightengine",
} as const;

/** Umbrales. Por encima del alto se rechaza; en el medio va a revisión. */
const REJECT_AT = 0.7;
const REVIEW_AT = 0.35;

interface SightengineResponse {
  status?: string;
  nudity?: Record<string, unknown>;
  gore?: { prob?: number };
  weapon?: number | { classes?: Record<string, number> };
  offensive?: { prob?: number };
}

/** El peor puntaje entre todas las categorías que nos importan. */
function worstScore(data: SightengineResponse): number {
  const scores: number[] = [];

  const nudity = data.nudity ?? {};
  for (const [key, value] of Object.entries(nudity)) {
    // `none` es la probabilidad de que NO haya nada: se ignora.
    if (key === "none" || key === "context") continue;
    if (typeof value === "number") scores.push(value);
  }

  if (typeof data.gore?.prob === "number") scores.push(data.gore.prob);
  if (typeof data.offensive?.prob === "number") scores.push(data.offensive.prob);
  if (typeof data.weapon === "number") scores.push(data.weapon);

  return scores.length ? Math.max(...scores) : 0;
}

async function sightengine(key: string): Promise<Verdict> {
  const user = process.env.SIGHTENGINE_USER;
  const secret = process.env.SIGHTENGINE_SECRET;
  if (!user || !secret) return VERDICTS.REVIEW;

  /**
   * Sightengine descarga la imagen por URL. Sin R2 configurado la imagen
   * vive en disco local y no es alcanzable desde afuera, así que en ese
   * caso no se puede moderar automáticamente: va a revisión.
   */
  if (!isR2Configured() && !/^https?:\/\//.test(key)) return VERDICTS.REVIEW;

  const params = new URLSearchParams({
    url: imageUrl(key),
    models: "nudity-2.1,gore-2.0,offensive-2.0,weapon",
    api_user: user,
    api_secret: secret,
  });

  try {
    const response = await fetch(
      `https://api.sightengine.com/1.0/check.json?${params}`,
      { signal: AbortSignal.timeout(10_000) },
    );

    if (!response.ok) return VERDICTS.REVIEW;

    const data = (await response.json()) as SightengineResponse;
    if (data.status !== "success") return VERDICTS.REVIEW;

    const worst = worstScore(data);
    if (worst >= REJECT_AT) return VERDICTS.REJECT;
    if (worst >= REVIEW_AT) return VERDICTS.REVIEW;
    return VERDICTS.OK;
  } catch {
    // Un fallo del proveedor NUNCA publica: cae a revisión manual.
    return VERDICTS.REVIEW;
  }
}

/** Proveedor activo, para poder avisar en el panel si no hay control real. */
export function activeModerationProvider(): string {
  return process.env.MODERATION_PROVIDER ?? PROVIDERS.REVIEW;
}

/**
 * ¿Hay un control automático de verdad corriendo?
 *
 * Importa mucho desde que se publica al pagar: sin control real, cualquier
 * foto entra al tablero y a la imagen que se comparte en WhatsApp.
 */
export function hasAutomaticModeration(): boolean {
  return (
    activeModerationProvider() === PROVIDERS.SIGHTENGINE &&
    Boolean(process.env.SIGHTENGINE_USER && process.env.SIGHTENGINE_SECRET)
  );
}

export async function moderateImage(key: string): Promise<Verdict> {
  switch (process.env.MODERATION_PROVIDER) {
    case PROVIDERS.PERMISSIVE:
      return VERDICTS.OK;
    case PROVIDERS.SIGHTENGINE:
      return sightengine(key);
    default:
      return VERDICTS.REVIEW;
  }
}
