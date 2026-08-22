import { CatalogRow } from "@/app/_components/catalog-row";
import { ReportButton } from "@/app/_components/report-button";
import { TakeSpotLink } from "@/app/_components/take-spot-link";
import type { BoardPageEntry } from "@/lib/board";
import { getDictionary } from "@/lib/i18n";
import { formatCount, timeAgo } from "@/lib/time";
import { type Locale } from "@/lib/i18n/config";

interface BoardRowProps {
  /** Idioma activo: los componentes de servidor no pueden usar contexto. */
  lang: Locale;
  entry: BoardPageEntry;
  /** Cuánto cuesta arrebatarle este puesto. */
  takePriceCents: number;
}

/**
 * Fila del catálogo, del #4 para abajo.
 *
 * En móvil la fila se parte en dos renglones a propósito: aplastar el
 * nombre y el botón en una sola línea de 358 px los vuelve ilegibles,
 * y el botón tiene que quedar al alcance del pulgar.
 */
export function BoardRow({
  lang,
 entry, takePriceCents }: BoardRowProps) {
  const copy = getDictionary(lang);
  return (
    <li className="relative border-b border-rule-soft last:border-b-0">
      {/* Toda la fila es clickeable. Enlace pagado: nofollow + sponsored. */}
      <a
        href={`/go/${entry.id}?l=${lang}`}
        target="_blank"
        rel="nofollow sponsored noopener"
        className="absolute inset-0 z-10"
      >
        <span className="sr-only">
          Ir al enlace de {entry.name}, puesto {entry.rank}
        </span>
      </a>

      <CatalogRow lang={lang}
        rank={entry.rank}
        name={entry.name}
        imageKey={entry.imageKey}
        ownerHandle={entry.ownerHandle}
        country={entry.country}
        amountCents={entry.amountCents}
        meta={`${timeAgo(entry.lastBidAt, lang)} · ${formatCount(entry.clicks, lang)} ${copy.board.clicks}`}
        action={
          <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
            <TakeSpotLink lang={lang} rank={entry.rank} priceCents={takePriceCents} />
            <ReportButton catId={entry.id} catName={entry.name} />
          </div>
        }
      />
    </li>
  );
}
