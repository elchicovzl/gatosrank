import { headers } from "next/headers";

import { ButtonLink } from "@/app/_components/button";
import { getDictionary } from "@/lib/i18n";
import { localePath, resolveLocale } from "@/lib/i18n/config";

/**
 * El 404 no recibe `params`: Next no se los pasa. El idioma llega por una
 * cabecera que pone el middleware — sin eso habría que elegir uno fijo y
 * mostrarle español a alguien que venía navegando en inglés.
 */
export default async function NotFound() {
  const locale = resolveLocale((await headers()).get("x-topcats-locale") ?? "");
  const copy = getDictionary(locale);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 py-24 text-center sm:px-6">
      <p className="font-display text-6xl leading-none text-ink-faint">404</p>
      <h1 className="font-display text-2xl text-ink">{copy.errors.notFound}</h1>
      <ButtonLink href={localePath(locale, "/")} size="lg">
        {copy.errors.notFoundCta}
      </ButtonLink>
    </div>
  );
}
