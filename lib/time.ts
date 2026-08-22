import type { Locale } from "@/lib/i18n/config";

/**
 * Tiempo relativo, corto y seco: "hace 2 min", "2 min ago".
 *
 * Usa `Intl.RelativeTimeFormat`, que ya sabe pluralizar y ordenar las
 * palabras en cada idioma. Escribir las reglas a mano funciona hasta que
 * aparece el segundo idioma y hay que reescribirlas.
 */

/**
 * Etiquetas REGIONALES, no el idioma a secas: `Intl` con "es" pelado no
 * agrupa los millares de cuatro cifras y muestra "2105" en vez de "2.105".
 * Con "es-CO" agrupa como espera la audiencia.
 */
const TAGS: Record<Locale, string> = { es: "es-CO", en: "en-US" };

/** Lo más reciente no se mide en minutos: se dice y listo. */
const JUST_NOW: Record<Locale, string> = {
  es: "ahora mismo",
  en: "just now",
};

export function timeAgo(
  date: Date | string | number,
  locale: Locale = "es",
): string {
  const then = new Date(date).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (seconds < 45) return JUST_NOW[locale];

  const rtf = new Intl.RelativeTimeFormat(TAGS[locale], {
    numeric: "always",
    style: "narrow",
  });

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return rtf.format(-Math.max(1, minutes), "minute");

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");

  const days = Math.floor(hours / 24);
  if (days < 30) return rtf.format(-days, "day");

  return rtf.format(-Math.floor(days / 30), "month");
}

/** Miles con el separador del idioma: 2.105 en español, 2,105 en inglés. */
export function formatCount(value: number, locale: Locale = "es"): string {
  return value.toLocaleString(TAGS[locale]);
}
