import { buttonClass, ButtonLink } from "@/app/_components/button";
import { PAGE_SIZE, PODIUM_SIZE } from "@/lib/board";
import { cn } from "@/lib/cn";
import { getDictionary } from "@/lib/i18n";
import { type Locale } from "@/lib/i18n/config";

interface PaginationProps {
  /** Idioma activo: los componentes de servidor no pueden usar contexto. */
  lang: Locale;
  page: number;
  totalPages: number;
  /** Total de ejemplares en el catálogo, sin contar la mesa de honor. */
  total: number;
}

/**
 * Pie del catálogo general.
 *
 * El rango se muestra SIEMPRE, incluso con una sola página: si se oculta
 * todo, no hay forma de saber si el catálogo termina ahí o si el paginador
 * se rompió. Los botones aparecen solo cuando hay a dónde ir.
 *
 * Los enlaces apuntan al ancla `#catalogo`: sin eso, cambiar de página te
 * deja arriba de todo y hay que scrollear el hero y el podio otra vez.
 */
export function Pagination({
  lang,
 page, totalPages, total }: PaginationProps) {
  const copy = getDictionary(lang);
  if (total <= 0) return null;

  /*
    Los puestos se derivan acá y no dentro del texto: el catálogo arranca
    después de la mesa de honor, y meter ese desfase en `copy.ts` lo rompe
    en silencio si alguna vez el podio deja de ser de tres.
  */
  const firstRank = PODIUM_SIZE + (page - 1) * PAGE_SIZE + 1;
  const lastRank = PODIUM_SIZE + Math.min(page * PAGE_SIZE, total);
  const totalOnBoard = total + PODIUM_SIZE;

  const range = (
    <span className="tnum text-sm text-ink-soft">
      {copy.board.showingRange(firstRank, lastRank, totalOnBoard)}
    </span>
  );

  // Una sola página: alcanza con decir cuántos hay.
  if (totalPages <= 1) {
    return (
      <div className="flex justify-center border-t border-rule-soft pt-4">
        {range}
      </div>
    );
  }

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-rule-soft pt-4">
      {page > 1 ? (
        <ButtonLink
          href={{ pathname: "/", query: { p: page - 1 }, hash: "catalogo" }}
          variant="secondary"
          size="sm"
        >
          <span aria-hidden>←</span>
          {copy.board.pagePrev}
        </ButtonLink>
      ) : (
        <span className={cn(buttonClass("secondary", "sm"), "opacity-40")}>
          <span aria-hidden>←</span>
          {copy.board.pagePrev}
        </span>
      )}

      <span className="order-last w-full text-center sm:order-none sm:w-auto">
        {range}
      </span>

      {page < totalPages ? (
        <ButtonLink
          href={{ pathname: "/", query: { p: page + 1 }, hash: "catalogo" }}
          variant="secondary"
          size="sm"
        >
          {copy.board.pageNext}
          <span aria-hidden>→</span>
        </ButtonLink>
      ) : (
        <span className={cn(buttonClass("secondary", "sm"), "opacity-40")}>
          {copy.board.pageNext}
          <span aria-hidden>→</span>
        </span>
      )}
    </nav>
  );
}
