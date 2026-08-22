/**
 * Handles reservados.
 *
 * El @usuario NO es único a propósito: una persona con tres gatos los
 * inscribe a los tres con el mismo handle, y forzar unicidad convertiría
 * el campo en una carrera por apropiarse de nombres ajenos.
 *
 * Lo que sí se bloquea es hacerse pasar por el sitio o por su equipo.
 *
 * Este módulo NO es `server-only` a propósito: el formulario valida al
 * tipear para que nadie se entere recién después de pagar. El servidor
 * vuelve a validar igual — el cliente avisa, el servidor decide.
 */

const RESERVED = [
  // El sitio y sus variantes
  "topcats", "topcat", "topcatslol", "topcatsoficial", "topcatsoficial",
  // Autoridad
  "admin", "administrador", "administracion", "moderador", "moderacion",
  "mod", "staff", "equipo", "team", "oficial", "official", "verificado",
  "verified", "sistema", "system", "root", "superadmin", "owner",
  // Canales que la gente confundiría con soporte real
  "soporte", "support", "ayuda", "help", "contacto", "contact", "info",
  "seguridad", "security", "abuso", "abuse", "legal", "privacidad",
  "facturacion", "billing", "pagos", "payments", "cobros", "reembolsos",
  "refunds", "noreply", "noresponder",
  // Nombres de ruta: un @usuario igual a una sección confunde
  "entrar", "reglas", "gato", "gatos", "listo", "api", "www", "assets",
] as const;

/**
 * Normaliza para comparar: sin @, sin puntos ni guiones bajos, en minúscula.
 * Así `Top.Cats`, `top_cats` y `TOPCATS` caen todos en el mismo bloqueo.
 *
 * No persigue sustituciones de dígitos por letras (`t0pcats`): eso es una
 * carrera sin final y el botón de reportar cubre lo que se escape.
 */
export function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, "")
    .replace(/[._]/g, "")
    .toLowerCase();
}

const RESERVED_SET = new Set<string>(RESERVED.map(normalizeHandle));

export function isReservedHandle(raw: string): boolean {
  const normalized = normalizeHandle(raw);
  if (!normalized) return false;
  return RESERVED_SET.has(normalized);
}

/** Formato aceptado. Se comparte entre el formulario y el servidor. */
export const HANDLE_PATTERN = /^[a-zA-Z0-9._]{1,30}$/;

export function isValidHandleFormat(raw: string): boolean {
  const handle = raw.trim().replace(/^@+/, "");
  return handle.length === 0 || HANDLE_PATTERN.test(handle);
}
