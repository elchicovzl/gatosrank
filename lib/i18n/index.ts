import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { en } from "@/lib/i18n/en";
import { es } from "@/lib/i18n/es";

/**
 * La forma del diccionario la define el español, que es el idioma fuente.
 * `en.ts` está tipado con esto: si acá se agrega una clave y allá falta,
 * no compila. Es lo único que evita que la traducción quede a medias sin
 * que nadie lo note hasta que un usuario ve un texto vacío.
 */
export type Dictionary = typeof es;

const DICTIONARIES: Record<Locale, Dictionary> = { es, en };

/**
 * NO es `server-only` a propósito: el diccionario tiene funciones
 * (`takeRank(rank)`, `showingRange(a, b, c)`) y las funciones no cruzan la
 * frontera servidor→cliente. Por eso el proveedor del cliente recibe el
 * CÓDIGO de idioma y elige el diccionario acá, del lado del navegador.
 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}
