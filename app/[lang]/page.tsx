import { ActivityFeed } from "@/app/_components/activity-feed";
import { BoardRow } from "@/app/_components/board-row";
import { Counters } from "@/app/_components/counters";
import { EmptyBoard } from "@/app/_components/empty-board";
import { Hero } from "@/app/_components/hero";
import { Pagination } from "@/app/_components/pagination";
import { Podium } from "@/app/_components/podium";
import {
  getActivity,
  getBoardSnapshot,
  getBoardStats,
  getCatalogPage,
  getPodium,
} from "@/lib/board";
import { priceToTakeRank } from "@/lib/bidding";
import { getDictionary } from "@/lib/i18n";
import { resolveLocale } from "@/lib/i18n/config";

/** Revalidación corta; el webhook invalida el tag al confirmar una puja. */
export const revalidate = 10;

/** Ancla del catálogo, para que el paginador no te devuelva arriba de todo. */
export const CATALOG_ANCHOR = "catalogo";

export default async function Home({
  params,
  searchParams,
}: PageProps<"/[lang]">) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);
  const locale = resolveLocale(lang);
  const copy = getDictionary(locale);

  const requested = Number(Array.isArray(query.p) ? query.p[0] : query.p);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;

  const [podium, catalog, stats, activity, snapshot] = await Promise.all([
    getPodium(),
    getCatalogPage(page),
    getBoardStats(),
    getActivity(),
    getBoardSnapshot(),
  ]);

  const prices: Record<number, number> = {};
  for (const entry of [...podium, ...catalog.entries]) {
    prices[entry.rank] = priceToTakeRank(snapshot, entry.rank);
  }

  const isEmpty = podium.length === 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7 px-4 pt-2 pb-6 sm:px-6 sm:pb-8">
      <Hero board={snapshot} />

      {isEmpty ? (
        <EmptyBoard lang={locale} />
      ) : (
        <>
          {/*
            Encabezado y contadores comparten fila en pantallas anchas: en dos
            filas empujaban la foto del #1 fuera de la primera pantalla.
          */}
          <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <h2 className="font-display text-2xl leading-tight text-ink sm:text-3xl">
              {copy.board.heading}
            </h2>
            <div className="lg:w-[34rem]">
              <Counters lang={locale} stats={stats} />
            </div>
          </section>

          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-10">
            <div className="flex min-w-0 flex-1 flex-col gap-8">
              {/*
                La mesa de honor queda FUERA del paginador: los tres primeros
                se ven en todas las páginas. Solo se pagina el catálogo.
              */}
              <Podium lang={locale} entries={podium} prices={prices} />

              {catalog.entries.length > 0 ? (
                <section
                  id={CATALOG_ANCHOR}
                  className="flex scroll-mt-24 flex-col gap-3"
                >
                  <h2 className="label-cat">{copy.board.rest}</h2>
                  <ul className="border-y border-rule">
                    {catalog.entries.map((entry) => (
                      <BoardRow lang={locale}
                        key={entry.id}
                        entry={entry}
                        takePriceCents={prices[entry.rank] ?? 0}
                      />
                    ))}
                  </ul>
                  <Pagination lang={locale}
                    page={catalog.page}
                    totalPages={catalog.totalPages}
                    total={catalog.total}
                  />
                </section>
              ) : null}
            </div>

            <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-64">
              <ActivityFeed initial={activity} />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
