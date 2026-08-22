import { COUNTRY_CODES, PRIORITY_COUNT } from "@/lib/country-codes";
import type { Locale } from "@/lib/i18n/config";

/**
 * Países del formulario.
 *
 * Los nombres NO están escritos a mano: los da `Intl.DisplayNames`, que ya
 * los tiene traducidos. Escribir 258 nombres × 2 idiomas sería mantener a
 * mano algo que el runtime ya sabe — y con el tiempo quedaría desfasado.
 */

export type CountryCode = string;

export interface Country {
  code: string;
  name: string;
  /** Nombre sin acentos y en minúscula, para buscar. */
  search: string;
}

const CODES = new Set(COUNTRY_CODES);

export function isCountryCode(value: string): boolean {
  return CODES.has(value);
}

/** Quita acentos: así "mexico" encuentra "México" y "peru" encuentra "Perú". */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const cache = new Map<Locale, Country[]>();

export function countries(locale: Locale): Country[] {
  const hit = cache.get(locale);
  if (hit) return hit;

  const display = new Intl.DisplayNames([locale], { type: "region" });
  const list = COUNTRY_CODES.map((code) => {
    const name = display.of(code) ?? code;
    return { code, name, search: `${normalize(name)} ${code.toLowerCase()}` };
  });

  cache.set(locale, list);
  return list;
}

/** Dónde termina el bloque de países cercanos y empieza el resto. */
export { PRIORITY_COUNT };

export function countryName(code: string | null, locale: Locale): string | null {
  if (!code || !isCountryCode(code)) return null;
  return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
}

/** ISO-2 -> emoji de bandera vía Regional Indicator Symbols. */
export function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return "";
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "";
  return String.fromCodePoint(
    ...[...upper].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

export function searchCountries(locale: Locale, query: string): Country[] {
  const q = normalize(query);
  if (!q) return countries(locale);
  return countries(locale).filter((c) => c.search.includes(q));
}
