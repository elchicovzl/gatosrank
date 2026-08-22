import Link from "next/link";

import { ButtonLink } from "@/app/_components/button";
import { LanguageSwitch } from "@/app/_components/language-switch";
import { LiveStatsPill } from "@/app/_components/live-stats";
import { TopcatsLockup } from "@/app/_components/topcats-logo";
import { getDictionary } from "@/lib/i18n";
import type { LiveStats } from "@/lib/presence";
import { localePath, type Locale } from "@/lib/i18n/config";

interface MastheadProps {
  /** Idioma activo: los componentes de servidor no pueden usar contexto. */
  lang: Locale;
  stats: LiveStats;
}

export function Masthead({
  lang,
 stats }: MastheadProps) {
  const copy = getDictionary(lang);
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-bone/85 backdrop-blur">
      {/*
        Tres columnas con la del medio centrada respecto al contenedor:
        con `flex` la píldora se centraría respecto al hueco que dejan los
        costados, que no son del mismo ancho.
      */}
      <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6">
        <Link href={localePath(lang, "/")} aria-label={copy.site.domain} className="justify-self-start">
          <TopcatsLockup className="h-9 text-ink sm:h-11" />
        </Link>

        <LiveStatsPill initial={stats} className="justify-self-center" />

        <nav className="flex items-center gap-1 justify-self-end sm:gap-2">
          <Link
            href={localePath(lang, "/reglas")}
            className="hidden min-h-11 items-center rounded-full px-3 text-[0.9375rem] text-ink-soft transition-colors hover:bg-bone-deep hover:text-ink lg:inline-flex"
          >
            {copy.nav.rules}
          </Link>
          <LanguageSwitch />
          <ButtonLink
            href={localePath(lang, "/entrar")}
            size="sm"
            className="sm:min-h-11 sm:px-5"
          >
            {copy.nav.enter}
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
