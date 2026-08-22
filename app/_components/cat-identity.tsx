import { cn } from "@/lib/cn";
import { countryName, flagEmoji } from "@/lib/countries";
import type { Locale } from "@/lib/i18n/config";

interface CatIdentityProps {
  name: string;
  ownerHandle: string | null;
  country: string | null;
  size?: "row" | "hero" | "dense";
  /** Idioma activo: el nombre del país sale de `Intl`. */
  lang: Locale;
  className?: string;
}

/** Nombre + @usuario + banderita. Se repite en fila, podio y ficha. */
export function CatIdentity({
  name,
  ownerHandle,
  country,
  size = "row",
  lang,
  className,
}: CatIdentityProps) {
  const flag = flagEmoji(country);

  return (
    <div className={cn("min-w-0", className)}>
      <h3
        className={cn(
          "flex items-baseline gap-2 font-display leading-tight text-ink",
          size === "hero" && "text-3xl sm:text-5xl",
          size === "row" && "text-lg sm:text-xl",
          size === "dense" && "text-sm",
        )}
      >
        <span className="truncate">{name}</span>
        {flag ? (
          <span
            className={cn(
              size === "hero" && "text-2xl",
              size === "row" && "text-sm",
              size === "dense" && "text-[0.7rem]",
            )}
            title={countryName(country, lang) ?? undefined}
          >
            {flag}
            <span className="sr-only">{countryName(country, lang)}</span>
          </span>
        ) : null}
      </h3>
      {ownerHandle ? (
        <p
          className={cn(
            "truncate text-ink-soft",
            size === "hero" && "mt-1 text-base",
            size === "row" && "text-sm",
            size === "dense" && "text-xs",
          )}
        >
          @{ownerHandle}
        </p>
      ) : null}
    </div>
  );
}
