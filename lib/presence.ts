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

/** Lo que se muestra cuando todavía no hay datos: vos, mirando. */
const ALONE: LiveStats = { online: 1, visitors: 1 };

export async function readLiveStats(): Promise<LiveStats> {
  const since = new Date(Date.now() - ONLINE_WINDOW_MS);

  /*
    Esta consulta la hace el layout, así que corre en TODA ruta con idioma
    — incluidas las que Next prerenderiza al compilar. Si dejáramos que
    tirara la excepción, una base caída o sin migrar voltearía el build
    entero por un contador decorativo.

    Y es decorativo de verdad: la píldora es un componente cliente que late
    apenas monta y pisa este valor en milisegundos. Sirve para el primer
    pintado y para quien no tiene JavaScript, nada más.

    Devolver ALONE es honesto: si no podemos contar, mostramos lo único que
    sabemos con certeza — que hay alguien mirando la página.
  */
  try {
    const [online, visitors] = await Promise.all([
      prisma.visitor.count({ where: { lastSeenAt: { gte: since } } }),
      prisma.visitor.count(),
    ]);

    // Quien está mirando la página cuenta, incluso antes del primer latido.
    return { online: Math.max(online, 1), visitors: Math.max(visitors, 1) };
  } catch (error) {
    // Sin ruido en cada build, pero que quede rastro: si el número se
    // quedó clavado en 1, acá está el motivo.
    console.warn("[presence] no se pudieron leer los contadores:", error);
    return ALONE;
  }
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
