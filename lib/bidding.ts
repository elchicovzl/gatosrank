import { MIN_ENTRY_CENTS, STEP_CENTS } from "./money";

/**
 * Reglas de puja de topcats.lol. Módulo puro, sin dependencias.
 *
 * Lo consumen tres lugares que DEBEN coincidir siempre:
 *   - la previa en vivo de /entrar (cliente)
 *   - el cálculo de precio del tablero (servidor)
 *   - el webhook de pago confirmado (servidor)
 *
 * Invariante central: el puesto NO se almacena. Se deriva de
 * (amountCents DESC, firstBidAt ASC) sobre los gatos LIVE.
 */

export interface BoardEntry {
  id: string;
  slug: string;
  name: string;
  imageKey: string;
  ownerHandle: string | null;
  country: string | null;
  amountCents: number;
  /** Epoch en ms. Menor = más viejo = gana el desempate. */
  firstBidAt: number;
}

/**
 * Antigüedad de quien todavía no pujó: llega último, así que pierde
 * cualquier empate contra un gato que ya está en el tablero.
 */
export const NEWCOMER_SENIORITY = Number.POSITIVE_INFINITY;

/** ¿`other` va por encima de un gato con este monto y esta antigüedad? */
function outranks(
  other: BoardEntry,
  amountCents: number,
  seniority: number,
): boolean {
  if (other.amountCents !== amountCents) return other.amountCents > amountCents;
  return other.firstBidAt < seniority;
}

/**
 * Puesto (1-indexado) que ocuparía un gato con este monto y esta antigüedad.
 * `selfId` se excluye del conteo — se usa al proyectar una subida de puja.
 */
export function rankFor(
  board: readonly BoardEntry[],
  amountCents: number,
  seniority: number = NEWCOMER_SENIORITY,
  selfId?: string,
): number {
  let above = 0;
  for (const entry of board) {
    if (selfId && entry.id === selfId) continue;
    if (outranks(entry, amountCents, seniority)) above += 1;
  }
  return above + 1;
}

/**
 * PRECONDICIÓN de todo este módulo: `board` llega en el orden canónico
 * (amountCents DESC, firstBidAt ASC). Es como sale de la base y como se
 * serializa al cliente. Filtrar preserva el orden, así que no se reordena.
 */
function boardWithout(
  board: readonly BoardEntry[],
  selfId?: string,
): readonly BoardEntry[] {
  return selfId ? board.filter((e) => e.id !== selfId) : board;
}

/** Ordena un tablero desordenado. Solo hace falta en los bordes del sistema. */
export function sortBoard(board: readonly BoardEntry[]): BoardEntry[] {
  return [...board].sort(
    (a, b) => b.amountCents - a.amountCents || a.firstBidAt - b.firstBidAt,
  );
}

/**
 * Cuánto cuesta quedarse con un puesto concreto.
 * Ocupado -> la puja de ese puesto + $1. Libre -> el mínimo de entrada.
 */
export function priceToTakeRank(
  board: readonly BoardEntry[],
  rank: number,
  selfId?: string,
): number {
  const rest = boardWithout(board, selfId);
  const occupant = rest[rank - 1];
  if (!occupant) return MIN_ENTRY_CENTS;
  return occupant.amountCents + STEP_CENTS;
}

/** Quién ocupa hoy ese puesto, si hay alguien. */
export function occupantOfRank(
  board: readonly BoardEntry[],
  rank: number,
  selfId?: string,
): BoardEntry | null {
  return boardWithout(board, selfId)[rank - 1] ?? null;
}

export interface Projection {
  /** Puesto que se obtiene con este monto. */
  rank: number;
  /** Puesto actual. null si el ejemplar todavía no está en el tablero. */
  currentRank: number | null;
  /** true si el movimiento mejora el puesto. Una subida puede NO mover. */
  improves: boolean;
  /**
   * A quién se empuja hacia abajo. null si el puesto estaba libre o si el
   * ejemplar ya estaba por encima de ese gato — subir de $412 a $413 siendo
   * el #1 no "tumba" a nadie.
   */
  displaced: BoardEntry | null;
  /** Quién queda inmediatamente arriba. null si es el #1. */
  above: BoardEntry | null;
  /** Quién queda inmediatamente abajo tras el movimiento. */
  below: BoardEntry | null;
  /** Lo que hay que pagar AHORA (delta si es una subida de puja). */
  chargeCents: number;
  /** La puja total que queda registrada. */
  resultingCents: number;
}

/**
 * Proyecta el resultado de pagar `targetCents`.
 *
 * - Gato nuevo (`selfId` sin definir): se cobra el monto completo.
 * - Gato existente: se cobra solo la diferencia contra su monto actual,
 *   y conserva su `firstBidAt` (la antigüedad no se pierde al subir).
 */
export function project(
  board: readonly BoardEntry[],
  targetCents: number,
  selfId?: string,
): Projection {
  const self = selfId ? board.find((e) => e.id === selfId) : undefined;
  const seniority = self ? self.firstBidAt : NEWCOMER_SENIORITY;
  const rest = boardWithout(board, selfId);

  const rank = rankFor(rest, targetCents, seniority);
  const currentRank = self ? rankFor(rest, self.amountCents, seniority) : null;
  const improves = currentRank === null || rank < currentRank;

  const occupant = rest[rank - 1] ?? null;
  const above = rest[rank - 2] ?? null;

  const chargeCents = self
    ? Math.max(0, targetCents - self.amountCents)
    : targetCents;

  return {
    rank,
    currentRank,
    improves,
    // Solo se "tumba" a alguien si de verdad se le pasa por encima.
    displaced: improves ? occupant : null,
    above,
    below: occupant,
    chargeCents,
    resultingCents: targetCents,
  };
}

/** Monto mínimo válido para una subida de puja: monto actual + $1. */
export function minRaiseTarget(currentCents: number): number {
  return currentCents + STEP_CENTS;
}

/**
 * Piso para cualquier operación: entrar cuesta al menos el mínimo,
 * subir cuesta al menos un dólar más que lo que ya pusiste.
 */
export function minTargetFor(currentCents: number | null): number {
  if (currentCents === null || currentCents <= 0) return MIN_ENTRY_CENTS;
  return minRaiseTarget(currentCents);
}

/** Puestos que la tira del paso 4 ofrece como atajo. */
export const SHOWCASE_RANKS = [1, 5, 10, 25, 50] as const;
