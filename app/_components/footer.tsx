import Link from "next/link";

import { getDictionary } from "@/lib/i18n";
import { localePath, type Locale } from "@/lib/i18n/config";

interface FooterProps {
  /** Idioma activo: los componentes de servidor no pueden usar contexto. */
  lang: Locale;
}

export function Footer({ lang }: FooterProps) {
  const copy = getDictionary(lang);
  return (
    <footer className="mt-16 border-t border-rule">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="meta">
          {copy.site.domain} · {copy.site.subtitle}
        </p>
        <nav className="flex gap-2">
          <Link
            href={localePath(lang, "/reglas")}
            className="meta flex min-h-10 items-center px-2 hover:text-ink"
          >
            {copy.nav.rules}
          </Link>
          <Link
            href={localePath(lang, "/privacidad")}
            className="meta flex min-h-10 items-center px-2 hover:text-ink"
          >
            {copy.nav.privacy}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
