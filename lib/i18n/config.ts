/**
 * Configuración de idiomas.
 *
 * Las URLs llevan prefijo en AMBOS idiomas (`/es/...`, `/en/...`) a
 * propósito: este proyecto vive de que la gente comparta links, y con
 * prefijo un link compartido llega en el idioma en que se compartió.
 * Con cookie, no.
 */

export const LOCALES = ["es", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

/** Etiqueta del selector, en su propio idioma. */
export const LOCALE_LABELS: Record<Locale, string> = {
  es: "Español",
  en: "English",
};

/** Para el atributo `lang` y los `hreflang`. */
export const LOCALE_TAGS: Record<Locale, string> = {
  es: "es-419",
  en: "en",
};

/**
 * `params.lang` llega como `string`. Esto lo valida y lo acota al tipo.
 * El layout ya devuelve 404 si no es un idioma conocido, así que el
 * fallback solo cubre el caso imposible.
 */
export function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * Bloque `alternates` para el metadata de UNA página.
 *
 * Tiene que apuntar a la MISMA página en el otro idioma. Si todas las
 * páginas heredan las alternativas de la portada, le estamos diciendo a
 * Google que /en/gato/michi y /es son equivalentes — y no lo son.
 */
export function localeAlternates(locale: Locale, path: string) {
  return {
    canonical: localePath(locale, path),
    languages: Object.fromEntries(
      LOCALES.map((l) => [LOCALE_TAGS[l], localePath(l, path)]),
    ),
  };
}

/** Antepone el idioma a una ruta interna. `/gato/michi` -> `/es/gato/michi` */
export function localePath(locale: Locale, path: string): string {
  const clean = path === "/" ? "" : path.replace(/^\/+/, "/");
  return `/${locale}${clean}`;
}
