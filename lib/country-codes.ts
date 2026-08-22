/**
 * Países del selector: ISO-3166-1 alpha-2, solo los códigos vigentes.
 *
 * Los nombres salen de `Intl.DisplayNames`, que ya los tiene en los dos
 * idiomas. Hardcodear 240 nombres × 2 sería mantener a mano algo que el
 * runtime ya sabe.
 *
 * Se excluyen a propósito los códigos de ISO 3166-3 — países que dejaron
 * de existir (DD la RDA, SU la URSS, YU Yugoslavia, ZR Zaire…). `Intl` los
 * sigue resolviendo, así que sin filtrarlos "Alemania" aparecía dos veces
 * y se podía elegir la equivocada. También se excluye UK, que no es ISO:
 * el código del Reino Unido es GB.
 */

/** LatAm, España y Estados Unidos. Van primero: son la audiencia. */
const PRIORITY_CODES = [
  "AR", "BO", "BR", "CL", "CO", "CR", "CU", "DO",
  "EC", "SV", "GT", "HN", "MX", "NI", "PA", "PY",
  "PE", "PR", "UY", "VE", "ES", "US",
] as const;

/** El resto del mundo, por código. */
const OTHER_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO",
  "AS", "AT", "AU", "AW", "AX", "AZ", "BA", "BB",
  "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL",
  "BM", "BN", "BS", "BT", "BW", "BY", "BZ", "CA",
  "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CM",
  "CN", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ",
  "DK", "DM", "DZ", "EE", "EG", "EH", "ER", "ET",
  "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB",
  "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM",
  "GN", "GP", "GQ", "GR", "GU", "GW", "GY", "HK",
  "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN",
  "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO",
  "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP",
  "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI",
  "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA",
  "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML",
  "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT",
  "MU", "MV", "MW", "MY", "MZ", "NA", "NC", "NE",
  "NF", "NG", "NL", "NO", "NP", "NR", "NU", "NZ",
  "OM", "PF", "PG", "PH", "PK", "PL", "PM", "PN",
  "PS", "PT", "PW", "QA", "RE", "RO", "RS", "RU",
  "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH",
  "SI", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SX", "SY", "SZ", "TC", "TD", "TG", "TH",
  "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT",
  "TV", "TW", "TZ", "UA", "UG", "UZ", "VA", "VC",
  "VG", "VI", "VN", "VU", "WF", "WS", "XK", "YE",
  "YT", "ZA", "ZM", "ZW",
] as const;

export const COUNTRY_CODES: readonly string[] = [
  ...PRIORITY_CODES,
  ...OTHER_CODES,
];

/** Cuántos de arriba son los cercanos: el selector los separa con un filete. */
export const PRIORITY_COUNT = PRIORITY_CODES.length;
