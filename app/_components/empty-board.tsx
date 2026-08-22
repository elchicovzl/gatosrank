import { ButtonLink } from "@/app/_components/button";
import { getDictionary } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/i18n/config";

interface EmptyBoardProps {
  /** Idioma activo: los componentes de servidor no pueden usar contexto. */
  lang: Locale;
}

export function EmptyBoard({ lang }: EmptyBoardProps) {
  const copy = getDictionary(lang);
  return (
    <div className="rounded-[var(--radius-card)] border border-rule bg-paper px-6 py-16 text-center shadow-[var(--shadow-card)]">
      <p className="font-display text-2xl text-ink">{copy.board.emptyTitle}</p>
      <p className="mx-auto mt-3 max-w-md text-ink-soft">
        {copy.board.emptyBody}
      </p>
      <ButtonLink href={localePath(lang, "/entrar?puesto=1")} size="lg" className="mt-6">
        {copy.board.emptyCta}
      </ButtonLink>
    </div>
  );
}
