"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLocale } from "@/app/_components/copy-provider";
import { cn } from "@/lib/cn";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";

/**
 * Selector de idioma.
 *
 * Conserva la página: si estás mirando /es/gato/michi, el botón te lleva a
 * /en/gato/michi y no a la portada. Perder el contexto al cambiar de idioma
 * es la forma más rápida de que alguien no vuelva a tocarlo.
 *
 * Son enlaces de verdad, no un `router.push`: se pueden abrir en otra
 * pestaña y los buscadores los siguen.
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const actual = useLocale();
  const pathname = usePathname();

  /** El resto de la ruta, sin el prefijo de idioma. */
  const resto = pathname.replace(/^\/(es|en)(?=\/|$)/, "") || "/";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-rule bg-paper p-0.5",
        className,
      )}
    >
      {LOCALES.map((locale) => {
        const activo = locale === actual;
        return (
          <Link
            key={locale}
            href={`/${locale}${resto === "/" ? "" : resto}`}
            hrefLang={locale}
            aria-current={activo ? "true" : undefined}
            title={LOCALE_LABELS[locale]}
            className={cn(
              "flex min-h-8 items-center rounded-full px-2.5 text-xs font-semibold uppercase transition-colors",
              activo
                ? "bg-ink text-paper"
                : "text-ink-faint hover:bg-bone-deep hover:text-ink",
            )}
          >
            {locale}
            <span className="sr-only"> — {LOCALE_LABELS[locale]}</span>
          </Link>
        );
      })}
    </div>
  );
}
