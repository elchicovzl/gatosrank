import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

/**
 * Acceso al panel de moderación.
 *
 * Sin cuentas ni base de usuarios: un token en el entorno. Para un panel
 * que usa una sola persona durante unas semanas, cualquier cosa más grande
 * es infraestructura que nadie pidió.
 */

const COOKIE = "topcats_admin";
const MAX_AGE = 60 * 60 * 24 * 7;

/**
 * Se comparan hashes de largo fijo: comparar los tokens crudos con `===`
 * filtra información por tiempo de ejecución.
 */
function matches(candidate: string, expected: string): boolean {
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function isAdmin(): Promise<boolean> {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;

  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;

  return matches(token, expected);
}

export async function signIn(token: string): Promise<boolean> {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !token) return false;
  if (!matches(token, expected)) return false;

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });

  return true;
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
