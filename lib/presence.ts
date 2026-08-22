import "server-only";

import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db";

/**
 * Contadores en vivo: cuánta gente hay mirando ahora y cuánta pasó en total.
 *
 * Sin websockets, como manda el plan: el cliente manda un latido y el
 * servidor cuenta quiénes latieron hace poco. Es una cookie anónima por
 * navegador — ni IP, ni user-agent, ni nada identificable.
 */

const COOKIE = "topcats_v";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Ventana de "en línea". Con latido cada 30 s tolera dos perdidos. */
export const ONLINE_WINDOW_MS = 90_000;

export interface LiveStats {
  online: number;
  visitors: number;
}

export async function readLiveStats(): Promise<LiveStats> {
  const since = new Date(Date.now() - ONLINE_WINDOW_MS);

  const [online, visitors] = await Promise.all([
    prisma.visitor.count({ where: { lastSeenAt: { gte: since } } }),
    prisma.visitor.count(),
  ]);

  // Quien está mirando la página cuenta, incluso antes del primer latido.
  return { online: Math.max(online, 1), visitors: Math.max(visitors, 1) };
}

/**
 * Para el render inicial del servidor. Se cachea unos segundos: el número
 * exacto no importa y la home se sirve muchísimo.
 */
export const getLiveStats = unstable_cache(readLiveStats, ["live-stats"], {
  revalidate: 15,
});

/** Registra el latido y devuelve los contadores frescos. */
export async function beat(): Promise<LiveStats> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  const id = existing && /^[a-f0-9-]{36}$/i.test(existing) ? existing : randomUUID();

  if (id !== existing) {
    jar.set(COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  }

  const now = new Date();
  await prisma.visitor.upsert({
    where: { id },
    create: { id, firstSeenAt: now, lastSeenAt: now },
    update: { lastSeenAt: now },
  });

  return readLiveStats();
}
