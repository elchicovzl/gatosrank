/**
 * Solo dólares enteros. Todo el sistema habla en centavos y nunca
 * produce un monto que no sea múltiplo de 100.
 */
export const MIN_ENTRY_CENTS = 300;
export const STEP_CENTS = 100;

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars) * STEP_CENTS;
}

export function centsToDollars(cents: number): number {
  return Math.round(cents / STEP_CENTS);
}

/**
 * `$7`, `$412`. Sin decimales: no existen los centavos de cara al usuario.
 * El separador de miles cambia con el idioma: $2.105 vs $2,105.
 */
export function formatMoney(cents: number, locale: "es" | "en" = "es"): string {
  // Etiqueta regional: "es" a secas no agrupa los millares de cuatro cifras.
  const tag = locale === "en" ? "en-US" : "es-CO";
  return `$${centsToDollars(cents).toLocaleString(tag)}`;
}

/** Redondea al dólar entero y aplica el piso de entrada. */
export function normalizeAmount(cents: number): number {
  const whole = Math.round(cents / STEP_CENTS) * STEP_CENTS;
  return Math.max(MIN_ENTRY_CENTS, whole);
}

export function isValidAmount(cents: number): boolean {
  return (
    Number.isInteger(cents) &&
    cents >= MIN_ENTRY_CENTS &&
    cents % STEP_CENTS === 0
  );
}
