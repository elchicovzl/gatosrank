import type { MetadataRoute } from "next";

import { prisma } from "@/lib/db";
import { LOCALES, LOCALE_TAGS, localePath } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/payments-core";

export const revalidate = 3600;

/**
 * Sitemap con las dos versiones y `hreflang` entre ellas.
 *
 * Sin `alternates.languages`, Google trata /es/... y /en/... como contenido
 * duplicado, elige una y descarta la otra.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const cats = await prisma.cat.findMany({
    where: { status: "LIVE" },
    orderBy: [{ amountCents: "desc" }, { firstBidAt: "asc" }],
    take: 2000,
    select: { slug: true, firstBidAt: true },
  });

  /** Las dos URLs de una misma página, para el bloque de alternates. */
  function alternates(path: string) {
    return {
      languages: Object.fromEntries(
        LOCALES.map((l) => [LOCALE_TAGS[l], `${base}${localePath(l, path)}`]),
      ),
    };
  }

  const paginas: { path: string; changeFrequency: "hourly" | "daily" | "weekly" | "monthly"; priority: number }[] = [
    { path: "/", changeFrequency: "hourly", priority: 1 },
    { path: "/entrar", changeFrequency: "weekly", priority: 0.8 },
    { path: "/reglas", changeFrequency: "monthly", priority: 0.4 },
    { path: "/privacidad", changeFrequency: "monthly", priority: 0.2 },
  ];

  const estaticas = LOCALES.flatMap((locale) =>
    paginas.map((p) => ({
      url: `${base}${localePath(locale, p.path)}`,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
      alternates: alternates(p.path),
    })),
  );

  const fichas = LOCALES.flatMap((locale) =>
    cats.map((cat) => ({
      url: `${base}${localePath(locale, `/gato/${cat.slug}`)}`,
      lastModified: cat.firstBidAt ?? undefined,
      changeFrequency: "daily" as const,
      priority: 0.6,
      alternates: alternates(`/gato/${cat.slug}`),
    })),
  );

  return [...estaticas, ...fichas];
}
